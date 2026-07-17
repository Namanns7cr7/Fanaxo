/**
 * POST /api/fan/tickets/verify — verify a demo ticket and open a fan session.
 * Public endpoint: rate limited, generic errors, no token enumeration.
 */

import { ApiErrorCode, TicketVerifyRequestSchema } from '@fanaxo/contracts';
import { RATE_LIMIT_RULES } from '@fanaxo/auth';

import { clientKey, jsonError, jsonOk, parseBody } from '@/server/http';
import { getRateLimiter } from '@/server/rate-limit';
import { verifyTicketAndCreateSession } from '@/server/services/tickets';

export async function POST(request: Request): Promise<Response> {
  const limit = getRateLimiter().check(
    `ticket-verify:${clientKey(request)}`,
    RATE_LIMIT_RULES.ticketVerify,
  );
  if (!limit.allowed) {
    return jsonError(
      ApiErrorCode.RATE_LIMITED,
      `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    );
  }

  const body = await parseBody(request, TicketVerifyRequestSchema);
  if (!body.ok) {
    return body.response;
  }

  const outcome = await verifyTicketAndCreateSession(body.data.token);
  if (!outcome.ok) {
    const message =
      outcome.reason === 'expired'
        ? 'This ticket has expired.'
        : outcome.reason === 'used'
          ? 'This ticket is not currently valid for entry.'
          : 'We could not verify this ticket. Check the code and try again.';
    return jsonError(ApiErrorCode.TICKET_INVALID, message);
  }

  return jsonOk({ sessionId: outcome.sessionId, ticket: outcome.ticket });
}
