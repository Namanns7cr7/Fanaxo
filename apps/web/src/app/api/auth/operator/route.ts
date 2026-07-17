/**
 * POST /api/auth/operator — email + password + simulated MFA (demo).
 */

import { ApiErrorCode, OperatorLoginRequestSchema } from '@fanaxo/contracts';
import { RATE_LIMIT_RULES } from '@fanaxo/auth';

import { clientKey, jsonError, jsonOk, parseBody } from '@/server/http';
import { getRateLimiter } from '@/server/rate-limit';
import { loginOperator } from '@/server/services/staff-auth';

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

  const body = await parseBody(request, OperatorLoginRequestSchema);
  if (!body.ok) {
    return body.response;
  }

  const outcome = await loginOperator(body.data);
  if (!outcome.ok) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Sign-in details are incorrect.');
  }
  return jsonOk({ displayName: outcome.displayName });
}
