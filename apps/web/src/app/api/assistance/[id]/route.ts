/**
 * PATCH /api/assistance/:id — a volunteer or operator takes ownership of a
 * fan help request (acknowledge) or closes it (resolve). Staff + venue scoped.
 */

import { ApiErrorCode, UserRole } from '@fanaxo/contracts';
import { z } from 'zod';

import { resolveActor } from '@/server/auth/session';
import { domainErrorResponse, jsonError, jsonOk, parseBody } from '@/server/http';
import { acknowledgeAssistanceRequest } from '@/server/services/assistance';

const BodySchema = z.object({
  action: z.enum(['acknowledge', 'resolve']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await resolveActor();
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Sign in to respond to help requests.');
  }
  // Only staff (volunteer or operator) may respond to fan help requests.
  if (actor.kind === UserRole.FAN) {
    return jsonError(ApiErrorCode.FORBIDDEN, 'Only staff can respond to help requests.');
  }

  const body = await parseBody(request, BodySchema);
  if (!body.ok) {
    return body.response;
  }

  const { id } = await params;
  const result = acknowledgeAssistanceRequest(actor, id, body.data.action);
  if (!result.ok) {
    return domainErrorResponse(result.error);
  }
  return jsonOk({ status: result.value.status });
}
