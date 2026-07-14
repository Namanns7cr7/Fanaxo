/**
 * Deterministic demo dataset (spec 05 §10).
 *
 * One fictional venue (4 gates, 8 concourse zones, 12 sections, 3 lifts,
 * 2 ramps, facilities, 2 transit exits), one fictional match, one demo fan
 * ticket at Gate C / Section 214, and eight volunteers. All identifiers are
 * stable, all timestamps are relative to a configurable demo clock, and the
 * whole dataset can be reset to this known state at any time.
 *
 * Demo credentials are intentionally public and valid only in demo mode.
 */

import { hashTicketToken } from '@fanaxo/auth';
import { scryptSync, randomBytes } from 'node:crypto';

import type { DatabaseHandle } from './client.js';
import { demoId } from './demo-ids.js';
import {
  congestionScenarios,
  crowdSnapshots,
  gateStates,
  matches,
  routeEdges,
  routeNodes,
  tickets,
  users,
  venues,
  volunteerProfiles,
  zones,
} from './schema.js';

// ---------------------------------------------------------------------------
// Public demo constants (safe to document; demo mode only)
// ---------------------------------------------------------------------------

export const DEMO = {
  venueId: demoId('venue'),
  matchId: demoId('match'),
  /** Demo fan ticket: Gate C, Section 214. */
  fanTicketToken: 'FNX-DEMO-GATEC-214-0001',
  fanTicketId: demoId('ticket-gatec-214'),
  /** Secondary ticket for negative tests (different gate/section). */
  altTicketToken: 'FNX-DEMO-GATEA-211-0002',
  altTicketId: demoId('ticket-gatea-211'),
  operatorEmail: 'operator@fanaxo.demo',
  operatorPassword: 'FanaxoOps!2026',
  operatorUserId: demoId('user-operator'),
  /** All demo staff use this OTP/MFA code. */
  staffOtp: '123456',
  volunteerBadges: [
    'V-1001',
    'V-1002',
    'V-1003',
    'V-1004',
    'V-1005',
    'V-1006',
    'V-1007',
    'V-1008',
  ] as const,
  gates: {
    a: demoId('zone-gate-a'),
    b: demoId('zone-gate-b'),
    c: demoId('zone-gate-c'),
    d: demoId('zone-gate-d'),
  },
  nodes: {
    transitWest: demoId('node-transit-west'),
    transitEast: demoId('node-transit-east'),
    plazaWest: demoId('node-plaza-west'),
    plazaEast: demoId('node-plaza-east'),
    gateA: demoId('node-gate-a'),
    gateB: demoId('node-gate-b'),
    gateC: demoId('node-gate-c'),
    gateD: demoId('node-gate-d'),
    section214: demoId('node-section-214'),
  },
  congestionThreshold: 0.8,
} as const;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(':');
  if (scheme !== 'scrypt' || salt === undefined || expected === undefined) {
    return false;
  }
  const derived = scryptSync(password, salt, 64).toString('hex');
  return derived === expected;
}

export interface SeedOptions {
  /** Demo clock anchor; all relative timestamps derive from it. */
  readonly now?: Date;
}

interface NodeSeed {
  key: string;
  name: string;
  type:
    | 'entrance'
    | 'gate'
    | 'corridor'
    | 'section'
    | 'lift'
    | 'ramp'
    | 'stairs'
    | 'restroom'
    | 'food'
    | 'medical'
    | 'exit'
    | 'transit';
  x: number;
  y: number;
  floor?: number;
  zoneKey?: string;
}

interface EdgeSeed {
  from: string;
  to: string;
  distance: number;
  seconds: number;
  capacity?: number;
  hasStairs?: boolean;
  hasLift?: boolean;
  hasRamp?: boolean;
  sensory?: 'low' | 'medium' | 'high';
  /** One-way when false; defaults to bidirectional. */
  twoWay?: boolean;
}

