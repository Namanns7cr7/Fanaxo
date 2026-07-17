/**
 * Append-only audit writer (spec 05 §2, spec 07 §12).
 *
 * Every privileged mutation records who did what to which resource, with
 * before/after content hashes and the correlation ID that links the audit
 * row to its realtime events. Never log tokens, secrets, or personal data.
 */

import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import type { Actor } from '@fanaxo/contracts';
import { auditEvents } from '@fanaxo/db';

import { getDb } from './db';

export interface AuditInput {
  readonly actor: Actor;
  readonly action: string;
  readonly resource: string;
  readonly resourceId: string;
  readonly venueId: string;
  readonly correlationId: string;
  readonly reason?: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

function contentHash(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function actorId(actor: Actor): string {
  return actor.kind === 'fan' ? actor.sessionId : actor.userId;
}

export function writeAudit(input: AuditInput): void {
  getDb()
    .db.insert(auditEvents)
    .values({
      id: randomUUID(),
      venueId: input.venueId,
      actor: actorId(input.actor),
      actorRole: input.actor.kind,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      beforeHash: contentHash(input.before),
      afterHash: contentHash(input.after),
      reason: input.reason ?? null,
      correlationId: input.correlationId,
      createdAt: new Date().toISOString(),
    })
    .run();
}
