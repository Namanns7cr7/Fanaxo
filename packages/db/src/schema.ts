/**
 * Drizzle schema — SQLite dialect (ADR-006).
 *
 * Column shapes mirror @fanaxo/contracts entities one-to-one; JSON columns
 * hold only value objects that are re-validated on read. Version integers
 * drive optimistic concurrency on every mutable operational aggregate.
 */

import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    role: text('role', { enum: ['fan', 'volunteer', 'operator'] }).notNull(),
    displayName: text('display_name').notNull(),
    locale: text('locale').notNull().default('en'),
    status: text('status', { enum: ['active', 'inactive', 'suspended'] })
      .notNull()
      .default('active'),
    /** Operator login identity (demo). Null for volunteers/fans. */
    email: text('email'),
    /** scrypt hash, never plaintext. Null when the role uses badge+OTP. */
    passwordHash: text('password_hash'),
    /** Volunteer badge identity (demo). */
    badgeId: text('badge_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_badge_unique').on(table.badgeId),
  ],
);

// ---------------------------------------------------------------------------
// Venue topology
// ---------------------------------------------------------------------------

export const venues = sqliteTable('venues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  status: text('status', { enum: ['active', 'inactive', 'maintenance'] })
    .notNull()
    .default('active'),
  capacity: integer('capacity').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const zones = sqliteTable(
  'zones',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    name: text('name').notNull(),
    type: text('type', {
      enum: ['gate', 'concourse', 'section', 'facility', 'transport', 'medical', 'corridor'],
    }).notNull(),
    capacity: integer('capacity').notNull(),
    x: real('x').notNull(),
    y: real('y').notNull(),
    width: real('width'),
    height: real('height'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('zones_venue_idx').on(table.venueId)],
);

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  venueId: text('venue_id')
    .notNull()
    .references(() => venues.id),
  homeLabel: text('home_label').notNull(),
  awayLabel: text('away_label').notNull(),
  startsAt: text('starts_at').notNull(),
  status: text('status', {
    enum: ['scheduled', 'gates_open', 'in_progress', 'halftime', 'completed', 'postponed'],
  }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ---------------------------------------------------------------------------
// Tickets and sessions
// ---------------------------------------------------------------------------

export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    gateId: text('gate_id')
      .notNull()
      .references(() => zones.id),
    section: text('section').notNull(),
    row: text('row').notNull(),
    seat: text('seat').notNull(),
    /** One-way hash of the opaque ticket token; raw token never stored. */
    tokenHash: text('token_hash').notNull(),
    status: text('status', { enum: ['valid', 'used', 'expired', 'invalid', 'revoked'] })
      .notNull()
      .default('valid'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('tickets_token_hash_unique').on(table.tokenHash),
    uniqueIndex('tickets_match_seat_unique').on(
      table.matchId,
      table.section,
      table.row,
      table.seat,
    ),
  ],
);

export const fanSessions = sqliteTable(
  'fan_sessions',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id').references(() => tickets.id),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    /** Hash of the opaque cookie token; a DB leak cannot replay sessions. */
    tokenHash: text('token_hash').notNull(),
    locale: text('locale').notNull().default('en'),
    /** JSON AccessibilityProfile; validated on read. */
    accessibilityProfile: text('accessibility_profile', { mode: 'json' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('fan_sessions_token_unique').on(table.tokenHash)],
);

export const staffSessions = sqliteTable(
  'staff_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', { enum: ['volunteer', 'operator'] }).notNull(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('staff_sessions_token_unique').on(table.tokenHash)],
);

export const volunteerProfiles = sqliteTable('volunteer_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  venueId: text('venue_id')
    .notNull()
    .references(() => venues.id),
  roleType: text('role_type', {
    enum: ['fan_support', 'crowd_management', 'accessibility', 'transport', 'medical_liaison'],
  }).notNull(),
  zoneId: text('zone_id')
    .notNull()
    .references(() => zones.id),
  shiftStart: text('shift_start').notNull(),
  shiftEnd: text('shift_end').notNull(),
  status: text('status', { enum: ['available', 'busy', 'off_duty', 'on_break'] })
    .notNull()
    .default('available'),
  displayName: text('display_name').notNull(),
});

// ---------------------------------------------------------------------------
// Live operational state
// ---------------------------------------------------------------------------