/** Wipe all rows (child tables first) and reseed the deterministic dataset. */
export function resetDemoData(handle: DatabaseHandle, options: SeedOptions = {}): void {
  const wipeOrder = [
    'audit_events',
    'assistance_requests',
    'notifications',
    'recommendations',
    'tasks',
    'incidents',
    'congestion_scenarios',
    'crowd_snapshots',
    'gate_states',
    'route_edges',
    'route_nodes',
    'fan_sessions',
    'staff_sessions',
    'tickets',
    'volunteer_profiles',
    'matches',
    'zones',
    'users',
    'venues',
  ];
  const run = handle.sqlite.transaction(() => {
    for (const table of wipeOrder) {
      handle.sqlite.prepare(`DELETE FROM ${table}`).run();
    }
  });
  run();
  seedDemoData(handle, options);
}

/** Insert the full demo dataset. Assumes empty tables. */
export function seedDemoData(handle: DatabaseHandle, options: SeedOptions = {}): void {
  const now = options.now ?? new Date();
  const iso = (offsetMinutes: number): string =>
    new Date(now.getTime() + offsetMinutes * 60_000).toISOString();
  const createdAt = iso(-24 * 60);
  const timestamps = { createdAt, updatedAt: createdAt };

  const seedAll = handle.sqlite.transaction(() => {
    seedVenueAndZones(handle, timestamps);
    seedMatchAndTickets(handle, iso, timestamps);
    seedPeople(handle, iso, timestamps);
    seedRouteGraph(handle);
    seedLiveState(handle, iso);
  });
  seedAll();
}

function seedVenueAndZones(
  handle: DatabaseHandle,
  timestamps: { createdAt: string; updatedAt: string },
): void {
  handle.db
    .insert(venues)
    .values({
      id: DEMO.venueId,
      name: 'Solara International Stadium',
      timezone: 'America/New_York',
      status: 'active',
      capacity: 60_000,
      ...timestamps,
    })
    .run();

  const zoneRows: (typeof zones.$inferInsert)[] = [];
  const addZone = (
    key: string,
    name: string,
    type: (typeof zones.$inferInsert)['type'],
    capacity: number,
    x: number,
    y: number,
  ): void => {
    zoneRows.push({
      id: demoId(`zone-${key}`),
      venueId: DEMO.venueId,
      name,
      type,
      capacity,
      x,
      y,
      ...timestamps,
    });
  };

  addZone('gate-a', 'Gate A', 'gate', 1200, 120, 180);
  addZone('gate-b', 'Gate B', 'gate', 1200, 120, 520);
  addZone('gate-c', 'Gate C', 'gate', 1400, 880, 350);
  addZone('gate-d', 'Gate D', 'gate', 1200, 640, 90);

  addZone('concourse-nw', 'Northwest Concourse', 'concourse', 3000, 300, 200);
  addZone('concourse-sw', 'Southwest Concourse', 'concourse', 3000, 300, 500);
  addZone('concourse-ne', 'Northeast Concourse', 'concourse', 3000, 700, 200);
  addZone('concourse-se', 'Southeast Concourse', 'concourse', 3000, 700, 500);
  addZone('concourse-n', 'North Concourse', 'concourse', 2500, 500, 140);
  addZone('concourse-s', 'South Concourse', 'concourse', 2500, 500, 560);
  addZone('concourse-e', 'East Concourse', 'concourse', 2500, 800, 350);
  addZone('concourse-w', 'West Concourse', 'concourse', 2500, 200, 350);

  for (let section = 210; section <= 221; section++) {
    const angle = ((section - 210) / 12) * Math.PI * 2;
    addZone(
      `section-${section}`,
      `Section ${section}`,
      'section',
      1500,
      500 + Math.round(Math.cos(angle) * 180),
      350 + Math.round(Math.sin(angle) * 140),
    );
  }

  addZone('facility-restroom-e', 'East Restrooms', 'facility', 200, 760, 300);
  addZone('facility-restroom-w', 'West Restrooms', 'facility', 200, 240, 300);
  addZone('facility-food-n', 'North Food Court', 'facility', 400, 500, 180);
  addZone('facility-food-s', 'South Food Court', 'facility', 400, 500, 520);
  addZone('facility-merch', 'Merchandise Hall', 'facility', 300, 400, 250);
  addZone('medical-center', 'Medical Center', 'medical', 100, 600, 450);
  addZone('transit-west', 'West Transit Hub', 'transport', 2000, 40, 350);
  addZone('transit-east', 'East Transit Hub', 'transport', 2000, 960, 350);

  handle.db.insert(zones).values(zoneRows).run();
}

