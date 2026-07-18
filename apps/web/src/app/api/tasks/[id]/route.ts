/**
 * PATCH /api/tasks/:id — accept, start, complete, escalate, or cancel a task.
 * Authorized for the assigned volunteer or any venue operator.
 */

import { ApiErrorCode, TaskUpdateSchema } from '@fanaxo/contracts';
import { PolicyAction } from '@fanaxo/auth';

import { resolveActor } from '@/server/auth/session';
import {
  domainErrorResponse,
  forbiddenUnlessAuthorized,
  jsonError,
  jsonOk,
  parseBody,
} from '@/server/http';
import { getTaskRow, updateTask } from '@/server/services/tasks';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await resolveActor();
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Sign in to update tasks.');
  }

  const { id } = await params;
  const task = getTaskRow(id);
  if (task === undefined || task.venueId !== actor.venueId) {
    return jsonError(ApiErrorCode.NOT_FOUND, 'Task not found.');
  }

  const denied = forbiddenUnlessAuthorized(actor, PolicyAction.TASK_UPDATE, {
    venueId: actor.venueId,
    ...(task.assigneeId === null ? {} : { assigneeId: task.assigneeId }),
  });
  if (denied !== null) {
    return denied;
  }

  const body = await parseBody(request, TaskUpdateSchema);
  if (!body.ok) {
    return body.response;
  }

  const result = updateTask(actor, id, body.data);
  if (!result.ok) {
    return domainErrorResponse(result.error);
  }
  return jsonOk({ task: result.value });
}
