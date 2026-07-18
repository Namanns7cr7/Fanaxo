/**
 * Fan assistance requests (spec 05 §4: POST /api/fan/assistance).
 *
 * A fan asks for help; the request is idempotent on clientRequestId, audited,
 * and surfaced to operators. Zone defaults to the fan's ticket gate when the
 * client doesn't supply one.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  UserRole,
  type Actor,
  type AssistanceRequestCreate,
  type FanActor,
} from '@fanaxo/contracts';
import { assistanceRequests, fanSessions, tickets, zones } from '@fanaxo/db';
import {
  domainError,
  DomainErrorCode,
  err,
  ok,
  type DomainError,
  type Result,
} from '@fanaxo/domain';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';

export interface AssistanceOutcome {
  readonly id: string;
  readonly deduplicated: boolean;
}

export function createAssistanceRequest(
  actor: FanActor,
  input: AssistanceRequestCreate,
): Result<AssistanceOutcome, DomainError> {
  const handle = getDb();
  const existing = handle.db
    .select()
    .from(assistanceRequests)
    .where(eq(assistanceRequests.clientRequestId, input.clientRequestId))
    .get();
  if (existing !== undefined) {
    return ok({ id: existing.id, deduplicated: true });
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const correlationId = randomUUID();

  const insertTxn = handle.sqlite.transaction(() => {
    handle.db
      .insert(assistanceRequests)
      .values({
        id,
        venueId: actor.venueId,
        fanSessionId: actor.sessionId,
        zoneId: input.zoneId,
        category: input.category,
        description: input.description,
        status: 'open',
        clientRequestId: input.clientRequestId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    writeAudit({
      actor,
      action: 'assistance.requested',
      resource: 'assistance_request',
      resourceId: id,
      venueId: actor.venueId,
      correlationId,
      after: { category: input.category },
    });
  });
  insertTxn();

  return ok({ id, deduplicated: false });
}

/** The fan's ticket gate, used as the default assistance location. */
export function fanDefaultZoneId(actor: FanActor): string | null {
  const db = getDb().db;
  const session = db.select().from(fanSessions).where(eq(fanSessions.id, actor.sessionId)).get();
  const ticketId = session?.ticketId ?? null;
  if (ticketId === null) {
    return null;
  }
  const ticket = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
  return ticket?.gateId ?? null;
}

export interface OpenAssistanceRequest {
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly createdAt: string;
}

/** Open fan help requests for the venue, with zone names resolved for display. */
export function listOpenAssistanceRequests(venueId: string, limit = 20): OpenAssistanceRequest[] {
  const db = getDb().db;
  const zoneNames = new Map(
    db
      .select()
      .from(zones)
      .where(eq(zones.venueId, venueId))
      .all()
      .map((zone) => [zone.id, zone.name]),
  );
  return db
    .select()
    .from(assistanceRequests)
    .where(eq(assistanceRequests.venueId, venueId))
    .all()
    .filter((request) => request.status === 'open')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((request) => ({
      id: request.id,
      category: request.category,
      description: request.description,
      zoneId: request.zoneId,
      zoneName: zoneNames.get(request.zoneId) ?? 'the venue',
      createdAt: request.createdAt,
    }));
}

/**
 * A staff member (volunteer or operator) takes ownership of a fan help
 * request. Moves it out of the open queue and audits who responded.
 */
export function acknowledgeAssistanceRequest(
  actor: Actor,
  requestId: string,
  action: 'acknowledge' | 'resolve',
): Result<{ status: string }, DomainError> {
  const handle = getDb();
  const row = handle.db
    .select()
    .from(assistanceRequests)
    .where(eq(assistanceRequests.id, requestId))
    .get();
  if (row === undefined || row.venueId !== actor.venueId) {
    return err(domainError(DomainErrorCode.NOT_FOUND, 'Help request not found'));
  }

  const nextStatus = action === 'resolve' ? 'resolved' : 'acknowledged';
  const now = new Date().toISOString();
  const correlationId = randomUUID();

  const txn = handle.sqlite.transaction(() => {
    handle.db
      .update(assistanceRequests)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(assistanceRequests.id, requestId))
      .run();
    writeAudit({
      actor,
      action: `assistance.${action}`,
      resource: 'assistance_request',
      resourceId: requestId,
      venueId: actor.venueId,
      correlationId,
      before: { status: row.status },
      after: { status: nextStatus },
    });
  });
  txn();

  return ok({ status: nextStatus });
}

/** Actor kind guard used by the API route. */
export const FAN_KIND = UserRole.FAN;