function seedMatchAndTickets(
  handle: DatabaseHandle,
  iso: (offsetMinutes: number) => string,
  timestamps: { createdAt: string; updatedAt: string },
): void {
  handle.db
    .insert(matches)
    .values({
      id: DEMO.matchId,
      venueId: DEMO.venueId,
      homeLabel: 'Atlantia',
      awayLabel: 'Meridia',
      startsAt: iso(120),
      status: 'gates_open',
      ...timestamps,
    })
    .run();

  handle.db
    .insert(tickets)
    .values([
      {
        id: DEMO.fanTicketId,
        matchId: DEMO.matchId,
        gateId: DEMO.gates.c,
        section: '214',
        row: '12',
        seat: '7',
        tokenHash: hashTicketToken(DEMO.fanTicketToken),
        status: 'valid',
        ...timestamps,
      },
      {
        id: DEMO.altTicketId,
        matchId: DEMO.matchId,
        gateId: DEMO.gates.a,
        section: '211',
        row: '4',
        seat: '15',
        tokenHash: hashTicketToken(DEMO.altTicketToken),
        status: 'valid',
        ...timestamps,
      },
      {
        id: demoId('ticket-expired'),
        matchId: DEMO.matchId,
        gateId: DEMO.gates.b,
        section: '218',
        row: '2',
        seat: '3',
        tokenHash: hashTicketToken('FNX-DEMO-EXPIRED-0003'),
        status: 'expired',
        ...timestamps,
      },
    ])
    .run();
}

function seedPeople(
  handle: DatabaseHandle,
  iso: (offsetMinutes: number) => string,
  timestamps: { createdAt: string; updatedAt: string },
): void {
  handle.db
    .insert(users)
    .values({
      id: DEMO.operatorUserId,
      role: 'operator',
      displayName: 'Val Reyes',
      locale: 'en',
      status: 'active',
      email: DEMO.operatorEmail,
      passwordHash: hashPassword(DEMO.operatorPassword),
      ...timestamps,
    })
    .run();

  const volunteerSpecs: ReadonlyArray<{
    badge: (typeof DEMO.volunteerBadges)[number];
    name: string;
    roleType: (typeof volunteerProfiles.$inferInsert)['roleType'];
    zoneKey: string;
  }> = [
    { badge: 'V-1001', name: 'Amara Osei', roleType: 'crowd_management', zoneKey: 'gate-c' },
    { badge: 'V-1002', name: 'Diego Fuentes', roleType: 'crowd_management', zoneKey: 'gate-d' },
    { badge: 'V-1003', name: 'Lina Haddad', roleType: 'fan_support', zoneKey: 'concourse-e' },
    { badge: 'V-1004', name: 'Tomas Novak', roleType: 'fan_support', zoneKey: 'concourse-w' },
    { badge: 'V-1005', name: 'Yuki Tanaka', roleType: 'accessibility', zoneKey: 'concourse-e' },
    { badge: 'V-1006', name: 'Sara Lindqvist', roleType: 'transport', zoneKey: 'transit-east' },
    {
      badge: 'V-1007',
      name: 'Kofi Mensah',
      roleType: 'medical_liaison',
      zoneKey: 'medical-center',
    },
    { badge: 'V-1008', name: 'Elena Petrova', roleType: 'fan_support', zoneKey: 'concourse-n' },
  ];

  for (const spec of volunteerSpecs) {
    const userId = demoId(`user-volunteer-${spec.badge}`);
    handle.db
      .insert(users)
      .values({
        id: userId,
        role: 'volunteer',
        displayName: spec.name,
        locale: 'en',
        status: 'active',
        badgeId: spec.badge,
        ...timestamps,
      })
      .run();
    handle.db
      .insert(volunteerProfiles)
      .values({
        userId,
        venueId: DEMO.venueId,
        roleType: spec.roleType,
        zoneId: demoId(`zone-${spec.zoneKey}`),
        shiftStart: iso(-60),
        shiftEnd: iso(7 * 60),
        status: 'available',
        displayName: spec.name,
      })
      .run();
  }
}

