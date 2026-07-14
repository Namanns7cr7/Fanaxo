import { beforeEach, describe, expect, it } from 'vitest';

import { hashTicketToken } from '@fanaxo/auth';
import { eq } from 'drizzle-orm';

import { createDatabase, migrateDatabase, type DatabaseHandle } from './client.js';
import { demoId } from './demo-ids.js';
import {
  crowdSnapshots,
  gateStates,
  incidents,
  routeEdges,
  routeNodes,
  tickets,
  users,
  volunteerProfiles,
  zones,
} from './schema.js';
import { DEMO, resetDemoData, seedDemoData, verifyPassword } from './seed.js';

const DEMO_CLOCK = new Date('2026-07-15T17:00:00.000Z');

describe('demo seed', () => {
  let handle: DatabaseHandle;

  beforeEach(() => {
    handle = createDatabase(':memory:');
    migrateDatabase(handle);
    seedDemoData(handle, { now: DEMO_CLOCK });
  });

  it('creates the specified venue topology', () => {
    const allZones = handle.db.select().from(zones).all();
    const byType = (type: string): number => allZones.filter((zone) => zone.type === type).length;
    expect(byType('gate')).toBe(4);
    expect(byType('concourse')).toBe(8);
    expect(byType('section')).toBe(12);
    expect(byType('transport')).toBe(2);
  });

  it('seeds the demo ticket at Gate C / Section 214 with a hashed token', () => {
    const ticket = handle.db.select().from(tickets).where(eq(tickets.id, DEMO.fanTicketId)).get();
    expect(ticket).toBeDefined();
    expect(ticket?.gateId).toBe(DEMO.gates.c);
    expect(ticket?.section).toBe('214');
    expect(ticket?.tokenHash).toBe(hashTicketToken(DEMO.fanTicketToken));
    expect(ticket?.tokenHash).not.toContain('FNX-DEMO');
  });

  it('seeds eight volunteers and one operator with a verifiable password', () => {
    expect(handle.db.select().from(volunteerProfiles).all()).toHaveLength(8);
    const operator = handle.db
      .select()
      .from(users)
      .where(eq(users.email, DEMO.operatorEmail))
      .get();
    expect(operator).toBeDefined();
    expect(operator?.passwordHash).toBeTruthy();
    if (typeof operator?.passwordHash === 'string') {
      expect(verifyPassword(DEMO.operatorPassword, operator.passwordHash)).toBe(true);
      expect(verifyPassword('wrong-password', operator.passwordHash)).toBe(false);
    }
  });

  it('seeds a connected route graph with step-free coverage', () => {
    const nodes = handle.db.select().from(routeNodes).all();
    const edges = handle.db.select().from(routeEdges).all();
    expect(nodes.length).toBeGreaterThan(25);
    expect(edges.length).toBeGreaterThan(60);
    // Every edge references known nodes (foreign keys enforce it, belt & braces).
    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.fromNodeId)).toBe(true);
      expect(nodeIds.has(edge.toNodeId)).toBe(true);
    }
    // Section 214 must be reachable without stairs (lift and ramp edges exist).
    const to214 = edges.filter((edge) => edge.toNodeId === DEMO.nodes.section214);
    expect(to214.some((edge) => !edge.hasStairs)).toBe(true);
  });

  it('seeds live gate state with Gate C trending up', () => {
    const gates = handle.db.select().from(gateStates).all();
    expect(gates).toHaveLength(4);
    const snapshots = handle.db
      .select()
      .from(crowdSnapshots)
      .where(eq(crowdSnapshots.zoneId, DEMO.gates.c))
      .all();
    expect(snapshots.length).toBeGreaterThanOrEqual(5);
    const ordered = [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (first && last) {
      expect(last.density).toBeGreaterThan(first.density);
    }
  });

  it('is deterministic: identical IDs across independent databases', () => {
    const second = createDatabase(':memory:');
    migrateDatabase(second);
    seedDemoData(second, { now: DEMO_CLOCK });
    const zonesA = handle.db.select({ id: zones.id }).from(zones).all();
    const zonesB = second.db.select({ id: zones.id }).from(zones).all();
    expect(zonesA).toEqual(zonesB);
    second.sqlite.close();
  });

  it('resetDemoData restores the known state after mutations', () => {
    handle.db
      .insert(incidents)
      .values({
        id: demoId('test-incident'),
        venueId: DEMO.venueId,
        zoneId: DEMO.gates.c,
        category: 'facility',
        severity: 'low',
        status: 'reported',
        reporterId: DEMO.operatorUserId,
        reporterRole: 'operator',
        summary: 'Test incident for reset',
        clientRequestId: demoId('test-incident-request'),
        attachmentIds: [],
        correlationId: demoId('test-correlation'),
        createdAt: DEMO_CLOCK.toISOString(),
        updatedAt: DEMO_CLOCK.toISOString(),
      })
      .run();
    expect(handle.db.select().from(incidents).all()).toHaveLength(1);

    resetDemoData(handle, { now: DEMO_CLOCK });
    expect(handle.db.select().from(incidents).all()).toHaveLength(0);
    expect(handle.db.select().from(volunteerProfiles).all()).toHaveLength(8);
  });

  it('enforces incident idempotency via the unique clientRequestId index', () => {
    const insertIncident = (): void => {
      handle.db
        .insert(incidents)
        .values({
          id: demoId(`dup-incident-${Math.random()}`),
          venueId: DEMO.venueId,
          zoneId: DEMO.gates.c,
          category: 'facility',
          severity: 'low',
          status: 'reported',
          reporterId: DEMO.operatorUserId,
          reporterRole: 'operator',
          summary: 'Duplicate submission test',
          clientRequestId: demoId('same-request'),
          attachmentIds: [],
          correlationId: demoId('same-correlation'),
          createdAt: DEMO_CLOCK.toISOString(),
          updatedAt: DEMO_CLOCK.toISOString(),
        })
        .run();
    };
    insertIncident();
    expect(insertIncident).toThrowError(/UNIQUE/);
  });
});
