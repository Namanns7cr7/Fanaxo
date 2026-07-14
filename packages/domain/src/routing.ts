/**
 * Venue route graph and crowd-aware pathfinding (spec 05 §7).
 *
 * Routes come exclusively from this trusted service — the language model may
 * explain a calculated route but never invent one. Hard accessibility
 * constraints exclude edges entirely; soft preferences only change cost.
 *
 *   edgeCost = baseTravelTime
 *            + congestionPenalty(density, capacity)
 *            + queuePenalty(queueMinutes)
 *            + preferencePenalty(userPreferences)
 *            + operationalPenalty(edgeStatus)
 *   Closed or inaccessible edge -> unreachable
 */

import type { CalculatedRoute, RouteEdge, RouteNode } from '@fanaxo/contracts';

import { DomainErrorCode, domainError, type DomainError } from './errors.js';
import { err, ok, type Result } from './result.js';

export interface RoutePreferences {
  /** Hard constraint: never include an edge with stairs. */
  readonly stepFree: boolean;
  /** Soft preference: penalize dense edges more strongly. */
  readonly avoidCrowds: boolean;
  /** Soft preference: penalize high sensory-intensity edges. */
  readonly lowSensory: boolean;
}

export interface LiveEdgeState {
  /** Queue minutes at the destination node, e.g. a gate queue. */
  readonly queueMinutesByNodeId: ReadonlyMap<string, number>;
}

export interface RouteGraph {
  readonly nodesById: ReadonlyMap<string, RouteNode>;
  /** Outgoing edges per node id, precomputed once per graph load. */
  readonly adjacency: ReadonlyMap<string, readonly RouteEdge[]>;
}

/** Build an adjacency structure once; lookups during search are O(1). */
export function buildRouteGraph(
  nodes: readonly RouteNode[],
  edges: readonly RouteEdge[],
): RouteGraph {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, RouteEdge[]>();
  for (const edge of edges) {
    const existing = adjacency.get(edge.fromNodeId);
    if (existing === undefined) {
      adjacency.set(edge.fromNodeId, [edge]);
    } else {
      existing.push(edge);
    }
  }
  return { nodesById, adjacency };
}

// ---------------------------------------------------------------------------
// Cost model — each term is a pure function so tests can pin the formula.
// ---------------------------------------------------------------------------

/** Density above this fraction of capacity starts costing extra time. */
const CONGESTION_ONSET = 0.5;
/** Multiplier scale: a fully saturated edge doubles-plus its travel time. */
const CONGESTION_WEIGHT = 2.5;
const AVOID_CROWDS_EXTRA_WEIGHT = 2.0;
const QUEUE_SECONDS_PER_MINUTE = 60;
const RESTRICTED_PENALTY_SECONDS = 120;
const SENSORY_PENALTY_SECONDS: Record<RouteEdge['sensoryIntensity'], number> = {
  low: 0,
  medium: 20,
  high: 60,
};

export function congestionPenalty(edge: RouteEdge, preferences: RoutePreferences): number {
  const overload = Math.max(0, edge.liveDensity - CONGESTION_ONSET);
  const weight = preferences.avoidCrowds
    ? CONGESTION_WEIGHT + AVOID_CROWDS_EXTRA_WEIGHT
    : CONGESTION_WEIGHT;
  return edge.expectedTimeSeconds * overload * weight;
}

export function queuePenalty(queueMinutes: number): number {
  return Math.max(0, queueMinutes) * QUEUE_SECONDS_PER_MINUTE;
}

export function preferencePenalty(edge: RouteEdge, preferences: RoutePreferences): number {
  return preferences.lowSensory ? (SENSORY_PENALTY_SECONDS[edge.sensoryIntensity] ?? 0) : 0;
}

export function operationalPenalty(edge: RouteEdge): number {
  return edge.status === 'restricted' ? RESTRICTED_PENALTY_SECONDS : 0;
}

