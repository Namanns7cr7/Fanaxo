/**
 * Fan assistant — grounded venue Q&A (spec 06 §1: AI is a copilot, not the
 * source of truth).
 *
 * The assistant answers from a fact sheet assembled by trusted services
 * (ticket context, facilities finder, route service) — never from invented
 * knowledge. When AI_PROVIDER is 'anthropic' the fact sheet is handed to
 * Claude, which explains it conversationally but may only use those facts.
 * Otherwise (or on any model error/timeout) a deterministic intent matcher
 * answers from the identical facts, so the assistant always works offline.
 */

import 'server-only';

import type { FanActor } from '@fanaxo/contracts';
import { fanSessions } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { getEnv } from '../env';
import { getDb } from '../db';
import { findFacilitiesForFan, type FacilityKind } from './facilities';
import { getFanContext, profileToRoutePreferences } from './fan-context';

export interface AssistantReply {
  readonly answer: string;
  /** Grounding: the facts/tools this answer drew on (shown to the user). */
  readonly sources: string[];
  /** Suggested follow-up questions the fan can tap. */
  readonly suggestions: string[];
  /** True when the assistant could not ground an answer and escalated. */
  readonly escalated: boolean;
}

export interface FacilityFact {
  readonly name: string;
  readonly walkMinutes: number | null;
}

/**
 * Every fact the assistant is allowed to use, gathered once from trusted
 * services. Both the AI and deterministic answerers read only from here.
 */
export interface FanFactSheet {
  readonly matchLabel: string;
  readonly kickoffIso: string;
  readonly kickoffLocal: string;
  readonly venueName: string;
  readonly gateName: string;
  readonly section: string;
  readonly row: string;
  readonly seat: string;
  readonly stepFree: boolean;
  readonly routeMinutes: number | null;
  readonly queueMinutes: number | null;
  readonly congestion: string | null;
  readonly food: FacilityFact | null;
  readonly restroom: FacilityFact | null;
  readonly medical: FacilityFact | null;
}

export const DEFAULT_SUGGESTIONS = [
  'Where is my seat?',
  'Where can I get food?',
  'Where are the nearest restrooms?',
  'When does the match start?',
];

// ---------------------------------------------------------------------------
// Fact gathering (the single source of truth for both answerers)
// ---------------------------------------------------------------------------

function nearestFacility(
  facilities: ReturnType<typeof findFacilitiesForFan>,
  kind: FacilityKind,
): FacilityFact | null {
  const nearest = facilities.find((facility) => facility.kind === kind);
  return nearest === undefined ? null : { name: nearest.name, walkMinutes: nearest.walkMinutes };
}

