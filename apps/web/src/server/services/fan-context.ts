/**
 * Fan session context: preferences, ticket details, and the live route.
 * Route preferences derive from the stored accessibility profile.
 */

import 'server-only';

import {
  AccessibilityProfileSchema,
  EventType,
  type AccessibilityProfile,
  type FanActor,
  type FanContextResponse,
  type FanPreferencesUpdate,
  type SupportedLanguage,
} from '@fanaxo/contracts';
import { fanSessions, gateStates, matches, notifications, tickets, venues } from '@fanaxo/db';
import type { RoutePreferences } from '@fanaxo/domain';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { publishEvent } from '../realtime/bus';
import { computeTicketRoute, type RouteWithSteps } from './routing';

const DEFAULT_PROFILE: AccessibilityProfile = AccessibilityProfileSchema.parse({});

export function profileToRoutePreferences(profile: AccessibilityProfile): RoutePreferences {
  return {
    stepFree: profile.flags.includes('step_free') || profile.flags.includes('wheelchair'),
    avoidCrowds: false,
    lowSensory: profile.flags.includes('low_sensory') || profile.flags.includes('quiet_zone'),
  };
}

function parseProfile(raw: unknown): AccessibilityProfile {
  const parsed = AccessibilityProfileSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_PROFILE;
}

/** Assemble everything the fan dashboard needs in one response. */
export function getFanContext(actor: FanActor): FanContextResponse | null {
  const db = getDb().db;
  const session = db.select().from(fanSessions).where(eq(fanSessions.id, actor.sessionId)).get();
  if (session === undefined) {
    return null;
  }
  const profile = parseProfile(session.accessibilityProfile);

  let ticketContext: FanContextResponse['ticket'] = null;
  let route: FanContextResponse['route'] = null;
  if (session.ticketId !== null) {
    const ticket = db.select().from(tickets).where(eq(tickets.id, session.ticketId)).get();
    const match =
      ticket === undefined
        ? undefined
        : db.select().from(matches).where(eq(matches.id, ticket.matchId)).get();
    const venue =
      match === undefined
        ? undefined
        : db.select().from(venues).where(eq(venues.id, match.venueId)).get();
    const gate =
      ticket === undefined
        ? undefined
        : db.select().from(gateStates).where(eq(gateStates.gateId, ticket.gateId)).get();
    if (ticket !== undefined && match !== undefined && venue !== undefined && gate !== undefined) {
      ticketContext = {
        matchLabel: `${match.homeLabel} vs ${match.awayLabel}`,
        startsAt: match.startsAt,
        venueName: venue.name,
        gateId: ticket.gateId,
        gateName: gate.name,
        section: ticket.section,
        row: ticket.row,
        seat: ticket.seat,
      };
      const routeResult = computeTicketRoute(
        session.venueId,
        ticket.id,
        profileToRoutePreferences(profile),
      );
      route = routeResult.ok ? routeResult.value.route : null;
    }
  }

  const notices = db
    .select()
    .from(notifications)
    .where(eq(notifications.venueId, session.venueId))
    .orderBy(desc(notifications.createdAt))
    .limit(20)
    .all()
    .filter(
      (notice) =>
        notice.status === 'sent' &&
        (notice.audience === 'all_fans' || notice.audience === 'zone_fans') &&
        notice.locale === session.locale,
    )
    .slice(0, 5);

  return {
    sessionId: session.id,
    ticket: ticketContext,
    locale: session.locale as SupportedLanguage,
    accessibilityProfile: profile,
    route,
    activeNotices: notices.map((notice) => ({
      id: notice.id,
      message: notice.message,
      publishedAt: notice.sentAt ?? notice.createdAt,
    })),
  };
}

/** Human-readable route steps for the current fan session, or [] if none. */
export function getFanRouteSteps(actor: FanActor): RouteWithSteps['steps'] {
  const session = getDb()
    .db.select()
    .from(fanSessions)
    .where(eq(fanSessions.id, actor.sessionId))
    .get();
  if (session === undefined || session.ticketId === null) {
    return [];
  }
  const profile = parseProfile(session.accessibilityProfile);
  const result = computeTicketRoute(
    actor.venueId,
    session.ticketId,
    profileToRoutePreferences(profile),
  );
  return result.ok ? result.value.steps : [];
}

export function updateFanPreferences(actor: FanActor, input: FanPreferencesUpdate): void {
  getDb()
    .db.update(fanSessions)
    .set({ locale: input.locale, accessibilityProfile: input.accessibilityProfile })
    .where(eq(fanSessions.id, actor.sessionId))
    .run();
}

/**
 * Recompute and publish routes for every active ticketed session — called
 * whenever shared state (gate status, congestion plan) changes routes.
 */
export function pushFanRouteUpdates(
  venueId: string,
  correlationId: string,
  reason: 'gate_state_changed' | 'congestion' | 'preference_changed' | 'initial',
): void {
  const db = getDb().db;
  const nowIso = new Date().toISOString();
  const sessions = db
    .select()
    .from(fanSessions)
    .where(eq(fanSessions.venueId, venueId))
    .all()
    .filter((session) => session.ticketId !== null && session.expiresAt > nowIso);

  for (const session of sessions) {
    const profile = parseProfile(session.accessibilityProfile);
    const routeResult = computeTicketRoute(
      venueId,
      session.ticketId as string,
      profileToRoutePreferences(profile),
    );
    if (routeResult.ok) {
      publishEvent({
        eventType: EventType.FAN_ROUTE_UPDATED,
        venueId,
        aggregateId: session.id,
        aggregateVersion: Date.now(),
        correlationId,
        payload: {
          fanSessionId: session.id,
          route: routeResult.value.route,
          reason,
        },
      });
    }
  }
}
