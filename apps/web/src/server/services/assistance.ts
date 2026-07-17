/**
 * Fan assistance requests (spec 05 §4: POST /api/fan/assistance).
 *
 * A fan asks for help; the request is idempotent on clientRequestId, audited,
 * and surfaced to operators. Zone defaults to the fan's ticket gate when the
 * client doesn't supply one.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import { UserRole, type AssistanceRequestCreate, type FanActor } from '@fanaxo/contracts';
import { assistanceRequests, fanSessions, tickets } from '@fanaxo/db';
import { ok, type DomainError, type Result } from '@fanaxo/domain';
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

export function listOpenAssistanceRequests(
  venueId: string,
  limit = 20,
): Array<{
  id: string;
  category: string;
  description: string;
  zoneId: string;
  createdAt: string;
}> {
  return getDb()
    .db.select()
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
      createdAt: request.createdAt,
    }));
}

/** Actor kind guard used by the API route. */
export const FAN_KIND = UserRole.FAN;
