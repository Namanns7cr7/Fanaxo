/**
 * POST /api/fan/assistance — request help from a volunteer.
 * Zone defaults to the fan's ticket gate when not supplied by the client.
 */

import { ApiErrorCode, AssistanceRequestCreateSchema } from '@fanaxo/contracts';
import { RATE_LIMIT_RULES } from '@fanaxo/auth';
import { z } from 'zod';

import { resolveActorOfKind } from '@/server/auth/session';
import { clientKey, domainErrorResponse, jsonError, jsonOk, parseBody } from '@/server/http';
import { getRateLimiter } from '@/server/rate-limit';
import { createAssistanceRequest, fanDefaultZoneId } from '@/server/services/assistance';

// The client may omit zoneId; the server fills it from the ticket gate.
const RequestSchema = AssistanceRequestCreateSchema.extend({
  zoneId: z.string().uuid().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const actor = await resolveActorOfKind('fan');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Verify a ticket to request assistance.');
  }

  const limit = getRateLimiter().check(
    `assistance:${clientKey(request)}`,
    RATE_LIMIT_RULES.incidentCreate,
  );
  if (!limit.allowed) {
    return jsonError(
      ApiErrorCode.RATE_LIMITED,
      `Please wait ${limit.retryAfterSeconds} seconds before requesting again.`,
    );
  }

  const body = await parseBody(request, RequestSchema);
  if (!body.ok) {
    return body.response;
  }

  const zoneId = body.data.zoneId ?? fanDefaultZoneId(actor);
  if (zoneId === null) {
    return jsonError(ApiErrorCode.VALIDATION_FAILED, 'No location available for this request.');
  }

  const result = createAssistanceRequest(actor, { ...body.data, zoneId });
  if (!result.ok) {
    return domainErrorResponse(result.error);
  }
  return jsonOk({ id: result.value.id, deduplicated: result.value.deduplicated });
}
