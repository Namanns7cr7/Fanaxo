/**
 * Zod schemas for all core domain entities.
 * These schemas serve as both runtime validation and TypeScript type generation.
 * Used at every trust boundary: API inputs, DB outputs, event payloads.
 */

import { z } from 'zod';

import {
  AccessibilityFlag,
  CongestionState,
  FeedStatus,
  GateStatus,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  MatchStatus,
  RecommendationStatus,
  RiskLevel,
  RouteNodeType,
  SupportedLanguage,
  TaskPriority,
  TaskStatus,
  TicketStatus,
  UserRole,
  VolunteerRoleType,
  ZoneType,
} from './enums.js';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const uuid = z.string().uuid();
const timestamp = z.string().datetime();
const positiveInt = z.number().int().nonnegative();
const normalizedFloat = z.number().min(0).max(1);
const nonEmptyString = z.string().trim().min(1);

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: uuid,
  role: z.nativeEnum(UserRole),
  displayName: nonEmptyString.max(100),
  locale: z.nativeEnum(SupportedLanguage).default(SupportedLanguage.EN),
  status: z.enum(['active', 'inactive', 'suspended']),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type User = z.infer<typeof UserSchema>;

// ---------------------------------------------------------------------------
// Venue
// ---------------------------------------------------------------------------

