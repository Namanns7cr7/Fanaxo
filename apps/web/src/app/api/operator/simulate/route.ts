/**
 * POST /api/operator/simulate — trigger the connected Gate C surge demo,
 * producing an AI recommendation awaiting the operator's approval.
 */

import { ApiErrorCode } from '@fanaxo/contracts';
import { PolicyAction } from '@fanaxo/auth';

import { resolveActorOfKind } from '@/server/auth/session';
import { forbiddenUnlessAuthorized, jsonError, jsonOk } from '@/server/http';
import { triggerCongestionSurge } from '@/server/services/congestion-engine';

export async function POST(): Promise<Response> {
  const actor = await resolveActorOfKind('operator');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Operator sign-in required.');
  }

  const denied = forbiddenUnlessAuthorized(actor, PolicyAction.SIMULATION_CONTROL, {
    venueId: actor.venueId,
  });
  if (denied !== null) {
    return denied;
  }

  const result = await triggerCongestionSurge(actor.venueId);
  if (result === null) {
    return jsonError(ApiErrorCode.SERVICE_UNAVAILABLE, 'Demo topology unavailable.');
  }
  return jsonOk(result);
}