export const gateStates = sqliteTable('gate_states', {
  gateId: text('gate_id')
    .primaryKey()
    .references(() => zones.id),
  venueId: text('venue_id')
    .notNull()
    .references(() => venues.id),
  name: text('name').notNull(),
  status: text('status', { enum: ['open', 'restricted', 'closed', 'reopening'] }).notNull(),
  queueMinutes: real('queue_minutes').notNull().default(0),
  throughput: integer('throughput').notNull().default(0),
  currentCount: integer('current_count').notNull().default(0),
  capacity: integer('capacity').notNull(),
  version: integer('version').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const crowdSnapshots = sqliteTable(
  'crowd_snapshots',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    zoneId: text('zone_id')
      .notNull()
      .references(() => zones.id),
    capturedAt: text('captured_at').notNull(),
    count: integer('count').notNull(),
    density: real('density').notNull(),
    flowRate: real('flow_rate').notNull().default(0),
    confidence: real('confidence').notNull(),
    trend: text('trend', { enum: ['rising', 'stable', 'falling'] }).notNull(),
  },
  (table) => [
    index('crowd_snapshots_zone_time_idx').on(table.venueId, table.zoneId, table.capturedAt),
  ],
);

export const routeNodes = sqliteTable(
  'route_nodes',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    name: text('name').notNull(),
    type: text('type', {
      enum: [
        'entrance',
        'gate',
        'corridor',
        'section',
        'lift',
        'ramp',
        'stairs',
        'restroom',
        'food',
        'medical',
        'exit',
        'transit',
      ],
    }).notNull(),
    x: real('x').notNull(),
    y: real('y').notNull(),
    floor: integer('floor').notNull().default(0),
    zoneId: text('zone_id').references(() => zones.id),
  },
  (table) => [index('route_nodes_venue_idx').on(table.venueId)],
);