/** True when a hard constraint forbids this edge entirely. */
export function isEdgeExcluded(edge: RouteEdge, preferences: RoutePreferences): boolean {
  if (edge.status === 'closed') {
    return true;
  }
  if (preferences.stepFree && edge.hasStairs) {
    return true;
  }
  return false;
}

export function edgeCost(
  edge: RouteEdge,
  preferences: RoutePreferences,
  live: LiveEdgeState,
): number {
  const queueMinutes = live.queueMinutesByNodeId.get(edge.toNodeId) ?? 0;
  return (
    edge.expectedTimeSeconds +
    congestionPenalty(edge, preferences) +
    queuePenalty(queueMinutes) +
    preferencePenalty(edge, preferences) +
    operationalPenalty(edge)
  );
}

// ---------------------------------------------------------------------------
// Dijkstra shortest path
// ---------------------------------------------------------------------------

interface SearchEntry {
  nodeId: string;
  cost: number;
}

/**
 * Binary min-heap keyed on cost. The venue graph is small (tens of nodes) but
 * the heap keeps route recalculation flat when live updates arrive in bursts.
 */
class MinHeap {
  private readonly items: SearchEntry[] = [];

  get size(): number {
    return this.items.length;
  }

  push(entry: SearchEntry): void {
    this.items.push(entry);
    this.siftUp(this.items.length - 1);
  }

  pop(): SearchEntry | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (top === undefined || last === undefined) {
      return top;
    }
    if (this.items.length > 0) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private costAt(index: number): number {
    return this.items[index]?.cost ?? Number.POSITIVE_INFINITY;
  }

  private swap(a: number, b: number): void {
    const itemA = this.items[a];
    const itemB = this.items[b];
    if (itemA !== undefined && itemB !== undefined) {
      this.items[a] = itemB;
      this.items[b] = itemA;
    }
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.costAt(parent) <= this.costAt(index)) {
        return;
      }
      this.swap(parent, index);
      index = parent;
    }
  }

  private siftDown(index: number): void {
    for (;;) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (this.costAt(left) < this.costAt(smallest)) {
        smallest = left;
      }
      if (this.costAt(right) < this.costAt(smallest)) {
        smallest = right;
      }
      if (smallest === index) {
        return;
      }
      this.swap(index, smallest);
      index = smallest;
    }
  }
}

export interface RouteComputation {
  readonly route: CalculatedRoute;
  readonly edges: readonly RouteEdge[];
}

interface DijkstraOutcome {
  readonly bestCost: ReadonlyMap<string, number>;
  readonly previousEdge: ReadonlyMap<string, RouteEdge>;
  readonly settled: ReadonlySet<string>;
}

function runDijkstra(
  graph: RouteGraph,
  fromNodeId: string,
  toNodeId: string,
  preferences: RoutePreferences,
  live: LiveEdgeState,
): DijkstraOutcome {
  const bestCost = new Map<string, number>([[fromNodeId, 0]]);
  const previousEdge = new Map<string, RouteEdge>();
  const settled = new Set<string>();
  const heap = new MinHeap();
  heap.push({ nodeId: fromNodeId, cost: 0 });

  while (heap.size > 0) {
    const current = heap.pop();
    if (current === undefined || settled.has(current.nodeId)) {
      continue;
    }
    settled.add(current.nodeId);
    if (current.nodeId === toNodeId) {
      break;
    }
    relaxNeighbors(graph, current, preferences, live, bestCost, previousEdge, settled, heap);
  }

  return { bestCost, previousEdge, settled };
}

