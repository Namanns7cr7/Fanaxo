/**
 * Token and session primitives (spec 05 §9, spec 07 §3).
 *
 * Ticket tokens are opaque; only a one-way hash is stored. Comparisons are
 * constant-time to block token enumeration by timing. Session identifiers
 * are 256-bit random values — never derived from user data.
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

/** One-way hash for ticket tokens at rest. Raw tokens are never persisted. */
export function hashTicketToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time hash comparison; length differences short-circuit safely. */
export function tokenHashMatches(rawToken: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashTicketToken(rawToken), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (candidate.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(candidate, expected);
}

/** Opaque session identifier for the session store (not a JWT). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash a session token for storage so a DB leak cannot replay sessions. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateCorrelationId(): string {
  return randomUUID();
}

/** Session lifetimes (spec 07 §3): short fan sessions, bounded staff sessions. */
export const SESSION_TTL_SECONDS = {
  fan: 4 * 60 * 60, // matchday window
  volunteer: 10 * 60 * 60, // shift length
  operator: 8 * 60 * 60,
} as const;