/**
 * Route graph: two transit hubs feed two plazas; plazas reach the four
 * gates; gates open onto a concourse ring; the east concourse reaches the
 * upper sections via stairs, one lift, and one ramp (step-free coverage).
 */
function seedRouteGraph(handle: DatabaseHandle): void {
  const nodeSeeds: NodeSeed[] = [
    {
      key: 'transit-west',
      name: 'West Transit Hub',
      type: 'transit',
      x: 40,
      y: 350,
      zoneKey: 'transit-west',
    },
    {
      key: 'transit-east',
      name: 'East Transit Hub',
      type: 'transit',
      x: 960,
      y: 350,
      zoneKey: 'transit-east',
    },
    { key: 'plaza-west', name: 'West Plaza', type: 'entrance', x: 110, y: 350 },
    { key: 'plaza-east', name: 'East Plaza', type: 'entrance', x: 890, y: 350 },
    { key: 'gate-a', name: 'Gate A', type: 'gate', x: 120, y: 180, zoneKey: 'gate-a' },
    { key: 'gate-b', name: 'Gate B', type: 'gate', x: 120, y: 520, zoneKey: 'gate-b' },
    { key: 'gate-c', name: 'Gate C', type: 'gate', x: 880, y: 350, zoneKey: 'gate-c' },
    { key: 'gate-d', name: 'Gate D', type: 'gate', x: 640, y: 90, zoneKey: 'gate-d' },
    {
      key: 'conc-w',
      name: 'West Concourse',
      type: 'corridor',
      x: 200,
      y: 350,
      zoneKey: 'concourse-w',
    },
    {
      key: 'conc-n',
      name: 'North Concourse',
      type: 'corridor',
      x: 500,
      y: 140,
      zoneKey: 'concourse-n',
    },
    {
      key: 'conc-e',
      name: 'East Concourse',
      type: 'corridor',
      x: 800,
      y: 350,
      zoneKey: 'concourse-e',
    },
    {
      key: 'conc-s',
      name: 'South Concourse',
      type: 'corridor',
      x: 500,
      y: 560,
      zoneKey: 'concourse-s',
    },
    { key: 'stairs-e', name: 'East Stairs', type: 'stairs', x: 770, y: 300 },
    { key: 'lift-e', name: 'East Lift', type: 'lift', x: 780, y: 400 },
    { key: 'ramp-e', name: 'East Ramp', type: 'ramp', x: 760, y: 380 },
    { key: 'lift-w', name: 'West Lift', type: 'lift', x: 230, y: 400 },
    { key: 'lift-n', name: 'North Lift', type: 'lift', x: 520, y: 170 },
    { key: 'stairs-w', name: 'West Stairs', type: 'stairs', x: 240, y: 300 },
    { key: 'ramp-w', name: 'West Ramp', type: 'ramp', x: 250, y: 380 },
    {
      key: 'restroom-e',
      name: 'East Restrooms',
      type: 'restroom',
      x: 760,
      y: 300,
      zoneKey: 'facility-restroom-e',
    },
    {
      key: 'food-n',
      name: 'North Food Court',
      type: 'food',
      x: 500,
      y: 180,
      zoneKey: 'facility-food-n',
    },
    {
      key: 'medical',
      name: 'Medical Center',
      type: 'medical',
      x: 600,
      y: 450,
      zoneKey: 'medical-center',
    },
  ];
  for (let section = 210; section <= 221; section++) {
    const angle = ((section - 210) / 12) * Math.PI * 2;
    nodeSeeds.push({
      key: `section-${section}`,
      name: `Section ${section}`,
      type: 'section',
      x: 500 + Math.round(Math.cos(angle) * 180),
      y: 350 + Math.round(Math.sin(angle) * 140),
      floor: 1,
      zoneKey: `section-${section}`,
    });
  }

  handle.db
    .insert(routeNodes)
    .values(
      nodeSeeds.map((node) => ({
        id: demoId(`node-${node.key}`),
        venueId: DEMO.venueId,
        name: node.name,
        type: node.type,
        x: node.x,
        y: node.y,
        floor: node.floor ?? 0,
        zoneId: node.zoneKey === undefined ? null : demoId(`zone-${node.zoneKey}`),
      })),
    )
    .run();

  const edgeSeeds: EdgeSeed[] = [
    // Transit to plazas
    { from: 'transit-west', to: 'plaza-west', distance: 150, seconds: 120, sensory: 'high' },
    { from: 'transit-east', to: 'plaza-east', distance: 150, seconds: 120, sensory: 'high' },
    // Plazas to gates
    { from: 'plaza-west', to: 'gate-a', distance: 180, seconds: 150 },
    { from: 'plaza-west', to: 'gate-b', distance: 180, seconds: 150 },
    { from: 'plaza-east', to: 'gate-c', distance: 60, seconds: 50 },
    { from: 'plaza-east', to: 'gate-d', distance: 320, seconds: 260, sensory: 'low' },
    { from: 'plaza-west', to: 'plaza-east', distance: 900, seconds: 700, sensory: 'low' },
    // Gates into the concourse ring
    { from: 'gate-a', to: 'conc-w', distance: 90, seconds: 80 },
    { from: 'gate-b', to: 'conc-w', distance: 90, seconds: 80 },
    { from: 'gate-c', to: 'conc-e', distance: 80, seconds: 70 },
    { from: 'gate-d', to: 'conc-n', distance: 110, seconds: 95 },
    // Concourse ring
    { from: 'conc-w', to: 'conc-n', distance: 350, seconds: 280 },
    { from: 'conc-n', to: 'conc-e', distance: 350, seconds: 280 },
    { from: 'conc-e', to: 'conc-s', distance: 350, seconds: 280 },
    { from: 'conc-s', to: 'conc-w', distance: 350, seconds: 280 },
    // Vertical circulation east (serves sections 213-218)
    { from: 'conc-e', to: 'stairs-e', distance: 30, seconds: 40, hasStairs: true },
    { from: 'conc-e', to: 'lift-e', distance: 40, seconds: 90, hasLift: true, sensory: 'low' },
    { from: 'conc-e', to: 'ramp-e', distance: 60, seconds: 110, hasRamp: true, sensory: 'low' },
    // Vertical circulation west (serves sections 210-212, 219-221)
    { from: 'conc-w', to: 'stairs-w', distance: 30, seconds: 40, hasStairs: true },
    { from: 'conc-w', to: 'lift-w', distance: 40, seconds: 90, hasLift: true, sensory: 'low' },
    { from: 'conc-w', to: 'ramp-w', distance: 60, seconds: 110, hasRamp: true, sensory: 'low' },
    { from: 'conc-n', to: 'lift-n', distance: 40, seconds: 90, hasLift: true, sensory: 'low' },
    // Facilities
    { from: 'conc-e', to: 'restroom-e', distance: 40, seconds: 35 },
    { from: 'conc-n', to: 'food-n', distance: 40, seconds: 35 },
    { from: 'conc-s', to: 'medical', distance: 100, seconds: 85 },
  ];

  const eastSections = [213, 214, 215, 216, 217, 218];
  const westSections = [210, 211, 212, 219, 220, 221];
  for (const section of eastSections) {
    edgeSeeds.push(
      { from: 'stairs-e', to: `section-${section}`, distance: 60, seconds: 55, hasStairs: true },
      { from: 'lift-e', to: `section-${section}`, distance: 80, seconds: 70 },
      { from: 'ramp-e', to: `section-${section}`, distance: 100, seconds: 90 },
    );
  }
  for (const section of westSections) {
    edgeSeeds.push(
      { from: 'stairs-w', to: `section-${section}`, distance: 60, seconds: 55, hasStairs: true },
      { from: 'lift-w', to: `section-${section}`, distance: 80, seconds: 70 },
      { from: 'ramp-w', to: `section-${section}`, distance: 100, seconds: 90 },
    );
  }
  // North lift reaches the sections nearest Gate D (step-free alternative).
  for (const section of [215, 216, 217]) {
    edgeSeeds.push({ from: 'lift-n', to: `section-${section}`, distance: 90, seconds: 80 });
  }

  handle.db.insert(routeEdges).values(expandEdgeSeeds(edgeSeeds)).run();
}

