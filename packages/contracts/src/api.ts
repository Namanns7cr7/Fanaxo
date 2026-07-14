/**
 * API request/response contracts.
 *
 * Every route handler validates its input with one of these schemas before
 * any domain logic runs (spec 05 §4-5). The server never trusts client-sent
 * role, venue, ownership, or severity fields — those are derived server-side.
 */

import { z } from 'zod';

import {
  AccessibilityProfileSchema,
  CalculatedRouteSchema,
  ProposedActionSchema,
} from './entities.js';
import { GateStatus, IncidentCategory, IncidentSeverity, SupportedLanguage } from './enums.js';

const uuid = z.string().uuid();

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/** Stable public error codes; internal detail never leaks to clients. */
export const ApiErrorCode = {
  VALIDATION_FAILED: 'validation_failed',
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  TICKET_INVALID: 'ticket_invalid',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  INTERNAL: 'internal_error',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const ApiErrorSchema = z.object({
  code: z.nativeEnum(ApiErrorCode),
  message: z.string(),
  correlationId: z.string().uuid().optional(),
  /** Field-level issues for form display; safe to show to users. */
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ---------------------------------------------------------------------------
// Fan: ticket verification and session
// ---------------------------------------------------------------------------

export const TicketVerifyRequestSchema = z.object({
  /** Opaque demo ticket token from QR scan or manual entry. Never a URL param. */
  token: z.string().trim().min(8).max(128),
});

export type TicketVerifyRequest = z.infer<typeof TicketVerifyRequestSchema>;

export const TicketContextSchema = z.object({
  matchLabel: z.string(),
  startsAt: z.string().datetime(),
  venueName: z.string(),
  gateId: uuid,
  gateName: z.string(),
  section: z.string(),
  row: z.string(),
  seat: z.string(),
});

export type TicketContext = z.infer<typeof TicketContextSchema>;

export const FanPreferencesUpdateSchema = z.object({
  locale: z.nativeEnum(SupportedLanguage),
  accessibilityProfile: AccessibilityProfileSchema,
});

export type FanPreferencesUpdate = z.infer<typeof FanPreferencesUpdateSchema>;

export const FanContextResponseSchema = z.object({
  sessionId: uuid,
  ticket: TicketContextSchema.nullable(),
  locale: z.nativeEnum(SupportedLanguage),
  accessibilityProfile: AccessibilityProfileSchema,
  route: CalculatedRouteSchema.nullable(),
  activeNotices: z.array(
    z.object({ id: uuid, message: z.string(), publishedAt: z.string().datetime() }),
  ),
});

export type FanContextResponse = z.infer<typeof FanContextResponseSchema>;

export const AssistanceRequestCreateSchema = z.object({
  category: z.enum(['navigation', 'accessibility', 'language', 'medical_nonurgent', 'other']),
  description: z.string().trim().min(5).max(500),
  zoneId: uuid,
  clientRequestId: uuid,
});

export type AssistanceRequestCreate = z.infer<typeof AssistanceRequestCreateSchema>;

// ---------------------------------------------------------------------------
// Staff login (demo credentials, never real identity)
// ---------------------------------------------------------------------------

export const VolunteerLoginRequestSchema = z.object({
  badgeId: z.string().trim().min(4).max(32),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export type VolunteerLoginRequest = z.infer<typeof VolunteerLoginRequestSchema>;

export const OperatorLoginRequestSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  mfaCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'MFA code must be 6 digits'),
});

export type OperatorLoginRequest = z.infer<typeof OperatorLoginRequestSchema>;

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

/** Spec 05 §5. Server derives reporter, venue, final severity, and audit metadata. */
export const IncidentCreateSchema = z.object({
  zoneId: uuid,
  category: z.nativeEnum(IncidentCategory),
  description: z.string().trim().min(10).max(1000),
  severityHint: z.nativeEnum(IncidentSeverity).optional(),
  /** Client-generated idempotency key: retries must not create duplicates. */
  clientRequestId: uuid,
  attachmentIds: z.array(uuid).max(3).default([]),
});

export type IncidentCreate = z.infer<typeof IncidentCreateSchema>;

export const IncidentStatusUpdateSchema = z.object({
  action: z.enum(['triage', 'assign', 'acknowledge', 'respond', 'resolve', 'reopen']),
  assigneeId: uuid.optional(),
  note: z.string().trim().max(1000).optional(),
  expectedVersion: z.number().int().nonnegative(),
});

export type IncidentStatusUpdate = z.infer<typeof IncidentStatusUpdateSchema>;

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const TaskUpdateSchema = z.object({
  action: z.enum(['accept', 'start', 'complete', 'escalate', 'cancel']),
  note: z.string().trim().max(1000).optional(),
  /** Optimistic concurrency: mismatch returns a conflict, never a silent overwrite. */
  expectedVersion: z.number().int().nonnegative(),
});

export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;

export const TaskAssignSchema = z.object({
  assigneeId: uuid,
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  title: z.string().trim().min(5).max(200),
  instructions: z.string().trim().min(5).max(2000),
  zoneId: uuid,
  incidentId: uuid.optional(),
  clientRequestId: uuid,
});

export type TaskAssign = z.infer<typeof TaskAssignSchema>;

// ---------------------------------------------------------------------------
// Operator: gates, recommendations, notifications
// ---------------------------------------------------------------------------

/** High-impact action: requires explicit confirmation and a reason (spec 07 §4). */
export const GateStatePatchSchema = z.object({
  status: z.nativeEnum(GateStatus),
  reason: z.string().trim().min(10).max(500),
  confirm: z.literal(true),
  expectedVersion: z.number().int().nonnegative(),
});

export type GateStatePatch = z.infer<typeof GateStatePatchSchema>;

export const RecommendationDecisionSchema = z.object({
  decision: z.enum(['approved', 'modified', 'rejected']),
  reason: z.string().trim().min(10).max(500),
  /** Present only when decision is `modified`; replaces the proposed actions. */
  modifiedActions: z.array(ProposedActionSchema).max(8).optional(),
  expectedVersion: z.number().int().nonnegative(),
});

export type RecommendationDecision = z.infer<typeof RecommendationDecisionSchema>;

export const NotificationCreateSchema = z.object({
  audience: z.enum(['all_fans', 'zone_fans', 'volunteers', 'operators']),
  zoneId: uuid.optional(),
  message: z.string().trim().min(5).max(500),
  languages: z.array(z.nativeEnum(SupportedLanguage)).min(1).max(8),
  clientRequestId: uuid,
});

export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export const RouteRequestSchema = z.object({
  fromNodeId: uuid,
  toNodeId: uuid,
  stepFree: z.boolean().default(false),
  avoidCrowds: z.boolean().default(false),
  lowSensory: z.boolean().default(false),
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export const RouteResponseSchema = z.object({
  route: CalculatedRouteSchema,
  steps: z.array(
    z.object({
      nodeId: uuid,
      nodeName: z.string(),
      instruction: z.string(),
      distanceMeters: z.number().nonnegative(),
    }),
  ),
});

export type RouteResponse = z.infer<typeof RouteResponseSchema>;

// ---------------------------------------------------------------------------
// Simulation control (demo/operator only)
// ---------------------------------------------------------------------------

export const SimulationControlSchema = z.object({
  action: z.enum(['set_arrival_rate', 'reset_demo', 'pause', 'resume']),
  gateId: uuid.optional(),
  /** Multiplier on the baseline arrival rate; bounded to keep the demo stable. */
  arrivalRateMultiplier: z.number().min(0).max(10).optional(),
});

export type SimulationControl = z.infer<typeof SimulationControlSchema>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PaginationQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
