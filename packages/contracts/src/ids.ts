/**
 * Branded ID types for type-safe entity references.
 * Prevents accidental mixing of IDs across different entity types.
 *
 * Usage:
 *   const venueId: VenueId = 'abc-123' as VenueId;
 *   // Cannot assign VenueId to ZoneId without explicit cast
 */

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type VenueId = Brand<string, 'VenueId'>;
export type ZoneId = Brand<string, 'ZoneId'>;
export type GateId = Brand<string, 'GateId'>;
export type MatchId = Brand<string, 'MatchId'>;
export type TicketId = Brand<string, 'TicketId'>;
export type UserId = Brand<string, 'UserId'>;
export type IncidentId = Brand<string, 'IncidentId'>;
export type TaskId = Brand<string, 'TaskId'>;
export type RecommendationId = Brand<string, 'RecommendationId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type RouteNodeId = Brand<string, 'RouteNodeId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;

/** Helper to brand a raw string as a specific ID type */
export function brandId<T extends string>(raw: string): T {
  return raw as T;
}
