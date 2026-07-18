/**
 * HTTP boundary helpers: one place maps domain errors, policy denials, and
 * validation failures to stable public error codes (spec 04 §9).
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import { ApiErrorCode, type ApiError, type Actor } from '@fanaxo/contracts';
import { authorize, type PolicyAction, type ResourceScope } from '@fanaxo/auth';
import { DomainErrorCode, type DomainError } from '@fanaxo/domain';
import { NextResponse } from 'next/server';
import type { ZodError, ZodTypeAny, z } from 'zod';

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

function errorBody(code: ApiErrorCode, message: string, correlationId?: string): ApiError {
  return correlationId === undefined ? { code, message } : { code, message, correlationId };
}

const HTTP_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.VALIDATION_FAILED]: 400,
  [ApiErrorCode.UNAUTHENTICATED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.TICKET_INVALID]: 422,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.INTERNAL]: 500,
};

export function jsonError(
  code: ApiErrorCode,
  message: string,
  correlationId?: string,
): NextResponse {
  return NextResponse.json(errorBody(code, message, correlationId), {
    status: HTTP_STATUS[code],
  });
}

export function validationError(error: ZodError): NextResponse {
  const body: ApiError = {
    code: ApiErrorCode.VALIDATION_FAILED,
    message: 'The request payload is invalid.',
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
  return NextResponse.json(body, { status: 400 });
}

const DOMAIN_TO_API: Record<DomainErrorCode, ApiErrorCode> = {
  [DomainErrorCode.INVALID_TRANSITION]: ApiErrorCode.CONFLICT,
  [DomainErrorCode.VERSION_CONFLICT]: ApiErrorCode.CONFLICT,
  [DomainErrorCode.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [DomainErrorCode.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [DomainErrorCode.NO_ROUTE_AVAILABLE]: ApiErrorCode.NOT_FOUND,
  [DomainErrorCode.CONSTRAINT_VIOLATION]: ApiErrorCode.VALIDATION_FAILED,
  [DomainErrorCode.STALE_DATA]: ApiErrorCode.SERVICE_UNAVAILABLE,
};

export function domainErrorResponse(error: DomainError, correlationId?: string): NextResponse {
  return jsonError(DOMAIN_TO_API[error.code], error.message, correlationId);
}

/** Parse and validate a JSON body; returns a response on failure. */
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError(ApiErrorCode.VALIDATION_FAILED, 'Request body must be valid JSON.'),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: validationError(parsed.error) };
  }
  return { ok: true, data: parsed.data as z.infer<S> };
}

export function newCorrelationId(): string {
  return randomUUID();
}

/**
 * Server-side authorization gate. Returns a 403 response when denied, or null
 * when allowed — the sole enforcement point for privileged actions (spec 07
 * §4). The denial reason is audit-safe and not leaked to the client.
 */
export function forbiddenUnlessAuthorized(
  actor: Actor,
  action: PolicyAction,
  resource: ResourceScope,
): NextResponse | null {
  const decision = authorize(actor, action, resource);
  if (!decision.allowed) {
    return jsonError(ApiErrorCode.FORBIDDEN, 'You are not allowed to perform this action.');
  }
  return null;
}

/** Client key for rate limiting: forwarded IP or a stable fallback. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first !== undefined && first.length > 0 ? first : 'local';
}
