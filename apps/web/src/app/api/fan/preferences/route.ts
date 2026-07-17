/**
 * PUT /api/fan/preferences — update locale and accessibility profile.
 * Changing step-free/low-sensory here re-shapes the fan's live route.
 */

import { ApiErrorCode, FanPreferencesUpdateSchema } from '@fanaxo/contracts';

import { resolveActorOfKind } from '@/server/auth/session';
import { jsonError, jsonOk, newCorrelationId, parseBody } from '@/server/http';
import { pushFanRouteUpdates, updateFanPreferences } from '@/server/services/fan-context';

export async function PUT(request: Request): Promise<Response> {
  const actor = await resolveActorOfKind('fan');
  if (actor === null) {
    return jsonError(ApiErrorCode.UNAUTHENTICATED, 'Verify a ticket to change preferences.');
  }
  const body = await parseBody(request, FanPreferencesUpdateSchema);
  if (!body.ok) {
    return body.response;
  }
  updateFanPreferences(actor, body.data);
  // Preferences changed the route inputs; recompute and publish.
  pushFanRouteUpdates(actor.venueId, newCorrelationId(), 'preference_changed');
  return jsonOk({ ok: true });
}
