/**
 * Realtime event contracts.
 *
 * Every cross-role state change travels through a versioned, idempotent
 * envelope so clients can detect gaps, ignore stale versions, and reconcile
 * after reconnect (spec 04 §7, spec 05 §6).
 */

import { z } from 'zod';

import {
  AIRecommendationSchema,
  CalculatedRouteSchema,
  CrowdForecastSchema,
  CrowdSnapshotSchema,
  FeedStatusSchema,
  GateStateSchema,
  IncidentSchema,
  NotificationSchema,
  TaskSchema,
} from './entities.js';

/** All realtime event types the platform publishes (spec 05 §6.1). */
export const EventType = {
  CROWD_SNAPSHOT_UPDATED: 'crowd.snapshot.updated',
  CROWD_FORECAST_UPDATED: 'crowd.forecast.updated',
  GATE_STATE_CHANGED: 'gate.state.changed',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_STATUS_CHANGED: 'incident.status.changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_CHANGED: 'task.status.changed',
  RECOMMENDATION_CREATED: 'recommendation.created',
  RECOMMENDATION_DECISION_RECORDED: 'recommendation.decision.recorded',
  FAN_ROUTE_UPDATED: 'fan.route.updated',
  NOTIFICATION_PUBLISHED: 'notification.published',
  FEED_STATUS_CHANGED: 'feed.status.changed',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

const uuid = z.string().uuid();
const timestamp = z.string().datetime();

/**
 * Payload schema per event type. Reuses entity schemas so a payload can
 * never drift from the persisted shape it mirrors.
 */
export const EventPayloadSchemas = {
  [EventType.CROWD_SNAPSHOT_UPDATED]: CrowdSnapshotSchema,
  [EventType.CROWD_FORECAST_UPDATED]: CrowdForecastSchema,
  [EventType.GATE_STATE_CHANGED]: GateStateSchema,
  [EventType.INCIDENT_CREATED]: IncidentSchema,
  [EventType.INCIDENT_STATUS_CHANGED]: IncidentSchema,
  [EventType.TASK_ASSIGNED]: TaskSchema,
  [EventType.TASK_STATUS_CHANGED]: TaskSchema,
  [EventType.RECOMMENDATION_CREATED]: AIRecommendationSchema,
  [EventType.RECOMMENDATION_DECISION_RECORDED]: AIRecommendationSchema,
  [EventType.FAN_ROUTE_UPDATED]: z.object({
    fanSessionId: uuid,
    route: CalculatedRouteSchema,
    reason: z.enum(['gate_state_changed', 'congestion', 'preference_changed', 'initial']),
  }),
  [EventType.NOTIFICATION_PUBLISHED]: NotificationSchema,
  [EventType.FEED_STATUS_CHANGED]: FeedStatusSchema,
} satisfies Record<EventType, z.ZodTypeAny>;

export type EventPayloadMap = {
  [K in EventType]: z.infer<(typeof EventPayloadSchemas)[K]>;
};

/**
 * Versioned realtime envelope (spec 05 §6). `aggregateVersion` lets clients
 * drop out-of-order events; `correlationId` links an event back to the
 * user action and audit record that caused it.
 */
export const RealtimeEventSchema = z.object({
  eventId: uuid,
  eventType: z.nativeEnum(EventType),
  schemaVersion: z.literal(1),
  venueId: uuid,
  aggregateId: uuid,
  aggregateVersion: z.number().int().nonnegative(),
  occurredAt: timestamp,
  correlationId: uuid,
  payload: z.unknown(),
});

type EnvelopeBase = Omit<z.infer<typeof RealtimeEventSchema>, 'payload' | 'eventType'>;

/**
 * Distributive over EventType so the default `RealtimeEvent` is a
 * discriminated union: narrowing on `eventType` narrows `payload`.
 */
export type RealtimeEvent<T extends EventType = EventType> = T extends EventType
  ? EnvelopeBase & { eventType: T; payload: EventPayloadMap[T] }
  : never;

/**
 * Parse an unknown wire message into a fully validated typed event.
 * Returns `null` for anything malformed instead of throwing, because
 * a realtime stream must survive individual bad frames.
 */
export function parseRealtimeEvent(input: unknown): RealtimeEvent | null {
  const envelope = RealtimeEventSchema.safeParse(input);
  if (!envelope.success) {
    return null;
  }
  const payloadSchema = EventPayloadSchemas[envelope.data.eventType];
  const payload = payloadSchema.safeParse(envelope.data.payload);
  if (!payload.success) {
    return null;
  }
  // Safe: the payload was validated by the schema selected via eventType.
  return { ...envelope.data, payload: payload.data } as RealtimeEvent;
}
