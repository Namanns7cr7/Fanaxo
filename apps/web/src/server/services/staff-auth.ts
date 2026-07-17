/**
 * Staff authentication (spec 03 §3.2-3.3) — demo credentials only.
 *
 * Volunteers use badge + OTP; operators use email + password + simulated
 * MFA. Failures return one generic outcome (no user enumeration), and
 * every successful login writes an audit record.
 */

import 'server-only';

import { UserRole, type VolunteerLoginRequest, type OperatorLoginRequest } from '@fanaxo/contracts';
import { users, verifyPassword, volunteerProfiles, DEMO } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import { getEnv } from '../env';
import { newCorrelationId } from '../http';
import { createStaffSession } from '../auth/session';

export type StaffLoginOutcome =
  { readonly ok: true; readonly displayName: string } | { readonly ok: false };

/** Demo OTP check: in demo mode all staff share one published code. */
function otpIsValid(code: string): boolean {
  return getEnv().DEMO_MODE && code === DEMO.staffOtp;
}

export async function loginVolunteer(input: VolunteerLoginRequest): Promise<StaffLoginOutcome> {
  const db = getDb().db;
  const user = db.select().from(users).where(eq(users.badgeId, input.badgeId)).get();
  if (user === undefined || user.role !== 'volunteer' || user.status !== 'active') {
    return { ok: false };
  }
  if (!otpIsValid(input.otp)) {
    return { ok: false };
  }
  const profile = db
    .select()
    .from(volunteerProfiles)
    .where(eq(volunteerProfiles.userId, user.id))
    .get();
  if (profile === undefined) {
    return { ok: false };
  }

  const sessionId = await createStaffSession(user.id, 'volunteer', profile.venueId);
  writeAudit({
    actor: {
      kind: UserRole.VOLUNTEER,
      sessionId,
      userId: user.id,
      venueId: profile.venueId,
      zoneId: profile.zoneId,
      roleType: profile.roleType,
      displayName: user.displayName,
    },
    action: 'auth.volunteer.login',
    resource: 'user',
    resourceId: user.id,
    venueId: profile.venueId,
    correlationId: newCorrelationId(),
  });
  return { ok: true, displayName: user.displayName };
}

export async function loginOperator(input: OperatorLoginRequest): Promise<StaffLoginOutcome> {
  const db = getDb().db;
  const user = db.select().from(users).where(eq(users.email, input.email)).get();
  if (user === undefined || user.role !== 'operator' || user.status !== 'active') {
    return { ok: false };
  }
  if (user.passwordHash === null || !verifyPassword(input.password, user.passwordHash)) {
    return { ok: false };
  }
  if (!otpIsValid(input.mfaCode)) {
    return { ok: false };
  }

  // Operators are scoped to the demo venue in this build (single-venue demo).
  const venueId = DEMO.venueId;
  const sessionId = await createStaffSession(user.id, 'operator', venueId);
  writeAudit({
    actor: {
      kind: UserRole.OPERATOR,
      sessionId,
      userId: user.id,
      venueId,
      displayName: user.displayName,
    },
    action: 'auth.operator.login',
    resource: 'user',
    resourceId: user.id,
    venueId,
    correlationId: newCorrelationId(),
  });
  return { ok: true, displayName: user.displayName };
}
