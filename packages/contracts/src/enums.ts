/**
 * Core enumerations used across the Fanaxo domain.
 * Centralized to prevent magic strings and ensure consistency.
 */

/** User roles in the system */
export const UserRole = {
  FAN: 'fan',
  VOLUNTEER: 'volunteer',
  OPERATOR: 'operator',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Zone types within a venue */
export const ZoneType = {
  GATE: 'gate',
  CONCOURSE: 'concourse',
  SECTION: 'section',
  FACILITY: 'facility',
  TRANSPORT: 'transport',
  MEDICAL: 'medical',
  CORRIDOR: 'corridor',
} as const;

export type ZoneType = (typeof ZoneType)[keyof typeof ZoneType];

/** Gate operational status */
export const GateStatus = {
  OPEN: 'open',
  RESTRICTED: 'restricted',
  CLOSED: 'closed',
  REOPENING: 'reopening',
} as const;

export type GateStatus = (typeof GateStatus)[keyof typeof GateStatus];

/** Match status */
export const MatchStatus = {
  SCHEDULED: 'scheduled',
  GATES_OPEN: 'gates_open',
  IN_PROGRESS: 'in_progress',
  HALFTIME: 'halftime',
  COMPLETED: 'completed',
  POSTPONED: 'postponed',
} as const;

export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

/** Ticket verification status */
export const TicketStatus = {
  VALID: 'valid',
  USED: 'used',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  REVOKED: 'revoked',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/** Incident severity levels */
export const IncidentSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

/** Incident categories */
export const IncidentCategory = {
  CROWD_CONGESTION: 'crowd_congestion',
  MEDICAL: 'medical',
  LOST_CHILD: 'lost_child',
  SECURITY: 'security',
  ACCESSIBILITY: 'accessibility',
  FACILITY: 'facility',
  TRANSPORT: 'transport',
  LOST_ITEM: 'lost_item',
} as const;

export type IncidentCategory = (typeof IncidentCategory)[keyof typeof IncidentCategory];

/** Incident lifecycle states */
export const IncidentStatus = {
  REPORTED: 'reported',
  TRIAGED: 'triaged',
  ASSIGNED: 'assigned',
  ACKNOWLEDGED: 'acknowledged',
  RESPONDING: 'responding',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
} as const;

export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

/** Volunteer task lifecycle states */
export const TaskStatus = {
  CREATED: 'created',
  DELIVERED: 'delivered',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ESCALATED: 'escalated',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/** AI recommendation lifecycle states */
export const RecommendationStatus = {
  GENERATED: 'generated',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  MODIFIED: 'modified',
  REJECTED: 'rejected',
  EXECUTING: 'executing',
  MEASURED: 'measured',
  CLOSED: 'closed',
} as const;

export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];

/** Task priority levels */
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

/** Data feed status */
export const FeedStatus = {
  LIVE: 'live',
  DELAYED: 'delayed',
  STALE: 'stale',
  UNAVAILABLE: 'unavailable',
  RECOVERING: 'recovering',
} as const;

export type FeedStatus = (typeof FeedStatus)[keyof typeof FeedStatus];

/** Congestion scenario state machine */
export const CongestionState = {
  NORMAL: 'normal',
  RISING_DENSITY: 'rising_density',
  PREDICTED_CONGESTION: 'predicted_congestion',
  PLAN_PROPOSED: 'plan_proposed',
  PLAN_APPROVED: 'plan_approved',
  EXECUTING: 'executing',
  STABILIZING: 'stabilizing',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
  CANCELLED: 'cancelled',
} as const;

export type CongestionState = (typeof CongestionState)[keyof typeof CongestionState];

/** Volunteer role types */
export const VolunteerRoleType = {
  FAN_SUPPORT: 'fan_support',
  CROWD_MANAGEMENT: 'crowd_management',
  ACCESSIBILITY: 'accessibility',
  TRANSPORT: 'transport',
  MEDICAL_LIAISON: 'medical_liaison',
} as const;

export type VolunteerRoleType = (typeof VolunteerRoleType)[keyof typeof VolunteerRoleType];

/** Route node types */
export const RouteNodeType = {
  ENTRANCE: 'entrance',
  GATE: 'gate',
  CORRIDOR: 'corridor',
  SECTION: 'section',
  LIFT: 'lift',
  RAMP: 'ramp',
  STAIRS: 'stairs',
  RESTROOM: 'restroom',
  FOOD: 'food',
  MEDICAL: 'medical',
  EXIT: 'exit',
  TRANSIT: 'transit',
} as const;

export type RouteNodeType = (typeof RouteNodeType)[keyof typeof RouteNodeType];

/** Accessibility profile flags */
export const AccessibilityFlag = {
  STEP_FREE: 'step_free',
  WHEELCHAIR: 'wheelchair',
  LOW_VISION: 'low_vision',
  HEARING_IMPAIRED: 'hearing_impaired',
  LOW_SENSORY: 'low_sensory',
  QUIET_ZONE: 'quiet_zone',
} as const;

export type AccessibilityFlag = (typeof AccessibilityFlag)[keyof typeof AccessibilityFlag];

/** Supported languages */
export const SupportedLanguage = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  AR: 'ar',
  PT: 'pt',
  DE: 'de',
  JA: 'ja',
  ZH: 'zh',
} as const;

export type SupportedLanguage = (typeof SupportedLanguage)[keyof typeof SupportedLanguage];

/** Risk levels for AI recommendations */
export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];
