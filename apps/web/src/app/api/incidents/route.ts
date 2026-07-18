/**
 * POST /api/incidents — report an incident (fan-limited, volunteer, operator).
 * Server derives severity, reporter, and venue; the report reaches operators.
 */

import { ApiErrorCode, IncidentCreateSchema } from '@fanaxo/contracts';
import { PolicyAction, RATE_LIMIT_RULES } from '@fanaxo/auth';

import { resolveActor } from '@/server/auth/session';
import {
  clientKey,
  domainErrorResponse,
  forbiddenUnlessAuthorized,
  jsonError,
  jsonOk,
  parseBody,
} from '@/server/http';
import { getRateLimiter } from '@/server/rate-limit';
import { createIncident } from '@/server/services/incidents';

export async function POST(request: Request): Promise<Response> {
  const actor = await resolveActor();
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Sign in to report an incident.');
  }

  const denied = forbiddenUnlessAuthorized(actor, PolicyAction.INCIDENT_CREATE, {
    venueId: actor.venueId,
  });
  if (denied !== null) {
    return denied;
  }

  const limit = getRateLimiter().check(
    `incident:${clientKey(request)}`,
    RATE_LIMIT_RULES.incidentCreate,
  );
  if (!limit.allowed) {
    return jsonError(
      ApiErrorCode.RATE_LIMITED,
      `Please wait ${limit.retryAfterSeconds} seconds before reporting again.`,
    );
  }

  const body = await parseBody(request, IncidentCreateSchema);
  if (!body.ok) {
    return body.response;
  }

  const result = createIncident(actor, body.data);
  if (!result.ok) {
    return domainErrorResponse(result.error);
  }
  return jsonOk({
    incident: result.value.incident,
    deduplicated: result.value.deduplicated,
  });
}
