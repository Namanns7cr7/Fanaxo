/**
 * GET /api/fan/facilities — nearby facilities with live walk times.
 */

import { ApiErrorCode } from '@fanaxo/contracts';

import { resolveActorOfKind } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { jsonError, jsonOk } from '@/server/http';
import { profileToRoutePreferences } from '@/server/services/fan-context';
import { findFacilitiesForFan } from '@/server/services/facilities';
import { AccessibilityProfileSchema } from '@fanaxo/contracts';
import { fanSessions } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

export async function GET(): Promise<Response> {
  const actor = await resolveActorOfKind('fan');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Verify a ticket to see facilities.');
  }
  const session = getDb()
    .db.select()
    .from(fanSessions)
    .where(eq(fanSessions.id, actor.sessionId))
    .get();
  if (session === undefined || session.ticketId === null) {
    return jsonOk({ facilities: [] });
  }
  const ticketId = session.ticketId;
  const profile = AccessibilityProfileSchema.parse(session.accessibilityProfile ?? {});
  const facilities = findFacilitiesForFan(
    actor.venueId,
    ticketId,
    profileToRoutePreferences(profile),
  );
  return jsonOk({ facilities });
}
