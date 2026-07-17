/**
 * POST /api/auth/volunteer — badge + OTP login (demo credentials).
 */

import { ApiErrorCode, VolunteerLoginRequestSchema } from '@fanaxo/contracts';
import { RATE_LIMIT_RULES } from '@fanaxo/auth';

import { clientKey, jsonError, jsonOk, parseBody } from '@/server/http';
import { getRateLimiter } from '@/server/rate-limit';
import { loginVolunteer } from '@/server/services/staff-auth';

export async function POST(request: Request): Promise<Response> {
  const limit = getRateLimiter().check(
    `staff-login:${clientKey(request)}`,
    RATE_LIMIT_RULES.staffLogin,
  );
  if (!limit.allowed) {
    return jsonError(
      ApiErrorCode.RATE_LIMITED,
      `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    );
  }

  const body = await parseBody(request, VolunteerLoginRequestSchema);
  if (!body.ok) {
    return body.response;
  }

  const outcome = await loginVolunteer(body.data);
  if (!outcome.ok) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Badge ID or code is incorrect.');
  }
  return jsonOk({ displayName: outcome.displayName });
}
