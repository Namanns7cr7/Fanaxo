/**
 * Notification service: operator-approved, localized, audience-targeted
 * alerts. One row per language; publication emits a realtime event.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  EventType,
  NotificationSchema,
  type Actor,
  type Notification,
  type NotificationCreate,
} from '@fanaxo/contracts';
import { notifications } from '@fanaxo/db';
import { ok, type DomainError, type Result } from '@fanaxo/domain';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import { newCorrelationId } from '../http';
import { publishEvent } from '../realtime/bus';
import { translateMessage } from '../ai/translation';

type NotificationRow = typeof notifications.$inferSelect;

function rowToNotification(row: NotificationRow): Notification {
  return NotificationSchema.parse({
    id: row.id,
    venueId: row.venueId,
    audience: row.audience,
    ...(row.zoneId === null ? {} : { zoneId: row.zoneId }),
    locale: row.locale,
    channel: row.channel,
    message: row.message,
    status: row.status,
    ...(row.sentAt === null ? {} : { sentAt: row.sentAt }),
    createdAt: row.createdAt,
  });
}

/** Create and send a localized notification set (one row per language). */
export function createNotification(
  actor: Actor,
  input: NotificationCreate,
  correlationId: string = newCorrelationId(),
): Result<Notification[], DomainError> {
  const handle = getDb();
  const existing = handle.db
    .select()
    .from(notifications)
    .where(eq(notifications.clientRequestId, input.clientRequestId))
    .get();
  if (existing !== undefined) {
    return ok([rowToNotification(existing)]);
  }

  const now = new Date().toISOString();
  const created: Notification[] = [];

  const insertTxn = handle.sqlite.transaction(() => {
    for (const language of input.languages) {
      const row: typeof notifications.$inferInsert = {
        id: randomUUID(),
        venueId: actor.venueId,
        audience: input.audience,
        zoneId: input.zoneId ?? null,
        locale: language,
        channel: 'in_app',
        message: translateMessage(input.message, language),
        status: 'sent',
        // Only the first language row carries the idempotency key.
        clientRequestId: created.length === 0 ? input.clientRequestId : null,
        sentAt: now,
        createdAt: now,
      };
      handle.db.insert(notifications).values(row).run();
      created.push(rowToNotification({ ...row } as NotificationRow));
    }
    writeAudit({
      actor,
      action: 'notification.published',
      resource: 'notification',
      resourceId: input.clientRequestId,
      venueId: actor.venueId,
      correlationId,
      after: { audience: input.audience, languages: input.languages },
    });
  });
  insertTxn();

  for (const notification of created) {
    publishEvent({
      eventType: EventType.NOTIFICATION_PUBLISHED,
      venueId: actor.venueId,
      aggregateId: notification.id,
      aggregateVersion: 1,
      correlationId,
      payload: notification,
    });
  }
  return ok(created);
}
