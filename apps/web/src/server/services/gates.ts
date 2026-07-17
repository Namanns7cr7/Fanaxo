/**
 * Gate state service — the highest-impact operator action (spec 07 §4).
 *
 * Requires explicit confirmation and a reason, enforces the gate state
 * machine and optimistic versioning, audits the change, publishes the gate
 * event, and pushes fresh routes to every active ticketed fan session.
 */

import 'server-only';

import {
  EventType,
  GateStateSchema,
  type Actor,
  type GateState,
  type GateStatePatch,
} from '@fanaxo/contracts';
import { fanSessions, gateStates } from '@fanaxo/db';
import {
  checkExpectedVersion,
  domainError,
  DomainErrorCode,
  err,
  gateTransitions,
  ok,
  transition,
  type DomainError,
  type Result,
} from '@fanaxo/domain';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import { newCorrelationId } from '../http';
import { publishEvent } from '../realtime/bus';
import { pushFanRouteUpdates } from './fan-context';

type GateRow = typeof gateStates.$inferSelect;

export function rowToGateState(row: GateRow): GateState {
  return GateStateSchema.parse({
    gateId: row.gateId,
    venueId: row.venueId,
    name: row.name,
    status: row.status,
    queueMinutes: row.queueMinutes,
    throughput: row.throughput,
    currentCount: row.currentCount,
    capacity: row.capacity,
    version: row.version,
    updatedAt: row.updatedAt,
  });
}

export function listGates(venueId: string): GateState[] {
  return getDb()
    .db.select()
    .from(gateStates)
    .where(eq(gateStates.venueId, venueId))
    .all()
    .map(rowToGateState);
}

/** Operator changes a gate's operational status. */
export function patchGateState(
  actor: Actor,
  gateId: string,
  input: GateStatePatch,
  correlationId: string = newCorrelationId(),
): Result<GateState, DomainError> {
  const handle = getDb();
  const row = handle.db.select().from(gateStates).where(eq(gateStates.gateId, gateId)).get();
  if (row === undefined || row.venueId !== actor.venueId) {
    return err(domainError(DomainErrorCode.NOT_FOUND, 'Gate not found'));
  }

  const versionCheck = checkExpectedVersion(row.version, input.expectedVersion);
  if (!versionCheck.ok) {
    return versionCheck;
  }
  const transitionResult = transition(gateTransitions, row.status, input.status);
  if (!transitionResult.ok) {
    return transitionResult;
  }

  const now = new Date().toISOString();
  const nextVersion = versionCheck.value;

  const updateTxn = handle.sqlite.transaction(() => {
    handle.db
      .update(gateStates)
      .set({ status: input.status, version: nextVersion, updatedAt: now })
      .where(eq(gateStates.gateId, gateId))
      .run();
    writeAudit({
      actor,
      action: 'gate.state.changed',
      resource: 'gate',
      resourceId: gateId,
      venueId: actor.venueId,
      correlationId,
      reason: input.reason,
      before: { status: row.status, version: row.version },
      after: { status: input.status, version: nextVersion },
    });
  });
  updateTxn();

  const updated = rowToGateState({
    ...row,
    status: input.status,
    version: nextVersion,
    updatedAt: now,
  });
  publishEvent({
    eventType: EventType.GATE_STATE_CHANGED,
    venueId: actor.venueId,
    aggregateId: gateId,
    aggregateVersion: nextVersion,
    correlationId,
    payload: updated,
  });

  // A gate change invalidates affected routes: recompute for live sessions.
  pushFanRouteUpdates(actor.venueId, correlationId, 'gate_state_changed');

  return ok(updated);
}

/** Internal: live-state updates from the demo engine (queue, counts). */
export function updateGateTelemetry(
  venueId: string,
  gateId: string,
  telemetry: { queueMinutes: number; throughput: number; currentCount: number },
  correlationId: string,
): GateState | null {
  const handle = getDb();
  const row = handle.db.select().from(gateStates).where(eq(gateStates.gateId, gateId)).get();
  if (row === undefined || row.venueId !== venueId) {
    return null;
  }
  const now = new Date().toISOString();
  const nextVersion = row.version + 1;
  handle.db
    .update(gateStates)
    .set({ ...telemetry, version: nextVersion, updatedAt: now })
    .where(eq(gateStates.gateId, gateId))
    .run();
  const updated = rowToGateState({ ...row, ...telemetry, version: nextVersion, updatedAt: now });
  publishEvent({
    eventType: EventType.GATE_STATE_CHANGED,
    venueId,
    aggregateId: gateId,
    aggregateVersion: nextVersion,
    correlationId,
    payload: updated,
  });
  return updated;
}

/** Sessions with tickets currently active in a venue (for route pushes). */
export function activeTicketedSessions(venueId: string): Array<{ id: string; ticketId: string }> {
  const nowIso = new Date().toISOString();
  return getDb()
    .db.select()
    .from(fanSessions)
    .where(eq(fanSessions.venueId, venueId))
    .all()
    .filter((session) => session.ticketId !== null && session.expiresAt > nowIso)
    .map((session) => ({ id: session.id, ticketId: session.ticketId as string }));
}