/** Assemble the grounded fact sheet, or null if the fan has no verified ticket. */
export function buildFanFactSheet(actor: FanActor): FanFactSheet | null {
  const context = getFanContext(actor);
  if (context === null || context.ticket === null) {
    return null;
  }
  const session = getDb()
    .db.select()
    .from(fanSessions)
    .where(eq(fanSessions.id, actor.sessionId))
    .get();
  const ticketId = session?.ticketId ?? null;
  const preferences = profileToRoutePreferences(context.accessibilityProfile);
  const facilities =
    ticketId === null ? [] : findFacilitiesForFan(actor.venueId, ticketId, preferences);
  const ticket = context.ticket;

  return {
    matchLabel: ticket.matchLabel,
    kickoffIso: ticket.startsAt,
    kickoffLocal: new Date(ticket.startsAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    venueName: ticket.venueName,
    gateName: ticket.gateName,
    section: ticket.section,
    row: ticket.row,
    seat: ticket.seat,
    stepFree: preferences.stepFree,
    routeMinutes: context.route === null ? null : Math.round(context.route.totalTimeSeconds / 60),
    queueMinutes: context.route?.estimatedQueueMinutes ?? null,
    congestion: context.route?.congestionLevel ?? null,
    food: nearestFacility(facilities, 'food'),
    restroom: nearestFacility(facilities, 'restroom'),
    medical: nearestFacility(facilities, 'medical'),
  };
}

/** Render the fact sheet as plain text for grounding a model prompt. */
export function renderFactSheet(facts: FanFactSheet): string {
  const facility = (label: string, fact: FacilityFact | null): string =>
    fact === null
      ? `${label}: none listed nearby`
      : `${label}: ${fact.name}${fact.walkMinutes === null ? '' : ` (${fact.walkMinutes} min walk)`}`;
  const routeLine =
    facts.routeMinutes === null
      ? 'Route to seat: no step-free route currently available'
      : `Route to seat: about ${facts.routeMinutes} min, gate queue ${facts.queueMinutes ?? 0} min, crowd level ${facts.congestion ?? 'unknown'}`;
  return [
    `Match: ${facts.matchLabel} at ${facts.venueName}`,
    `Kick-off: ${facts.kickoffLocal}`,
    `Ticket: ${facts.gateName}, Section ${facts.section}, Row ${facts.row}, Seat ${facts.seat}`,
    `Step-free routing: ${facts.stepFree ? 'on' : 'off'}`,
    routeLine,
    facility('Nearest food and drink', facts.food),
    facility('Nearest restroom', facts.restroom),
    facility('Nearest medical point', facts.medical),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Deterministic answerer (fallback; always available, no model)
// ---------------------------------------------------------------------------

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

function detectIntent(question: string): Intent | null {
  const text = question.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return intent;
    }
  }
  return null;
}

function facilityReply(kind: FacilityKind, fact: FacilityFact | null): AssistantReply {
  const kindLabel = kind === 'food' ? 'food and drink' : kind;
  if (fact === null) {
    return escalate(`I couldn't find ${kindLabel} near you right now.`);
  }
  const walk = fact.walkMinutes === null ? '' : ` — about ${fact.walkMinutes} min walk`;
  return {
    answer: `Nearest ${kindLabel}: ${fact.name}${walk}. Walk times update live with crowd conditions.`,
    sources: ['Venue facilities map', 'Live route service'],
    suggestions: ['Where is my seat?', 'I need assistance'],
    escalated: false,
  };
}

const SIMPLE_HANDLERS: Record<
  Exclude<Intent, 'food' | 'restroom' | 'medical'>,
  (facts: FanFactSheet) => AssistantReply
> = {
  seat: (facts) => ({
    answer: `Your seat is Section ${facts.section}, Row ${facts.row}, Seat ${facts.seat}. Enter through ${facts.gateName}.`,
    sources: ['Your ticket'],
    suggestions: ['How do I get to my seat?', 'Where are the nearest restrooms?'],
    escalated: false,
  }),
  gate: (facts) => ({
    answer: `Head to ${facts.gateName} to enter — that is the gate assigned to your ticket. If it is congested, the app will suggest an alternative and update your route.`,
    sources: ['Your ticket', 'Live gate state'],
    suggestions: ['How do I get to my seat?', 'When does the match start?'],
    escalated: false,
  }),
  route: (facts) => {
    if (facts.routeMinutes === null) {
      return escalate('No step-free route is available to your seat right now.');
    }
    return {
      answer: `Your route to Section ${facts.section} takes about ${facts.routeMinutes} minutes with a ${facts.queueMinutes ?? 0}-minute gate queue. Open Navigation for step-by-step directions.`,
      sources: ['Live route service'],
      suggestions: ['Where can I get food?', 'When does the match start?'],
      escalated: false,
    };
  },
  kickoff: (facts) => ({
    answer: `${facts.matchLabel} kicks off at ${facts.kickoffLocal} at ${facts.venueName}. Aim to be through ${facts.gateName} at least 30 minutes early.`,
    sources: ['Match schedule'],
    suggestions: ['How do I get to my seat?', 'Where can I get food?'],
    escalated: false,
  }),
  help: () => ({
    answer:
      'You can request a volunteer from the Get-help tab and I will send your location to the nearest available staff member. For emergencies, contact the closest steward directly.',
    sources: ['Volunteer dispatch'],
    suggestions: ['Where is the nearest medical point?', 'Where is my seat?'],
    escalated: false,
  }),
};

/** Deterministic grounded answer. Exported so the AI provider can fall back to it. */
export function deterministicAnswer(facts: FanFactSheet, question: string): AssistantReply {
  const intent = detectIntent(question);
  if (intent === null) {
    return escalate("I want to be accurate, so I won't guess on that one.");
  }
  if (intent === 'food' || intent === 'restroom' || intent === 'medical') {
    return facilityReply(intent, facts[intent]);
  }
  return SIMPLE_HANDLERS[intent](facts);
}

export function escalate(reason: string): AssistantReply {
  return {
    answer: `${reason} A volunteer can help directly — open the Get-help tab to request one, and I'll share your location with the nearest available staff.`,
    sources: [],
    suggestions: DEFAULT_SUGGESTIONS,
    escalated: true,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Answer a fan question, grounded in their ticket context and live venue
 * data. Uses Claude when configured, deterministic matching otherwise or on
 * any model failure.
 */
export async function answerFanQuestion(
  actor: FanActor,
  question: string,
): Promise<AssistantReply> {
  const facts = buildFanFactSheet(actor);
  if (facts === null) {
    return {
      answer:
        'Verify your ticket first and I can guide you to your seat, facilities, and the fastest route.',
      sources: [],
      suggestions: ['Where is my seat?'],
      escalated: false,
    };
  }

  const env = getEnv();
  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY !== undefined) {
    try {
      const { anthropicFanAnswer } = await import('../ai/fan-assistant-ai');
      return await anthropicFanAnswer(facts, question);
    } catch {
      // Model unavailable, timed out, or output failed validation: fall back.
    }
  }
  return deterministicAnswer(facts, question);
}
