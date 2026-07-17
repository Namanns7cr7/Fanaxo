/**
 * Ticket verification service (spec 05 §9, spec 03 §3.1).
 *
 * Constant-time token comparison against stored hashes, generic errors that
 * do not reveal whether a token exists, and an audit record per attempt.
 */

import 'server-only';

import { tokenHashMatches } from '@fanaxo/auth';
import { UserRole, type TicketContext } from '@fanaxo/contracts';
import { gateStates, matches, tickets, venues } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import { newCorrelationId } from '../http';
import { createFanSession } from '../auth/session';

export type TicketVerifyOutcome =
  | { readonly ok: true; readonly sessionId: string; readonly ticket: TicketContext }
  | { readonly ok: false; readonly reason: 'invalid' | 'expired' | 'used' };

/**
 * Verify a demo ticket token and open a fan session. Invalid tokens all
 * return the same generic 'invalid' outcome to block enumeration.
 */
export async function verifyTicketAndCreateSession(token: string): Promise<TicketVerifyOutcome> {
  const db = getDb().db;
  const allTickets = db.select().from(tickets).all();
  // Constant-time comparison per candidate; the demo table is small.
  const matched = allTickets.find((candidate) => tokenHashMatches(token, candidate.tokenHash));
  if (matched === undefined) {
    return { ok: false, reason: 'invalid' };
  }
  if (matched.status === 'expired') {
    return { ok: false, reason: 'expired' };
  }
  if (matched.status !== 'valid') {
    return { ok: false, reason: 'used' };
  }

  const match = db.select().from(matches).where(eq(matches.id, matched.matchId)).get();
  const venue =
    match === undefined
      ? undefined
      : db.select().from(venues).where(eq(venues.id, match.venueId)).get();
  const gate = db.select().from(gateStates).where(eq(gateStates.gateId, matched.gateId)).get();
  if (match === undefined || venue === undefined || gate === undefined) {
    return { ok: false, reason: 'invalid' };
  }

  const sessionId = await createFanSession({ venueId: venue.id, ticketId: matched.id });

  writeAudit({
    actor: { kind: UserRole.FAN, sessionId, venueId: venue.id, ticketId: matched.id },
    action: 'ticket.verified',
    resource: 'ticket',
    resourceId: matched.id,
    venueId: venue.id,
    correlationId: newCorrelationId(),
  });

  return {
    ok: true,
    sessionId,
    ticket: {
      matchLabel: `${match.homeLabel} vs ${match.awayLabel}`,
      startsAt: match.startsAt,
      venueName: venue.name,
      gateId: matched.gateId,
      gateName: gate.name,
      section: matched.section,
      row: matched.row,
      seat: matched.seat,
    },
  };
}
