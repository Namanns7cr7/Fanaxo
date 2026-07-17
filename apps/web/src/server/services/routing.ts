/**
 * Route service — the trusted path calculator (spec 05 §7).
 *
 * Loads the persisted graph, overlays live gate state (status, queues) and
 * zone densities, and delegates to the pure domain Dijkstra. The AI layer
 * may explain results from here but can never fabricate a route.
 */

import 'server-only';

import type { CalculatedRoute, RouteNode } from '@fanaxo/contracts';
import { crowdSnapshots, gateStates, routeEdges, routeNodes, tickets, zones } from '@fanaxo/db';
import {
  buildRouteGraph,
  calculateRoute,
  type DomainError,
  type LiveEdgeState,
  type Result,
  type RouteGraph,
  type RoutePreferences,
} from '@fanaxo/domain';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '../db';

export interface LiveGraph {
  readonly graph: RouteGraph;
  readonly live: LiveEdgeState;
  readonly nodesByZoneId: ReadonlyMap<string, RouteNode>;
}

/**
 * Build the live graph fresh per request. The venue graph is tiny (<100
 * edges) so a rebuild is microseconds; freshness beats cache invalidation.
 */
export function loadLiveGraph(venueId: string): LiveGraph {
  const db = getDb().db;
  const nodes = db.select().from(routeNodes).where(eq(routeNodes.venueId, venueId)).all();
  const edges = db.select().from(routeEdges).where(eq(routeEdges.venueId, venueId)).all();
  const gates = db.select().from(gateStates).where(eq(gateStates.venueId, venueId)).all();

  const gateByZoneId = new Map(gates.map((gate) => [gate.gateId, gate]));
  const nodesByZoneId = new Map<string, RouteNode>();
  const queueMinutesByNodeId = new Map<string, number>();
  const densityByZoneId = new Map<string, number>();

  const latestSnapshots = db
    .select()
    .from(crowdSnapshots)
    .where(eq(crowdSnapshots.venueId, venueId))
    .orderBy(desc(crowdSnapshots.capturedAt))
    .limit(200)
    .all();
  for (const snapshot of latestSnapshots) {
    if (!densityByZoneId.has(snapshot.zoneId)) {
      densityByZoneId.set(snapshot.zoneId, snapshot.density);
    }
  }

  const typedNodes: RouteNode[] = nodes.map((node) => ({
    id: node.id,
    venueId: node.venueId,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    floor: node.floor,
    ...(node.zoneId === null ? {} : { zoneId: node.zoneId }),
  }));

  for (const node of typedNodes) {
    if (node.zoneId !== undefined) {
      nodesByZoneId.set(node.zoneId, node);
      const gate = gateByZoneId.get(node.zoneId);
      if (gate !== undefined) {
        queueMinutesByNodeId.set(node.id, gate.queueMinutes);
      }
    }
  }

  // Overlay: edges touching a gate node inherit the gate's operational
  // status; every edge picks up the live density of its target zone.
  const gateStatusByNodeId = new Map<string, 'open' | 'restricted' | 'closed'>();
  for (const node of typedNodes) {
    const gate = node.zoneId === undefined ? undefined : gateByZoneId.get(node.zoneId);
    if (gate !== undefined) {
      gateStatusByNodeId.set(
        node.id,
        gate.status === 'reopening' ? 'restricted' : gate.status,
      );
    }
  }
  const nodeZone = new Map(typedNodes.map((node) => [node.id, node.zoneId]));

  const overlaidEdges = edges.map((edge) => {
    const gateStatus =
      gateStatusByNodeId.get(edge.toNodeId) ?? gateStatusByNodeId.get(edge.fromNodeId);
    const targetZone = nodeZone.get(edge.toNodeId);
    const liveDensity =
      targetZone !== undefined && targetZone !== null
        ? (densityByZoneId.get(targetZone) ?? edge.liveDensity)
        : edge.liveDensity;
    return {
      ...edge,
      status: gateStatus ?? edge.status,
      liveDensity,
    };
  });

  return {
    graph: buildRouteGraph(typedNodes, overlaidEdges),
    live: { queueMinutesByNodeId },
    nodesByZoneId,
  };
}

export interface RouteWithSteps {
  readonly route: CalculatedRoute;
  readonly steps: ReadonlyArray<{
    nodeId: string;
    nodeName: string;
    instruction: string;
    distanceMeters: number;
  }>;
}

/** Verb templates for step instructions; anything unlisted reads as "Continue to". */
const INSTRUCTION_VERBS: Partial<Record<RouteNode['type'], string>> = {
  gate: 'Pass through',
  lift: 'Take the lift at',
  ramp: 'Use the ramp at',
  stairs: 'Take the stairs at',
  transit: 'Start from',
};

function instructionFor(node: RouteNode, isLast: boolean): string {
  if (isLast) {
    return `Arrive at ${node.name}`;
  }
  const verb = INSTRUCTION_VERBS[node.type] ?? 'Continue to';
  return `${verb} ${node.name}`;
}

/** Compute a route and human-readable steps between two nodes. */
export function computeRoute(
  venueId: string,
  fromNodeId: string,
  toNodeId: string,
  preferences: RoutePreferences,
): Result<RouteWithSteps, DomainError> {
  const { graph, live } = loadLiveGraph(venueId);
  const result = calculateRoute(graph, fromNodeId, toNodeId, preferences, live);
  if (!result.ok) {
    return result;
  }
  const { route, edges } = result.value;
  const steps = route.nodeIds.map((nodeId, index) => {
    const node = graph.nodesById.get(nodeId);
    const inboundEdge = index === 0 ? undefined : edges[index - 1];
    return {
      nodeId,
      nodeName: node?.name ?? 'Unknown',
      instruction:
        node === undefined
          ? 'Continue'
          : instructionFor(node, index === route.nodeIds.length - 1),
      distanceMeters: inboundEdge?.distance ?? 0,
    };
  });
  return { ok: true, value: { route, steps } };
}

/**
 * The demo fan journey: from the East Transit Hub to the ticket's section,
 * entering through whichever gate the live cost model prefers.
 */
export function computeTicketRoute(
  venueId: string,
  ticketId: string,
  preferences: RoutePreferences,
): Result<RouteWithSteps, DomainError> {
  const db = getDb().db;
  const ticket = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
  if (ticket === undefined) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'Ticket not found' },
    };
  }
  const sectionZone = db
    .select()
    .from(zones)
    .where(eq(zones.name, `Section ${ticket.section}`))
    .get();
  const { nodesByZoneId } = loadLiveGraph(venueId);
  const originNode = findTransitOrigin(venueId);
  const destinationNode =
    sectionZone === undefined ? undefined : nodesByZoneId.get(sectionZone.id);
  if (originNode === undefined || destinationNode === undefined) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'Route endpoints unavailable' },
    };
  }
  return computeRoute(venueId, originNode.id, destinationNode.id, preferences);
}

function findTransitOrigin(venueId: string): RouteNode | undefined {
  const db = getDb().db;
  const node = db
    .select()
    .from(routeNodes)
    .where(eq(routeNodes.venueId, venueId))
    .all()
    .find((candidate) => candidate.type === 'transit' && candidate.name.includes('East'));
  if (node === undefined) {
    return undefined;
  }
  return {
    id: node.id,
    venueId: node.venueId,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    floor: node.floor,
    ...(node.zoneId === null ? {} : { zoneId: node.zoneId }),
  };
}