/** Expand seed definitions into directed edge rows (bidirectional by default). */
function expandEdgeSeeds(edgeSeeds: readonly EdgeSeed[]): (typeof routeEdges.$inferInsert)[] {
  const rows: (typeof routeEdges.$inferInsert)[] = [];
  let edgeIndex = 0;
  for (const edge of edgeSeeds) {
    const directions =
      edge.twoWay === false
        ? [[edge.from, edge.to] as const]
        : [[edge.from, edge.to] as const, [edge.to, edge.from] as const];
    for (const [from, to] of directions) {
      edgeIndex += 1;
      rows.push({
        id: demoId(`edge-${edgeIndex}-${from}-${to}`),
        venueId: DEMO.venueId,
        fromNodeId: demoId(`node-${from}`),
        toNodeId: demoId(`node-${to}`),
        distance: edge.distance,
        expectedTimeSeconds: edge.seconds,
        capacity: edge.capacity ?? 400,
        liveDensity: 0,
        status: 'open',
        hasStairs: edge.hasStairs ?? false,
        hasLift: edge.hasLift ?? false,
        hasRamp: edge.hasRamp ?? false,
        isIndoor: true,
        sensoryIntensity: edge.sensory ?? 'medium',
        slope: 0,
      });
    }
  }
  return rows;
}

