/**
 * POST /api/fan/assistant — grounded venue Q&A for the current fan session.
 */

import { ApiErrorCode } from '@fanaxo/contracts';
import { RATE_LIMIT_RULES } from '@fanaxo/auth';
import { z } from 'zod';

import { resolveActorOfKind } from '@/server/auth/session';
import { clientKey, jsonError, jsonOk, parseBody } from '@/server/http';
import { getRateLimiter } from '@/server/rate-limit';
import { answerFanQuestion } from '@/server/services/fan-assistant';

const QuestionSchema = z.object({
  question: z.string().trim().min(2).max(300),
});

export async function POST(request: Request): Promise<Response> {
  const actor = await resolveActorOfKind('fan');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Verify a ticket to use the assistant.');
  }

  const limit = getRateLimiter().check(`ai:${clientKey(request)}`, RATE_LIMIT_RULES.aiPrompt);
  if (!limit.allowed) {
    return jsonError(
      ApiErrorCode.RATE_LIMITED,
      `Slow down a moment. Try again in ${limit.retryAfterSeconds} seconds.`,
    );
  }

  const body = await parseBody(request, QuestionSchema);
  if (!body.ok) {
    return body.response;
  }

  return jsonOk(answerFanQuestion(actor, body.data.question));
}