function relaxNeighbors(
  graph: RouteGraph,
  current: SearchEntry,
  preferences: RoutePreferences,
  live: LiveEdgeState,
  bestCost: Map<string, number>,
  previousEdge: Map<string, RouteEdge>,
  settled: ReadonlySet<string>,
  heap: MinHeap,
): void {
  const outgoing = graph.adjacency.get(current.nodeId) ?? [];
  for (const edge of outgoing) {
    if (isEdgeExcluded(edge, preferences) || settled.has(edge.toNodeId)) {
      continue;
    }
    const candidate = current.cost + edgeCost(edge, preferences, live);
    const known = bestCost.get(edge.toNodeId);
    if (known === undefined || candidate < known) {
      bestCost.set(edge.toNodeId, candidate);
      previousEdge.set(edge.toNodeId, edge);
      heap.push({ nodeId: edge.toNodeId, cost: candidate });
    }
  }
}

function reconstructPath(
  previousEdge: ReadonlyMap<string, RouteEdge>,
  fromNodeId: string,
  toNodeId: string,
): RouteEdge[] | null {
  const pathEdges: RouteEdge[] = [];
  let cursor = toNodeId;
  while (cursor !== fromNodeId) {
    const edge = previousEdge.get(cursor);
    if (edge === undefined) {
      return null;
    }
    pathEdges.unshift(edge);
    cursor = edge.fromNodeId;
  }
  return pathEdges;
}

function summarizeRoute(
  pathEdges: readonly RouteEdge[],
  fromNodeId: string,
  totalTimeSeconds: number,
  preferences: RoutePreferences,
  live: LiveEdgeState,
  calculatedAt: string,
): CalculatedRoute {
  const peakDensity = pathEdges.reduce((max, edge) => Math.max(max, edge.liveDensity), 0);
  return {
    nodeIds: [fromNodeId, ...pathEdges.map((edge) => edge.toNodeId)],
    totalDistance: pathEdges.reduce((sum, edge) => sum + edge.distance, 0),
    totalTimeSeconds,
    estimatedQueueMinutes: pathEdges.reduce(
      (sum, edge) => sum + (live.queueMinutesByNodeId.get(edge.toNodeId) ?? 0),
      0,
    ),
    accessibilityCompliant: !preferences.stepFree || pathEdges.every((edge) => !edge.hasStairs),
    congestionLevel: densityToCongestionLevel(peakDensity),
    alternateAvailable: false,
    calculatedAt,
  };
}

/**
 * Compute the lowest-cost path between two nodes under the live cost model.
 * Returns NO_ROUTE_AVAILABLE when constraints leave no viable path — the
 * caller must offer staff assistance instead of inventing a route.
 */
export function calculateRoute(
  graph: RouteGraph,
  fromNodeId: string,
  toNodeId: string,
  preferences: RoutePreferences,
  live: LiveEdgeState,
  now: () => Date = () => new Date(),
): Result<RouteComputation, DomainError> {
  if (!graph.nodesById.has(fromNodeId) || !graph.nodesById.has(toNodeId)) {
    return err(domainError(DomainErrorCode.NOT_FOUND, 'Unknown route endpoint'));
  }

  const { bestCost, previousEdge, settled } = runDijkstra(
    graph,
    fromNodeId,
    toNodeId,
    preferences,
    live,
  );

  const pathEdges = settled.has(toNodeId)
    ? reconstructPath(previousEdge, fromNodeId, toNodeId)
    : null;
  if (pathEdges === null) {
    return err(
      domainError(DomainErrorCode.NO_ROUTE_AVAILABLE, 'No accessible route is available', {
        fromNodeId,
        toNodeId,
        stepFree: preferences.stepFree,
      }),
    );
  }

  const route = summarizeRoute(
    pathEdges,
    fromNodeId,
    bestCost.get(toNodeId) ?? 0,
    preferences,
    live,
    now().toISOString(),
  );

  return ok({ route, edges: pathEdges });
}

export function densityToCongestionLevel(density: number): CalculatedRoute['congestionLevel'] {
  if (density >= 0.85) {
    return 'severe';
  }
  if (density >= 0.65) {
    return 'high';
  }
  if (density >= 0.4) {
    return 'moderate';
  }
  return 'low';
}