function seedLiveState(handle: DatabaseHandle, iso: (offsetMinutes: number) => string): void {
  const gateSeeds = [
    {
      key: 'gate-a',
      name: 'Gate A',
      queueMinutes: 4,
      throughput: 42,
      currentCount: 300,
      capacity: 1200,
    },
    {
      key: 'gate-b',
      name: 'Gate B',
      queueMinutes: 3,
      throughput: 40,
      currentCount: 260,
      capacity: 1200,
    },
    {
      key: 'gate-c',
      name: 'Gate C',
      queueMinutes: 8,
      throughput: 55,
      currentCount: 640,
      capacity: 1400,
    },
    {
      key: 'gate-d',
      name: 'Gate D',
      queueMinutes: 2,
      throughput: 38,
      currentCount: 180,
      capacity: 1200,
    },
  ];
  handle.db
    .insert(gateStates)
    .values(
      gateSeeds.map((gate) => ({
        gateId: demoId(`zone-${gate.key}`),
        venueId: DEMO.venueId,
        name: gate.name,
        status: 'open' as const,
        queueMinutes: gate.queueMinutes,
        throughput: gate.throughput,
        currentCount: gate.currentCount,
        capacity: gate.capacity,
        version: 1,
        updatedAt: iso(0),
      })),
    )
    .run();

  // Ten minutes of history per gate; Gate C trends upward for the demo arc.
  const snapshotRows: (typeof crowdSnapshots.$inferInsert)[] = [];
  for (const gate of gateSeeds) {
    for (let minute = 10; minute >= 0; minute -= 2) {
      const baseDensity = gate.currentCount / gate.capacity;
      const rising = gate.key === 'gate-c' ? (10 - minute) * 0.012 : 0;
      const density = Math.min(1, baseDensity + rising);
      snapshotRows.push({
        id: demoId(`snapshot-${gate.key}-${minute}`),
        venueId: DEMO.venueId,
        zoneId: demoId(`zone-${gate.key}`),
        capturedAt: iso(-minute),
        count: Math.round(density * gate.capacity),
        density,
        flowRate: gate.key === 'gate-c' ? 6 : 2,
        confidence: 0.92,
        trend: gate.key === 'gate-c' ? 'rising' : 'stable',
      });
    }
  }
  handle.db.insert(crowdSnapshots).values(snapshotRows).run();

  handle.db
    .insert(congestionScenarios)
    .values({
      gateId: DEMO.gates.c,
      venueId: DEMO.venueId,
      state: 'normal',
      arrivalRate: 1,
      density: 640 / 1400,
      threshold: DEMO.congestionThreshold,
      assignedVolunteerIds: [],
      version: 1,
      updatedAt: iso(0),
    })
    .run();
}
