/**
 * PATCH /api/gates/:id — operator changes a gate's status (spec 07 §4:
 * requires confirmation + reason). Recomputes affected fan routes.
 */

import { ApiErrorCode, GateStatePatchSchema } from '@fanaxo/contracts';
import { PolicyAction } from '@fanaxo/auth';

import { resolveActorOfKind } from '@/server/auth/session';
import {
  domainErrorResponse,
  forbiddenUnlessAuthorized,
  jsonError,
  jsonOk,
  parseBody,
} from '@/server/http';
import { patchGateState } from '@/server/services/gates';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await resolveActorOfKind('operator');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Operator sign-in required.');
  }

  const denied = forbiddenUnlessAuthorized(actor, PolicyAction.GATE_STATE_CHANGE, {
    venueId: actor.venueId,
  });
  if (denied !== null) {
    return denied;
  }

  const { id } = await params;
  const body = await parseBody(request, GateStatePatchSchema);
  if (!body.ok) {
    return body.response;
  }

  const result = patchGateState(actor, id, body.data);
  if (!result.ok) {
    return domainErrorResponse(result.error);
  }
  return jsonOk({ gate: result.value });
}
