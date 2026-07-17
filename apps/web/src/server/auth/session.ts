/**
 * Session management (spec 07 §3).
 *
 * Opaque 256-bit tokens in Secure/HttpOnly/SameSite cookies; only a peppered
 * hash is stored server-side. Resolving a session returns a typed Actor —
 * the sole source of role and venue scope for authorization decisions.
 * Logout deletes the server row, not just the cookie.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import { generateSessionToken, hashSessionToken, SESSION_TTL_SECONDS } from '@fanaxo/auth';
import { UserRole, type Actor } from '@fanaxo/contracts';
import { fanSessions, staffSessions, users, volunteerProfiles } from '@fanaxo/db';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

import { getDb } from '../db';
import { getEnv } from '../env';

export const FAN_COOKIE = 'fanaxo_fan_session';
export const STAFF_COOKIE = 'fanaxo_staff_session';

function pepperedHash(token: string): string {
  return hashSessionToken(`${getEnv().SESSION_SECRET}.${token}`);
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: getEnv().NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

// ---------------------------------------------------------------------------
// Fan sessions
// ---------------------------------------------------------------------------

export interface CreateFanSessionInput {
  readonly venueId: string;
  readonly ticketId: string | null;
}

export async function createFanSession(input: CreateFanSessionInput): Promise<string> {
  const token = generateSessionToken();
  const sessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS.fan * 1000);

  getDb()
    .db.insert(fanSessions)
    .values({
      id: sessionId,
      ticketId: input.ticketId,
      venueId: input.venueId,
      tokenHash: pepperedHash(token),
      locale: 'en',
      accessibilityProfile: null,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .run();

  const cookieStore = await cookies();
  cookieStore.set(FAN_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS.fan));
  return sessionId;
}

// ---------------------------------------------------------------------------
// Staff sessions
// ---------------------------------------------------------------------------

export async function createStaffSession(
  userId: string,
  role: 'volunteer' | 'operator',
  venueId: string,
): Promise<string> {
  const token = generateSessionToken();
  const sessionId = randomUUID();
  const now = new Date();
  const ttl = SESSION_TTL_SECONDS[role];
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  getDb()
    .db.insert(staffSessions)
    .values({
      id: sessionId,
      userId,
      role,
      venueId,
      tokenHash: pepperedHash(token),
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .run();

  const cookieStore = await cookies();
  cookieStore.set(STAFF_COOKIE, token, cookieOptions(ttl));
  return sessionId;
}

// ---------------------------------------------------------------------------
// Actor resolution
// ---------------------------------------------------------------------------

async function resolveFanActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(FAN_COOKIE)?.value;
  if (token === undefined) {
    return null;
  }
  const session = getDb()
    .db.select()
    .from(fanSessions)
    .where(eq(fanSessions.tokenHash, pepperedHash(token)))
    .get();
  if (session === undefined || session.expiresAt < new Date().toISOString()) {
    return null;
  }
  return {
    kind: UserRole.FAN,
    sessionId: session.id,
    venueId: session.venueId,
    ticketId: session.ticketId,
  };
}

async function resolveStaffActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE)?.value;
  if (token === undefined) {
    return null;
  }
  const db = getDb().db;
  const session = db
    .select()
    .from(staffSessions)
    .where(eq(staffSessions.tokenHash, pepperedHash(token)))
    .get();
  if (session === undefined || session.expiresAt < new Date().toISOString()) {
    return null;
  }
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (user === undefined || user.status !== 'active') {
    return null;
  }
  if (session.role === 'volunteer') {
    const profile = db
      .select()
      .from(volunteerProfiles)
      .where(eq(volunteerProfiles.userId, user.id))
      .get();
    if (profile === undefined) {
      return null;
    }
    return {
      kind: UserRole.VOLUNTEER,
      sessionId: session.id,
      userId: user.id,
      venueId: session.venueId,
      zoneId: profile.zoneId,
      roleType: profile.roleType,
      displayName: user.displayName,
    };
  }
  return {
    kind: UserRole.OPERATOR,
    sessionId: session.id,
    userId: user.id,
    venueId: session.venueId,
    displayName: user.displayName,
  };
}

/** Resolve the current actor; staff cookie wins when both are present. */
export async function resolveActor(): Promise<Actor | null> {
  return (await resolveStaffActor()) ?? (await resolveFanActor());
}

export async function resolveActorOfKind<K extends Actor['kind']>(
  kind: K,
): Promise<Extract<Actor, { kind: K }> | null> {
  const actor = kind === UserRole.FAN ? await resolveFanActor() : await resolveStaffActor();
  if (actor === null || actor.kind !== kind) {
    return null;
  }
  return actor as Extract<Actor, { kind: K }>;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/** Invalidate the server-side session row and clear the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const db = getDb().db;

  const staffToken = cookieStore.get(STAFF_COOKIE)?.value;
  if (staffToken !== undefined) {
    db.delete(staffSessions)
      .where(eq(staffSessions.tokenHash, pepperedHash(staffToken)))
      .run();
    cookieStore.delete(STAFF_COOKIE);
  }
  const fanToken = cookieStore.get(FAN_COOKIE)?.value;
  if (fanToken !== undefined) {
    db.delete(fanSessions)
      .where(eq(fanSessions.tokenHash, pepperedHash(fanToken)))
      .run();
    cookieStore.delete(FAN_COOKIE);
  }
}
