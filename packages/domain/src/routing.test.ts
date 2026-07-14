import { describe, expect, it } from 'vitest';

import type { RouteEdge, RouteNode } from '@fanaxo/contracts';

import {
  buildRouteGraph,
  calculateRoute,
  densityToCongestionLevel,
  edgeCost,
  isEdgeExcluded,
  type LiveEdgeState,
  type RoutePreferences,
} from './routing.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000001';

let nodeCounter = 0;
function makeNode(name: string, type: RouteNode['type']): RouteNode {
  nodeCounter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(nodeCounter).padStart(12, '0')}`,
    venueId: VENUE_ID,
    name,
    type,
    x: nodeCounter,
    y: 0,
    floor: 0,
  };
}

let edgeCounter = 0;
function makeEdge(from: RouteNode, to: RouteNode, overrides: Partial<RouteEdge> = {}): RouteEdge {
  edgeCounter += 1;
  return {
    id: `00000000-0000-4000-9000-${String(edgeCounter).padStart(12, '0')}`,
    venueId: VENUE_ID,
    fromNodeId: from.id,
    toNodeId: to.id,
    distance: 100,
    expectedTimeSeconds: 60,
    capacity: 200,
    liveDensity: 0,
    status: 'open',
    hasStairs: false,
    hasLift: false,
    hasRamp: false,
    isIndoor: true,
    sensoryIntensity: 'medium',
    slope: 0,
    ...overrides,
  };
}

const noPreferences: RoutePreferences = {
  stepFree: false,
  avoidCrowds: false,
  lowSensory: false,
};

const emptyLive: LiveEdgeState = { queueMinutesByNodeId: new Map() };

describe('calculateRoute', () => {
  it('finds the direct shortest path in an uncongested graph', () => {
    const a = makeNode('Entrance', 'entrance');
    const b = makeNode('Corridor', 'corridor');
    const c = makeNode('Section', 'section');
    const graph = buildRouteGraph(
      [a, b, c],
      [makeEdge(a, b), makeEdge(b, c), makeEdge(a, c, { expectedTimeSeconds: 300 })],
    );

    const result = calculateRoute(graph, a.id, c.id, noPreferences, emptyLive);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.route.nodeIds).toEqual([a.id, b.id, c.id]);
      expect(result.value.route.totalTimeSeconds).toBe(120);
    }
  });

  it('never includes a stairs edge for a step-free requirement (spec 08 §4.1)', () => {
    const a = makeNode('Entrance', 'entrance');
    const stairs = makeNode('Stairs', 'stairs');
    const lift = makeNode('Lift', 'lift');
    const c = makeNode('Section', 'section');
    const graph = buildRouteGraph(
      [a, stairs, lift, c],
      [
        makeEdge(a, stairs, { hasStairs: true, expectedTimeSeconds: 30 }),
        makeEdge(stairs, c, { hasStairs: true, expectedTimeSeconds: 30 }),
        makeEdge(a, lift, { hasLift: true, expectedTimeSeconds: 120 }),
        makeEdge(lift, c, { hasLift: true, expectedTimeSeconds: 120 }),
      ],
    );

    const result = calculateRoute(
      graph,
      a.id,
      c.id,
      { ...noPreferences, stepFree: true },
      emptyLive,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.route.nodeIds).toEqual([a.id, lift.id, c.id]);
      expect(result.value.route.accessibilityCompliant).toBe(true);
      expect(result.value.edges.every((edge) => !edge.hasStairs)).toBe(true);
    }
  });

  it('returns no_route_available when constraints exclude every path', () => {
    const a = makeNode('Entrance', 'entrance');
    const stairs = makeNode('Stairs', 'stairs');
    const c = makeNode('Section', 'section');
    const graph = buildRouteGraph(
      [a, stairs, c],
      [makeEdge(a, stairs, { hasStairs: true }), makeEdge(stairs, c, { hasStairs: true })],
    );

    const result = calculateRoute(
      graph,
      a.id,
      c.id,
      { ...noPreferences, stepFree: true },
      emptyLive,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('no_route_available');
    }
  });

  it('reroutes around a closed edge (gate closure changes the route)', () => {
    const a = makeNode('Entrance', 'entrance');
    const gateC = makeNode('Gate C', 'gate');
    const gateD = makeNode('Gate D', 'gate');
    const seat = makeNode('Section 214', 'section');
    const edgeViaC = makeEdge(a, gateC, { expectedTimeSeconds: 60 });
    const graph1 = buildRouteGraph(
      [a, gateC, gateD, seat],
      [
        edgeViaC,
        makeEdge(gateC, seat, { expectedTimeSeconds: 60 }),
        makeEdge(a, gateD, { expectedTimeSeconds: 90 }),
        makeEdge(gateD, seat, { expectedTimeSeconds: 90 }),
      ],
    );
    const before = calculateRoute(graph1, a.id, seat.id, noPreferences, emptyLive);
    expect(before.ok && before.value.route.nodeIds.includes(gateC.id)).toBe(true);

    const graph2 = buildRouteGraph(
      [a, gateC, gateD, seat],
      [
        { ...edgeViaC, status: 'closed' },
        makeEdge(gateC, seat, { expectedTimeSeconds: 60 }),
        makeEdge(a, gateD, { expectedTimeSeconds: 90 }),
        makeEdge(gateD, seat, { expectedTimeSeconds: 90 }),
      ],
    );
    const after = calculateRoute(graph2, a.id, seat.id, noPreferences, emptyLive);
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.value.route.nodeIds).toEqual([a.id, gateD.id, seat.id]);
    }
  });

  it('prefers a longer path when congestion and queue make the short one slower', () => {
    const a = makeNode('Entrance', 'entrance');
    const gateC = makeNode('Gate C', 'gate');
    const gateD = makeNode('Gate D', 'gate');
    const seat = makeNode('Section', 'section');
    const graph = buildRouteGraph(
      [a, gateC, gateD, seat],
      [
        makeEdge(a, gateC, { expectedTimeSeconds: 60, liveDensity: 0.95 }),
        makeEdge(gateC, seat, { expectedTimeSeconds: 60, liveDensity: 0.95 }),
        makeEdge(a, gateD, { expectedTimeSeconds: 120 }),
        makeEdge(gateD, seat, { expectedTimeSeconds: 120 }),
      ],
    );
    const live: LiveEdgeState = {
      queueMinutesByNodeId: new Map([[gateC.id, 12]]),
    };

    const result = calculateRoute(graph, a.id, seat.id, noPreferences, live);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.route.nodeIds).toEqual([a.id, gateD.id, seat.id]);
    }
  });

  it('rejects unknown endpoints', () => {
    const a = makeNode('Entrance', 'entrance');
    const graph = buildRouteGraph([a], []);
    const result = calculateRoute(
      graph,
      a.id,
      '00000000-0000-4000-8000-999999999999',
      noPreferences,
      emptyLive,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
    }
  });
});

describe('edge cost model', () => {
  const from = makeNode('A', 'corridor');
  const to = makeNode('B', 'corridor');

  it('adds queue penalty of 60 seconds per queue minute', () => {
    const edge = makeEdge(from, to, { expectedTimeSeconds: 100 });
    const live: LiveEdgeState = { queueMinutesByNodeId: new Map([[to.id, 5]]) };
    expect(edgeCost(edge, noPreferences, live)).toBe(100 + 300);
  });

  it('charges nothing for density below the congestion onset', () => {
    const edge = makeEdge(from, to, { expectedTimeSeconds: 100, liveDensity: 0.4 });
    expect(edgeCost(edge, noPreferences, emptyLive)).toBe(100);
  });

  it('penalizes restricted edges but keeps them usable', () => {
    const edge = makeEdge(from, to, { expectedTimeSeconds: 100, status: 'restricted' });
    expect(edgeCost(edge, noPreferences, emptyLive)).toBe(220);
    expect(isEdgeExcluded(edge, noPreferences)).toBe(false);
  });

  it('adds sensory penalty only when the low-sensory preference is set', () => {
    const edge = makeEdge(from, to, { expectedTimeSeconds: 100, sensoryIntensity: 'high' });
    expect(edgeCost(edge, noPreferences, emptyLive)).toBe(100);
    expect(edgeCost(edge, { ...noPreferences, lowSensory: true }, emptyLive)).toBe(160);
  });

  it('excludes closed edges outright', () => {
    const edge = makeEdge(from, to, { status: 'closed' });
    expect(isEdgeExcluded(edge, noPreferences)).toBe(true);
  });
});

describe('densityToCongestionLevel', () => {
  it('maps density bands to levels', () => {
    expect(densityToCongestionLevel(0.1)).toBe('low');
    expect(densityToCongestionLevel(0.5)).toBe('moderate');
    expect(densityToCongestionLevel(0.7)).toBe('high');
    expect(densityToCongestionLevel(0.9)).toBe('severe');
  });
});
