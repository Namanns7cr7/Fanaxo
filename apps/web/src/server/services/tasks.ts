/**
 * Volunteer task service: assignment (operator) and lifecycle updates
 * (assigned volunteer or operator), with versioning, audit, and events.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  EventType,
  TaskSchema,
  type Actor,
  type Task,
  type TaskAssign,
  type TaskUpdate,
} from '@fanaxo/contracts';
import { tasks } from '@fanaxo/db';
import {
  checkExpectedVersion,
  domainError,
  DomainErrorCode,
  err,
  ok,
  taskActionTargets,
  taskTransitions,
  transition,
  type DomainError,
  type Result,
} from '@fanaxo/domain';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import { publishEvent } from '../realtime/bus';

type TaskRow = typeof tasks.$inferSelect;

function rowToTask(row: TaskRow): Task {
  return TaskSchema.parse({
    id: row.id,
    venueId: row.venueId,
    ...(row.incidentId === null ? {} : { incidentId: row.incidentId }),
    ...(row.assigneeId === null ? {} : { assigneeId: row.assigneeId }),
    priority: row.priority,
    status: row.status,
    title: row.title,
    instructions: row.instructions,
    zoneId: row.zoneId,
    ...(row.dueAt === null ? {} : { dueAt: row.dueAt }),
    version: row.version,
    correlationId: row.correlationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
  });
}

/** Operator assigns a task; created directly in `delivered` state. */
export function assignTask(
  actor: Actor,
  input: TaskAssign,
  correlationId: string = randomUUID(),
): Result<{ task: Task; deduplicated: boolean }, DomainError> {
  const handle = getDb();
  if (input.clientRequestId !== undefined) {
    const existing = handle.db
      .select()
      .from(tasks)
      .where(eq(tasks.clientRequestId, input.clientRequestId))
      .get();
    if (existing !== undefined) {
      return ok({ task: rowToTask(existing), deduplicated: true });
    }
  }

  const now = new Date().toISOString();
  const row: typeof tasks.$inferInsert = {
    id: randomUUID(),
    venueId: actor.venueId,
    incidentId: input.incidentId ?? null,
    assigneeId: input.assigneeId,
    priority: input.priority,
    status: 'delivered',
    title: input.title,
    instructions: input.instructions,
    zoneId: input.zoneId,
    clientRequestId: input.clientRequestId,
    version: 1,
    correlationId,
    createdAt: now,
    updatedAt: now,
  };

  const insertTxn = handle.sqlite.transaction(() => {
    handle.db.insert(tasks).values(row).run();
    writeAudit({
      actor,
      action: 'task.assigned',
      resource: 'task',
      resourceId: row.id,
      venueId: actor.venueId,
      correlationId,
      after: row,
    });
  });
  insertTxn();

  const task = rowToTask({ ...row } as TaskRow);
  publishEvent({
    eventType: EventType.TASK_ASSIGNED,
    venueId: actor.venueId,
    aggregateId: task.id,
    aggregateVersion: task.version,
    correlationId,
    payload: task,
  });
  return ok({ task, deduplicated: false });
}

/** Volunteer/operator advances a task through its lifecycle. */
export function updateTask(
  actor: Actor,
  taskId: string,
  input: TaskUpdate,
): Result<Task, DomainError> {
  const handle = getDb();
  const row = handle.db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (row === undefined || row.venueId !== actor.venueId) {
    return err(domainError(DomainErrorCode.NOT_FOUND, 'Task not found'));
  }

  const versionCheck = checkExpectedVersion(row.version, input.expectedVersion);
  if (!versionCheck.ok) {
    return versionCheck;
  }
  const targetStatus = taskActionTargets[input.action];
  const transitionResult = transition(taskTransitions, row.status, targetStatus);
  if (!transitionResult.ok) {
    return transitionResult;
  }

  const now = new Date().toISOString();
  const nextVersion = versionCheck.value;
  const completedAt = input.action === 'complete' ? now : row.completedAt;

  const updateTxn = handle.sqlite.transaction(() => {
    handle.db
      .update(tasks)
      .set({ status: targetStatus, version: nextVersion, updatedAt: now, completedAt })
      .where(eq(tasks.id, taskId))
      .run();
    writeAudit({
      actor,
      action: `task.${input.action}`,
      resource: 'task',
      resourceId: taskId,
      venueId: actor.venueId,
      correlationId: row.correlationId,
      ...(input.note === undefined ? {} : { reason: input.note }),
      before: { status: row.status, version: row.version },
      after: { status: targetStatus, version: nextVersion },
    });
  });
  updateTxn();

  const updated = rowToTask({
    ...row,
    status: targetStatus,
    version: nextVersion,
    updatedAt: now,
    completedAt,
  });
  publishEvent({
    eventType: EventType.TASK_STATUS_CHANGED,
    venueId: actor.venueId,
    aggregateId: taskId,
    aggregateVersion: nextVersion,
    correlationId: row.correlationId,
    payload: updated,
  });
  return ok(updated);
}

export function getTaskRow(taskId: string): TaskRow | undefined {
  return getDb().db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export function listTasksForAssignee(venueId: string, assigneeId: string): Task[] {
  return getDb()
    .db.select()
    .from(tasks)
    .where(eq(tasks.assigneeId, assigneeId))
    .all()
    .filter((row) => row.venueId === venueId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(rowToTask);
}

export function listVenueTasks(venueId: string, limit = 100): Task[] {
  return getDb()
    .db.select()
    .from(tasks)
    .where(eq(tasks.venueId, venueId))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(rowToTask);
}
