/**
 * Fan assistant — grounded venue Q&A (spec 06 §1: AI is a copilot, not the
 * source of truth).
 *
 * Answers come from trusted venue facts and tool results (ticket context,
 * facilities finder, route service), never from invented knowledge. A
 * deterministic intent matcher keeps the assistant fully functional with no
 * model or API key; it always cites which facts it used. If a question can't
 * be grounded, it escalates to "ask a volunteer" rather than guessing.
 */

import 'server-only';

import type { FanActor } from '@fanaxo/contracts';

import { getFanContext, profileToRoutePreferences } from './fan-context';
import { findFacilitiesForFan, type FacilityKind } from './facilities';
import { getDb } from '../db';
import { fanSessions } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

export interface AssistantReply {
  readonly answer: string;
  /** Grounding: the facts/tools this answer drew on (shown to the user). */
  readonly sources: string[];
  /** Suggested follow-up questions the fan can tap. */
  readonly suggestions: string[];
  /** True when the assistant could not ground an answer and escalated. */
  readonly escalated: boolean;
}

type Intent = 'seat' | 'gate' | 'food' | 'restroom' | 'medical' | 'route' | 'kickoff' | 'help';

const INTENT_KEYWORDS: Record<Intent, readonly string[]> = {
  seat: ['seat', 'section', 'row', 'where do i sit', 'my place'],
  gate: ['gate', 'entrance', 'enter', 'get in', 'entry'],
  food: ['food', 'eat', 'drink', 'hungry', 'snack', 'concession', 'beer', 'water'],
  restroom: ['restroom', 'toilet', 'bathroom', 'washroom', 'loo'],
  medical: ['medical', 'first aid', 'hurt', 'sick', 'doctor', 'injury', 'unwell'],
  route: ['route', 'way', 'direction', 'navigate', 'how do i get', 'how to get', 'walk'],
  kickoff: ['kickoff', 'kick off', 'start', 'when', 'time', 'begin'],
  help: ['help', 'assist', 'volunteer', 'lost', 'staff', 'support'],
};

const DEFAULT_SUGGESTIONS = [
  'Where is my seat?',
  'Where can I get food?',
  'Where are the nearest restrooms?',
  'When does the match start?',
];

function detectIntent(question: string): Intent | null {
  const text = question.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return intent;
    }
  }
  return null;
}

function nearestFacilityLine(
  actor: FanActor,
  ticketId: string,
  kind: FacilityKind,
  preferences: ReturnType<typeof profileToRoutePreferences>,
): string | null {
  const facilities = findFacilitiesForFan(actor.venueId, ticketId, preferences).filter(
    (facility) => facility.kind === kind,
  );
  const nearest = facilities[0];
  if (nearest === undefined) {
    return null;
  }
  const walk = nearest.walkMinutes === null ? '' : ` — about ${nearest.walkMinutes} min walk`;
  return `${nearest.name}${walk}`;
}

interface AnswerContext {
  readonly actor: FanActor;
  readonly ticket: NonNullable<ReturnType<typeof getFanContext>>['ticket'] & object;
  readonly route: NonNullable<ReturnType<typeof getFanContext>>['route'];
  readonly ticketId: string | null;
  readonly preferences: ReturnType<typeof profileToRoutePreferences>;
}

/** One grounded handler per intent. Kept in a table so the dispatcher stays flat. */
const INTENT_HANDLERS: Record<
  Exclude<Intent, 'food' | 'restroom' | 'medical'>,
  (ctx: AnswerContext) => AssistantReply
> = {
  seat: ({ ticket }) => ({
    answer: `Your seat is Section ${ticket.section}, Row ${ticket.row}, Seat ${ticket.seat}. Enter through ${ticket.gateName}.`,
    sources: ['Your ticket'],
    suggestions: ['How do I get to my seat?', 'Where are the nearest restrooms?'],
    escalated: false,
  }),
  gate: ({ ticket }) => ({
    answer: `Head to ${ticket.gateName} to enter — that is the gate assigned to your ticket. If it is congested, the app will suggest an alternative and update your route.`,
    sources: ['Your ticket', 'Live gate state'],
    suggestions: ['How do I get to my seat?', 'When does the match start?'],
    escalated: false,
  }),
  route: ({ ticket, route }) => {
    if (route === null) {
      return escalate('No step-free route is available to your seat right now.');
    }
    const minutes = Math.round(route.totalTimeSeconds / 60);
    return {
      answer: `Your route to Section ${ticket.section} takes about ${minutes} minutes with a ${route.estimatedQueueMinutes}-minute gate queue. Open Navigation for step-by-step directions.`,
      sources: ['Live route service'],
      suggestions: ['Where can I get food?', 'When does the match start?'],
      escalated: false,
    };
  },
  kickoff: ({ ticket }) => {
    const kickoff = new Date(ticket.startsAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      answer: `${ticket.matchLabel} kicks off at ${kickoff} at ${ticket.venueName}. Aim to be through ${ticket.gateName} at least 30 minutes early.`,
      sources: ['Match schedule'],
      suggestions: ['How do I get to my seat?', 'Where can I get food?'],
      escalated: false,
    };
  },
  help: () => ({
    answer:
      'You can request a volunteer from the Assistance tab and I will send your location to the nearest available staff member. For emergencies, contact the closest steward directly.',
    sources: ['Volunteer dispatch'],
    suggestions: ['Where is the nearest medical point?', 'Where is my seat?'],
    escalated: false,
  }),
};

function answerFacility(ctx: AnswerContext, kind: FacilityKind): AssistantReply {
  const kindLabel = kind === 'food' ? 'food and drink' : kind;
  const line =
    ctx.ticketId === null
      ? null
      : nearestFacilityLine(ctx.actor, ctx.ticketId, kind, ctx.preferences);
  if (line === null) {
    return escalate(`I couldn't find ${kindLabel} near you right now.`);
  }
  return {
    answer: `Nearest ${kindLabel}: ${line}. Walk times update live with crowd conditions.`,
    sources: ['Venue facilities map', 'Live route service'],
    suggestions: ['Where is my seat?', 'I need assistance'],
    escalated: false,
  };
}

/**
 * Answer a fan question, grounded in their ticket context and live venue
 * data. Pure/deterministic: identical inputs give identical answers.
 */
export function answerFanQuestion(actor: FanActor, question: string): AssistantReply {
  const context = getFanContext(actor);
  if (context === null || context.ticket === null) {
    return {
      answer:
        'Verify your ticket first and I can guide you to your seat, facilities, and the fastest route.',
      sources: [],
      suggestions: ['Where is my seat?'],
      escalated: false,
    };
  }

  const session = getDb()
    .db.select()
    .from(fanSessions)
    .where(eq(fanSessions.id, actor.sessionId))
    .get();
  const ctx: AnswerContext = {
    actor,
    ticket: context.ticket,
    route: context.route,
    ticketId: session?.ticketId ?? null,
    preferences: profileToRoutePreferences(context.accessibilityProfile),
  };

  const intent = detectIntent(question);
  if (intent === null) {
    return escalate("I want to be accurate, so I won't guess on that one.");
  }
  if (intent === 'food' || intent === 'restroom' || intent === 'medical') {
    return answerFacility(ctx, intent);
  }
  return INTENT_HANDLERS[intent](ctx);
}

function escalate(reason: string): AssistantReply {
  return {
    answer: `${reason} A volunteer can help directly — open the Assistance tab to request one, and I'll share your location with the nearest available staff.`,
    sources: [],
    suggestions: DEFAULT_SUGGESTIONS,
    escalated: true,
  };
}

export { DEFAULT_SUGGESTIONS };