export const routeEdges = sqliteTable(
  'route_edges',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    fromNodeId: text('from_node_id')
      .notNull()
      .references(() => routeNodes.id),
    toNodeId: text('to_node_id')
      .notNull()
      .references(() => routeNodes.id),
    distance: real('distance').notNull(),
    expectedTimeSeconds: real('expected_time_seconds').notNull(),
    capacity: integer('capacity').notNull(),
    liveDensity: real('live_density').notNull().default(0),
    status: text('status', { enum: ['open', 'restricted', 'closed'] })
      .notNull()
      .default('open'),
    hasStairs: integer('has_stairs', { mode: 'boolean' }).notNull().default(false),
    hasLift: integer('has_lift', { mode: 'boolean' }).notNull().default(false),
    hasRamp: integer('has_ramp', { mode: 'boolean' }).notNull().default(false),
    isIndoor: integer('is_indoor', { mode: 'boolean' }).notNull().default(true),
    sensoryIntensity: text('sensory_intensity', { enum: ['low', 'medium', 'high'] })
      .notNull()
      .default('medium'),
    slope: real('slope').notNull().default(0),
  },
  (table) => [index('route_edges_from_idx').on(table.venueId, table.fromNodeId)],
);

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export const incidents = sqliteTable(
  'incidents',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    zoneId: text('zone_id')
      .notNull()
      .references(() => zones.id),
    category: text('category', {
      enum: [
        'crowd_congestion',
        'medical',
        'lost_child',
        'security',
        'accessibility',
        'facility',
        'transport',
        'lost_item',
      ],
    }).notNull(),
    severity: text('severity', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
    status: text('status', {
      enum: [
        'reported',
        'triaged',
        'assigned',
        'acknowledged',
        'responding',
        'resolved',
        'reopened',
      ],
    }).notNull(),
    reporterId: text('reporter_id').notNull(),
    reporterRole: text('reporter_role', { enum: ['fan', 'volunteer', 'operator'] }).notNull(),
    summary: text('summary').notNull(),
    description: text('description'),
    assigneeId: text('assignee_id').references(() => users.id),
    attachmentIds: text('attachment_ids', { mode: 'json' }).notNull().default('[]'),
    /** Idempotency key from the client; duplicates return the original. */
    clientRequestId: text('client_request_id').notNull(),
    version: integer('version').notNull().default(0),
    correlationId: text('correlation_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    resolvedAt: text('resolved_at'),
  },
  (table) => [
    uniqueIndex('incidents_client_request_unique').on(table.clientRequestId),
    index('incidents_queue_idx').on(table.venueId, table.status, table.severity, table.createdAt),
  ],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    incidentId: text('incident_id').references(() => incidents.id),
    assigneeId: text('assignee_id').references(() => users.id),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull(),
    status: text('status', {
      enum: [
        'created',
        'delivered',
        'accepted',
        'in_progress',
        'completed',
        'escalated',
        'cancelled',
      ],
    }).notNull(),
    title: text('title').notNull(),
    instructions: text('instructions').notNull(),
    zoneId: text('zone_id')
      .notNull()
      .references(() => zones.id),
    dueAt: text('due_at'),
    clientRequestId: text('client_request_id'),
    version: integer('version').notNull().default(0),
    correlationId: text('correlation_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => [
    uniqueIndex('tasks_client_request_unique').on(table.clientRequestId),
    index('tasks_assignee_idx').on(table.assigneeId, table.status, table.priority, table.createdAt),
  ],
);

export const recommendations = sqliteTable(
  'recommendations',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    contextType: text('context_type', {
      enum: ['congestion', 'incident', 'staffing', 'safety', 'operational'],
    }).notNull(),
    contextId: text('context_id').notNull(),
    summary: text('summary').notNull(),
    riskLevel: text('risk_level', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
    confidence: real('confidence').notNull(),
    /** JSON RecommendationEvidence[]; validated on read. */
    evidence: text('evidence', { mode: 'json' }).notNull(),
    /** JSON ProposedAction[]; validated on read and before execution. */
    proposedActions: text('proposed_actions', { mode: 'json' }).notNull(),
    limitations: text('limitations', { mode: 'json' }).notNull().default('[]'),
    status: text('status', {
      enum: [
        'generated',
        'awaiting_approval',
        'approved',
        'modified',
        'rejected',
        'executing',
        'measured',
        'closed',
      ],
    }).notNull(),
    /** JSON operator decision object once decided. */
    operatorDecision: text('operator_decision', { mode: 'json' }),
    version: integer('version').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('recommendations_venue_idx').on(table.venueId, table.status, table.createdAt)],
);

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    audience: text('audience', {
      enum: ['all_fans', 'zone_fans', 'volunteers', 'operators'],
    }).notNull(),
    zoneId: text('zone_id').references(() => zones.id),
    locale: text('locale').notNull(),
    channel: text('channel', { enum: ['in_app', 'push', 'announcement'] }).notNull(),
    message: text('message').notNull(),
    status: text('status', { enum: ['draft', 'approved', 'sent', 'failed'] }).notNull(),
    clientRequestId: text('client_request_id'),
    sentAt: text('sent_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('notifications_client_request_unique').on(table.clientRequestId)],
);

export const assistanceRequests = sqliteTable(
  'assistance_requests',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    fanSessionId: text('fan_session_id')
      .notNull()
      .references(() => fanSessions.id),
    zoneId: text('zone_id')
      .notNull()
      .references(() => zones.id),
    category: text('category', {
      enum: ['navigation', 'accessibility', 'language', 'medical_nonurgent', 'other'],
    }).notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: ['open', 'acknowledged', 'resolved', 'cancelled'] })
      .notNull()
      .default('open'),
    clientRequestId: text('client_request_id').notNull(),
    taskId: text('task_id').references(() => tasks.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('assistance_client_request_unique').on(table.clientRequestId)],
);

// ---------------------------------------------------------------------------
// Audit (append-only) and scenario state
// ---------------------------------------------------------------------------

export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    actor: text('actor').notNull(),
    actorRole: text('actor_role', { enum: ['fan', 'volunteer', 'operator'] }).notNull(),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id').notNull(),
    beforeHash: text('before_hash'),
    afterHash: text('after_hash'),
    reason: text('reason'),
    correlationId: text('correlation_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('audit_venue_time_idx').on(table.venueId, table.createdAt),
    index('audit_correlation_idx').on(table.venueId, table.correlationId),
  ],
);

export const congestionScenarios = sqliteTable('congestion_scenarios', {
  gateId: text('gate_id')
    .primaryKey()
    .references(() => zones.id),
  venueId: text('venue_id')
    .notNull()
    .references(() => venues.id),
  state: text('state', {
    enum: [
      'normal',
      'rising_density',
      'predicted_congestion',
      'plan_proposed',
      'plan_approved',
      'executing',
      'stabilizing',
      'resolved',
      'escalated',
      'cancelled',
    ],
  }).notNull(),
  arrivalRate: real('arrival_rate').notNull().default(0),
  density: real('density').notNull().default(0),
  threshold: real('threshold').notNull(),
  recommendationId: text('recommendation_id'),
  redirectGateId: text('redirect_gate_id'),
  assignedVolunteerIds: text('assigned_volunteer_ids', { mode: 'json' }).notNull().default('[]'),
  version: integer('version').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
