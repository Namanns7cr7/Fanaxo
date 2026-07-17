/**
 * In-process realtime event bus behind a transport adapter (ADR-002).
 *
 * Publishers hand fully-formed versioned envelopes to `publishEvent`;
 * SSE route handlers subscribe per venue. The interface is transport-
 * agnostic so a hosted deployment can swap in a shared broker without
 * touching feature services.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import type { EventPayloadMap, EventType, RealtimeEvent } from '@fanaxo/contracts';

type Subscriber = (event: RealtimeEvent) => void;

interface Bus {
  readonly subscribersByVenue: Map<string, Set<Subscriber>>;
  /** Ring buffer of recent events for snapshot-on-reconnect. */
  readonly recentByVenue: Map<string, RealtimeEvent[]>;
}

const RECENT_LIMIT = 200;

const globalStore = globalThis as unknown as { __fanaxoBus?: Bus };

function getBus(): Bus {
  globalStore.__fanaxoBus ??= {
    subscribersByVenue: new Map(),
    recentByVenue: new Map(),
  };
  return globalStore.__fanaxoBus;
}

export interface PublishInput<T extends EventType> {
  readonly eventType: T;
  readonly venueId: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly correlationId: string;
  readonly payload: EventPayloadMap[T];
}

/** Build and fan out a versioned event envelope. Returns the envelope. */
export function publishEvent<T extends EventType>(input: PublishInput<T>): RealtimeEvent<T> {
  const event = {
    eventId: randomUUID(),
    eventType: input.eventType,
    schemaVersion: 1 as const,
    venueId: input.venueId,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion,
    occurredAt: new Date().toISOString(),
    correlationId: input.correlationId,
    payload: input.payload,
  } as RealtimeEvent<T>;

  const bus = getBus();
  const recent = bus.recentByVenue.get(input.venueId) ?? [];
  recent.push(event);
  if (recent.length > RECENT_LIMIT) {
    recent.splice(0, recent.length - RECENT_LIMIT);
  }
  bus.recentByVenue.set(input.venueId, recent);

  const subscribers = bus.subscribersByVenue.get(input.venueId);
  if (subscribers !== undefined) {
    for (const subscriber of subscribers) {
      try {
        subscriber(event);
      } catch {
        // A broken subscriber must never break the publisher.
      }
    }
  }
  return event;
}

/** Subscribe to a venue's events. Returns an unsubscribe function. */
export function subscribeToVenue(venueId: string, subscriber: Subscriber): () => void {
  const bus = getBus();
  const existing = bus.subscribersByVenue.get(venueId);
  if (existing === undefined) {
    bus.subscribersByVenue.set(venueId, new Set([subscriber]));
  } else {
    existing.add(subscriber);
  }
  return () => {
    bus.subscribersByVenue.get(venueId)?.delete(subscriber);
  };
}

/** Recent events for reconnect catch-up (client filters by version). */
export function recentEvents(venueId: string): readonly RealtimeEvent[] {
  return getBus().recentByVenue.get(venueId) ?? [];
}
