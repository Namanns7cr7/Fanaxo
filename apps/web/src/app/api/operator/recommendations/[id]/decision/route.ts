/**
 * POST /api/operator/recommendations/:id/decision — approve, modify, or
 * reject an AI plan (spec 06 §8: high-impact actions need human approval).
 * On approval the plan's actions execute through guarded services.
 */

import { ApiErrorCode, RecommendationDecisionSchema } from '@fanaxo/contracts';
import { PolicyAction } from '@fanaxo/auth';

import { resolveActorOfKind } from '@/server/auth/session';
import {
  domainErrorResponse,
  forbiddenUnlessAuthorized,
  jsonError,
  jsonOk,
  parseBody,
} from '@/server/http';
import { decideRecommendation, progressRecommendation } from '@/server/services/recommendations';
import { executeRecommendationActions } from '@/server/services/recommendation-execution';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await resolveActorOfKind('operator');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Operator sign-in required.');
  }

  const denied = forbiddenUnlessAuthorized(actor, PolicyAction.RECOMMENDATION_DECIDE, {
    venueId: actor.venueId,
  });
  if (denied !== null) {
    return denied;
  }

  const { id } = await params;
  const body = await parseBody(request, RecommendationDecisionSchema);
  if (!body.ok) {
    return body.response;
  }

  const decision = decideRecommendation(actor, id, body.data);
  if (!decision.ok) {
    return domainErrorResponse(decision.error);
  }

  const { recommendation, actionsToExecute, correlationId } = decision.value;
  let summary = null;
  if (actionsToExecute.length > 0) {
    summary = executeRecommendationActions(actor, actionsToExecute, correlationId);
    // Actions have run; move the recommendation to measured then closed.
    progressRecommendation(actor.venueId, id, 'measured', correlationId);
    progressRecommendation(actor.venueId, id, 'closed', correlationId);
  }

  return jsonOk({ recommendation, execution: summary });
}