export const VenueSchema = z.object({
  id: uuid,
  name: nonEmptyString.max(200),
  timezone: nonEmptyString.max(50),
  status: z.enum(['active', 'inactive', 'maintenance']),
  capacity: positiveInt,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type Venue = z.infer<typeof VenueSchema>;

// ---------------------------------------------------------------------------
// Zone
// ---------------------------------------------------------------------------

export const ZoneSchema = z.object({
  id: uuid,
  venueId: uuid,
  name: nonEmptyString.max(100),
  type: z.nativeEnum(ZoneType),
  capacity: positiveInt,
  x: z.number(),
  y: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type Zone = z.infer<typeof ZoneSchema>;

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export const MatchSchema = z.object({
  id: uuid,
  venueId: uuid,
  homeLabel: nonEmptyString.max(100),
  awayLabel: nonEmptyString.max(100),
  startsAt: timestamp,
  status: z.nativeEnum(MatchStatus),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type Match = z.infer<typeof MatchSchema>;

// ---------------------------------------------------------------------------
// Ticket
// ---------------------------------------------------------------------------

export const TicketSchema = z.object({
  id: uuid,
  matchId: uuid,
  gateId: uuid,
  section: nonEmptyString.max(20),
  row: nonEmptyString.max(10),
  seat: nonEmptyString.max(10),
  tokenHash: nonEmptyString,
  status: z.nativeEnum(TicketStatus),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type Ticket = z.infer<typeof TicketSchema>;

// ---------------------------------------------------------------------------
// Fan Session
// ---------------------------------------------------------------------------

export const AccessibilityProfileSchema = z.object({
  flags: z.array(z.nativeEnum(AccessibilityFlag)).default([]),
  preferredLanguage: z.nativeEnum(SupportedLanguage).default(SupportedLanguage.EN),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  fontSize: z.enum(['normal', 'large', 'extra-large']).default('normal'),
});

export type AccessibilityProfile = z.infer<typeof AccessibilityProfileSchema>;

export const FanSessionSchema = z.object({
  id: uuid,
  ticketId: uuid.optional(),
  locale: z.nativeEnum(SupportedLanguage).default(SupportedLanguage.EN),
  accessibilityProfile: AccessibilityProfileSchema.optional(),
  expiresAt: timestamp,
  createdAt: timestamp,
});

export type FanSession = z.infer<typeof FanSessionSchema>;

// ---------------------------------------------------------------------------
// Volunteer Profile
// ---------------------------------------------------------------------------

export const VolunteerProfileSchema = z.object({
  userId: uuid,
  venueId: uuid,
  roleType: z.nativeEnum(VolunteerRoleType),
  zoneId: uuid,
  shiftStart: timestamp,
  shiftEnd: timestamp,
  status: z.enum(['available', 'busy', 'off_duty', 'on_break']),
  displayName: nonEmptyString.max(100),
});

export type VolunteerProfile = z.infer<typeof VolunteerProfileSchema>;

// ---------------------------------------------------------------------------
// Gate State
// ---------------------------------------------------------------------------

export const GateStateSchema = z.object({
  gateId: uuid,
  venueId: uuid,
  name: nonEmptyString.max(50),
  status: z.nativeEnum(GateStatus),
  queueMinutes: z.number().min(0),
  throughput: positiveInt,
  currentCount: positiveInt,
  capacity: positiveInt,
  version: positiveInt,
  updatedAt: timestamp,
});

export type GateState = z.infer<typeof GateStateSchema>;

// ---------------------------------------------------------------------------
// Crowd Snapshot
// ---------------------------------------------------------------------------

export const CrowdSnapshotSchema = z.object({
  id: uuid,
  venueId: uuid,
  zoneId: uuid,
  capturedAt: timestamp,
  count: positiveInt,
  density: normalizedFloat,
  flowRate: z.number(),
  confidence: normalizedFloat,
  trend: z.enum(['rising', 'stable', 'falling']),
});

export type CrowdSnapshot = z.infer<typeof CrowdSnapshotSchema>;

// ---------------------------------------------------------------------------
// Crowd Forecast
// ---------------------------------------------------------------------------

export const CrowdForecastSchema = z.object({
  zoneId: uuid,
  venueId: uuid,
  horizonMinutes: z.number().int().positive(),
  forecastDensity: normalizedFloat,
  confidence: normalizedFloat,
  contributingSignals: z.array(nonEmptyString),
  modelVersion: nonEmptyString,
  generatedAt: timestamp,
});

export type CrowdForecast = z.infer<typeof CrowdForecastSchema>;

// ---------------------------------------------------------------------------
// Route Graph
// ---------------------------------------------------------------------------

export const RouteNodeSchema = z.object({
  id: uuid,
  venueId: uuid,
  name: nonEmptyString.max(100),
  type: z.nativeEnum(RouteNodeType),
  x: z.number(),
  y: z.number(),
  floor: z.number().int().default(0),
  zoneId: uuid.optional(),
});

export type RouteNode = z.infer<typeof RouteNodeSchema>;

export const RouteEdgeSchema = z.object({
  id: uuid,
  venueId: uuid,
  fromNodeId: uuid,
  toNodeId: uuid,
  distance: z.number().positive(),
  expectedTimeSeconds: z.number().positive(),
  capacity: positiveInt,
  liveDensity: normalizedFloat.default(0),
  status: z.enum(['open', 'restricted', 'closed']),
  hasStairs: z.boolean().default(false),
  hasLift: z.boolean().default(false),
  hasRamp: z.boolean().default(false),
  isIndoor: z.boolean().default(true),
  sensoryIntensity: z.enum(['low', 'medium', 'high']).default('medium'),
  slope: z.number().default(0),
});

export type RouteEdge = z.infer<typeof RouteEdgeSchema>;

export const CalculatedRouteSchema = z.object({
  nodeIds: z.array(uuid).min(2),
  totalDistance: z.number().nonnegative(),
  totalTimeSeconds: z.number().nonnegative(),
  estimatedQueueMinutes: z.number().nonnegative(),
  accessibilityCompliant: z.boolean(),
  congestionLevel: z.enum(['low', 'moderate', 'high', 'severe']),
  alternateAvailable: z.boolean(),
  calculatedAt: timestamp,
});

export type CalculatedRoute = z.infer<typeof CalculatedRouteSchema>;

// ---------------------------------------------------------------------------
// Incident
// ---------------------------------------------------------------------------

export const IncidentSchema = z.object({
  id: uuid,
  venueId: uuid,
  zoneId: uuid,
  category: z.nativeEnum(IncidentCategory),
  severity: z.nativeEnum(IncidentSeverity),
  status: z.nativeEnum(IncidentStatus),
  reporterId: uuid,
  reporterRole: z.nativeEnum(UserRole),
  summary: nonEmptyString.max(1000),
  description: nonEmptyString.max(5000).optional(),
  assigneeId: uuid.optional(),
  attachmentIds: z.array(uuid).max(3).default([]),
  version: positiveInt,
  correlationId: uuid,
  createdAt: timestamp,
  updatedAt: timestamp,
  resolvedAt: timestamp.optional(),
});

export type Incident = z.infer<typeof IncidentSchema>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const TaskSchema = z.object({
  id: uuid,
  venueId: uuid,
  incidentId: uuid.optional(),
  assigneeId: uuid.optional(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  title: nonEmptyString.max(200),
  instructions: nonEmptyString.max(2000),
  zoneId: uuid,
  dueAt: timestamp.optional(),
  version: positiveInt,
  correlationId: uuid,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp.optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// ---------------------------------------------------------------------------
// AI Recommendation
// ---------------------------------------------------------------------------

export const RecommendationEvidenceSchema = z.object({
  sourceId: nonEmptyString,
  label: nonEmptyString.max(200),
  observedAt: timestamp,
});

export type RecommendationEvidence = z.infer<typeof RecommendationEvidenceSchema>;

export const RedirectFansActionSchema = z.object({
  type: z.literal('redirect_fans'),
  fromGateId: uuid,
  toGateId: uuid,
  reason: nonEmptyString.max(500),
});

export const AssignVolunteersActionSchema = z.object({
  type: z.literal('assign_volunteers'),
  volunteerIds: z.array(uuid).min(1).max(10),
  zoneId: uuid,
  instructions: nonEmptyString.max(1000),
});

export const RestrictGateActionSchema = z.object({
  type: z.literal('restrict_gate'),
  gateId: uuid,
  newStatus: z.nativeEnum(GateStatus),
  reason: nonEmptyString.max(500),
});

export const DraftNotificationActionSchema = z.object({
  type: z.literal('draft_notification'),
  audience: z.enum(['all_fans', 'zone_fans', 'volunteers', 'operators']),
  zoneId: uuid.optional(),
  message: nonEmptyString.max(500),
  languages: z.array(z.nativeEnum(SupportedLanguage)).min(1),
});

export const ProposedActionSchema = z.discriminatedUnion('type', [
  RedirectFansActionSchema,
  AssignVolunteersActionSchema,
  RestrictGateActionSchema,
  DraftNotificationActionSchema,
]);

export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const AIRecommendationSchema = z.object({
  id: uuid,
  venueId: uuid,
  contextType: z.enum(['congestion', 'incident', 'staffing', 'safety', 'operational']),
  contextId: uuid,
  summary: nonEmptyString.max(500),
  riskLevel: z.nativeEnum(RiskLevel),
  confidence: normalizedFloat,
  evidence: z.array(RecommendationEvidenceSchema).min(1),
  proposedActions: z.array(ProposedActionSchema).max(8),
  requiresHumanApproval: z.literal(true),
  limitations: z.array(nonEmptyString.max(300)).max(5),
  status: z.nativeEnum(RecommendationStatus),
  operatorDecision: z
    .object({
      decision: z.enum(['approved', 'modified', 'rejected']),
      reason: nonEmptyString.max(500),
      operatorId: uuid,
      decidedAt: timestamp,
    })
    .optional(),
  version: positiveInt,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export const NotificationSchema = z.object({
  id: uuid,
  venueId: uuid,
  audience: z.enum(['all_fans', 'zone_fans', 'volunteers', 'operators']),
  zoneId: uuid.optional(),
  locale: z.nativeEnum(SupportedLanguage),
  channel: z.enum(['in_app', 'push', 'announcement']),
  message: nonEmptyString.max(500),
  status: z.enum(['draft', 'approved', 'sent', 'failed']),
  sentAt: timestamp.optional(),
  createdAt: timestamp,
});

export type Notification = z.infer<typeof NotificationSchema>;

// ---------------------------------------------------------------------------
// Audit Event (append-only)
// ---------------------------------------------------------------------------

export const AuditEventSchema = z.object({
  id: uuid,
  venueId: uuid,
  actor: uuid,
  actorRole: z.nativeEnum(UserRole),
  action: nonEmptyString.max(100),
  resource: nonEmptyString.max(200),
  resourceId: uuid,
  beforeHash: nonEmptyString.optional(),
  afterHash: nonEmptyString.optional(),
  reason: nonEmptyString.max(500).optional(),
  correlationId: uuid,
  createdAt: timestamp,
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ---------------------------------------------------------------------------
// Congestion Scenario State
// ---------------------------------------------------------------------------

export const CongestionScenarioSchema = z.object({
  venueId: uuid,
  gateId: uuid,
  state: z.nativeEnum(CongestionState),
  arrivalRate: z.number().nonnegative(),
  density: normalizedFloat,
  threshold: normalizedFloat,
  recommendationId: uuid.optional(),
  redirectGateId: uuid.optional(),
  assignedVolunteerIds: z.array(uuid).default([]),
  version: positiveInt,
  updatedAt: timestamp,
});

export type CongestionScenario = z.infer<typeof CongestionScenarioSchema>;

// ---------------------------------------------------------------------------
// Feed Status
// ---------------------------------------------------------------------------

export const FeedStatusSchema = z.object({
  feedName: nonEmptyString.max(100),
  status: z.nativeEnum(FeedStatus),
  lastUpdated: timestamp,
  latencyMs: positiveInt.optional(),
});

export type FeedStatusInfo = z.infer<typeof FeedStatusSchema>;
