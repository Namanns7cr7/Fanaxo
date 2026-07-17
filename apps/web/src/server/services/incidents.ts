/**
 * Incident workflow service (spec 04 §6.1 decision flow).
 *
 * Creation is idempotent on clientRequestId; status changes run through the
 * domain state machine with optimistic versioning. Every mutation writes an
 * audit row and publishes a versioned realtime event in one transaction.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  EventType,
  IncidentSchema,
  type Actor,
  type Incident,
  type IncidentCreate,
  type IncidentStatusUpdate,
} from '@fanaxo/contracts';
import { incidents } from '@fanaxo/db';
import {
  checkExpectedVersion,
  deriveIncidentSeverity,
  domainError,
  DomainErrorCode,
  err,
  incidentActionTargets,
  incidentTransitions,
  ok,
  transition,
  type DomainError,
  type Result,
} from '@fanaxo/domain';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import { publishEvent } from '../realtime/bus';

type IncidentRow = typeof incidents.$inferSelect;

function rowToIncident(row: IncidentRow): Incident {
  return IncidentSchema.parse({
    id: row.id,
    venueId: row.venueId,
    zoneId: row.zoneId,
    category: row.category,
    severity: row.severity,
    status: row.status,
    reporterId: row.reporterId,
    reporterRole: row.reporterRole,
    summary: row.summary,
    ...(row.description === null ? {} : { description: row.description }),
    ...(row.assigneeId === null ? {} : { assigneeId: row.assigneeId }),
    attachmentIds: row.attachmentIds ?? [],
    version: row.version,
    correlationId: row.correlationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.resolvedAt === null ? {} : { resolvedAt: row.resolvedAt }),
  });
}

function actorId(actor: Actor): string {
  return actor.kind === 'fan' ? actor.sessionId : actor.userId;
}

/** Create an incident; duplicate clientRequestId returns the original row. */
export function createIncident(
  actor: Actor,
  input: IncidentCreate,
): Result<{ incident: Incident; deduplicated: boolean }, DomainError> {
  const handle = getDb();
  const existing = handle.db
    .select()
    .from(incidents)
    .where(eq(incidents.clientRequestId, input.clientRequestId))
    .get();
  if (existing !== undefined) {
    return ok({ incident: rowToIncident(existing), deduplicated: true });
  }

  const now = new Date().toISOString();
  const correlationId = randomUUID();
  const row: typeof incidents.$inferInsert = {
    id: randomUUID(),
    venueId: actor.venueId,
    zoneId: input.zoneId,
    category: input.category,
    severity: deriveIncidentSeverity(input.category, input.severityHint),
    status: 'reported',
    reporterId: actorId(actor),
    reporterRole: actor.kind,
    summary: input.description.slice(0, 200),
    description: input.description,
    attachmentIds: input.attachmentIds,
    clientRequestId: input.clientRequestId,
    version: 1,
    correlationId,
    createdAt: now,
    updatedAt: now,
  };

  const insertTxn = handle.sqlite.transaction(() => {
    handle.db.insert(incidents).values(row).run();
    writeAudit({
      actor,
      action: 'incident.created',
      resource: 'incident',
      resourceId: row.id,
      venueId: actor.venueId,
      correlationId,
      after: row,
    });
  });
  insertTxn();

  const incident = rowToIncident({ ...row, description: row.description ?? null } as IncidentRow);
  publishEvent({
    eventType: EventType.INCIDENT_CREATED,
    venueId: actor.venueId,
    aggregateId: incident.id,
    aggregateVersion: incident.version,
    correlationId,
    payload: incident,
  });
  return ok({ incident, deduplicated: false });
}

/** Advance an incident through its lifecycle with optimistic concurrency. */
export function updateIncidentStatus(
  actor: Actor,
  incidentId: string,
  input: IncidentStatusUpdate,
): Result<Incident, DomainError> {
  const handle = getDb();
  const row = handle.db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
  if (row === undefined || row.venueId !== actor.venueId) {
    return err(domainError(DomainErrorCode.NOT_FOUND, 'Incident not found'));
  }

  const versionCheck = checkExpectedVersion(row.version, input.expectedVersion);
  if (!versionCheck.ok) {
    return versionCheck;
  }
  const targetStatus = incidentActionTargets[input.action];
  const transitionResult = transition(incidentTransitions, row.status, targetStatus);
  if (!transitionResult.ok) {
    return transitionResult;
  }

  const now = new Date().toISOString();
  const nextVersion = versionCheck.value;
  const assigneeId = input.action === 'assign' ? (input.assigneeId ?? null) : row.assigneeId;
  const resolvedAt = input.action === 'resolve' ? now : row.resolvedAt;

  const updateTxn = handle.sqlite.transaction(() => {
    handle.db
      .update(incidents)
      .set({
        status: targetStatus,
        assigneeId,
        version: nextVersion,
        updatedAt: now,
        resolvedAt,
      })
      .where(eq(incidents.id, incidentId))
      .run();
    writeAudit({
      actor,
      action: `incident.${input.action}`,
      resource: 'incident',
      resourceId: incidentId,
      venueId: actor.venueId,
      correlationId: row.correlationId,
      ...(input.note === undefined ? {} : { reason: input.note }),
      before: { status: row.status, version: row.version },
      after: { status: targetStatus, version: nextVersion },
    });
  });
  updateTxn();

  const updated = rowToIncident({
    ...row,
    status: targetStatus,
    assigneeId,
    version: nextVersion,
    updatedAt: now,
    resolvedAt,
  });
  publishEvent({
    eventType: EventType.INCIDENT_STATUS_CHANGED,
    venueId: actor.venueId,
    aggregateId: incidentId,
    aggregateVersion: nextVersion,
    correlationId: row.correlationId,
    payload: updated,
  });
  return ok(updated);
}

export function listVenueIncidents(venueId: string, limit = 50): Incident[] {
  return getDb()
    .db.select()
    .from(incidents)
    .where(eq(incidents.venueId, venueId))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(rowToIncident);
}
