/**
 * Authorization policy — deny by default (spec 07 §4).
 *
 * Every protected server operation calls `authorize` with the session-derived
 * Actor and the resource scope. Client-supplied role, venue, or ownership
 * fields never reach this function. The decision carries a reason string so
 * denials are explainable in audit logs without leaking internals to users.
 */

import { UserRole, type Actor } from '@fanaxo/contracts';

/** Every privileged action in the system. Adding one forces a policy entry. */
export const PolicyAction = {
  FAN_CONTEXT_READ: 'fan.context.read',
  FAN_PREFERENCES_UPDATE: 'fan.preferences.update',
  ASSISTANCE_CREATE: 'assistance.create',
  INCIDENT_CREATE: 'incident.create',
  INCIDENT_STATUS_UPDATE: 'incident.status.update',
  TASK_READ_OWN: 'task.read.own',
  TASK_READ_ALL: 'task.read.all',
  TASK_UPDATE: 'task.update',
  TASK_ASSIGN: 'task.assign',
  GATE_STATE_CHANGE: 'gate.state.change',
  RECOMMENDATION_DECIDE: 'recommendation.decide',
  NOTIFICATION_CREATE: 'notification.create',
  OPERATOR_SNAPSHOT_READ: 'operator.snapshot.read',
  REPORTS_READ: 'reports.read',
  AUDIT_READ: 'audit.read',
  SIMULATION_CONTROL: 'simulation.control',
} as const;

export type PolicyAction = (typeof PolicyAction)[keyof typeof PolicyAction];

export interface ResourceScope {
  /** Venue the target resource belongs to. Required for every decision. */
  readonly venueId: string;
  /** Session/user that owns the resource, when ownership applies. */
  readonly ownerId?: string;
  /** Assignee of the resource (tasks/incidents), when assignment applies. */
  readonly assigneeId?: string;
}

export interface PolicyDecision {
  readonly allowed: boolean;
  /** Audit-safe explanation; never contains user data. */
  readonly reason: string;
}

function allow(reason: string): PolicyDecision {
  return { allowed: true, reason };
}

function deny(reason: string): PolicyDecision {
  return { allowed: false, reason };
}

function requireVenue(actor: Actor, resource: ResourceScope): PolicyDecision | null {
  if (actor.venueId !== resource.venueId) {
    return deny('venue_scope_mismatch');
  }
  return null;
}

type PolicyHandler = (actor: Actor, resource: ResourceScope) => PolicyDecision;

/** Fan-session endpoints: the fan must own the target session. */
const fanSessionOwnership: PolicyHandler = (actor, resource) => {
  if (actor.kind !== UserRole.FAN) {
    return deny('fan_session_required');
  }
  if (resource.ownerId !== undefined && resource.ownerId !== actor.sessionId) {
    return deny('not_resource_owner');
  }
  return allow('fan_owns_session');
};

/**
 * All three roles may report; fans get a restricted category set,
 * enforced by the request schema in the incident service.
 */
const anyRoleMayReport: PolicyHandler = (actor) => allow(`${actor.kind}_may_report`);

/** Mutations on assigned work: the assigned volunteer or any venue operator. */
const assignedVolunteerOrOperator: PolicyHandler = (actor, resource) => {
  if (actor.kind === UserRole.OPERATOR) {
    return allow('operator_venue_scope');
  }
  if (actor.kind !== UserRole.VOLUNTEER) {
    return deny('staff_role_required');
  }
  if (resource.assigneeId !== undefined && resource.assigneeId === actor.userId) {
    return allow('assigned_volunteer');
  }
  return deny('volunteer_not_assigned');
};

const staffTaskRead: PolicyHandler = (actor) => {
  if (actor.kind === UserRole.VOLUNTEER) {
    return allow('volunteer_reads_own_tasks');
  }
  if (actor.kind === UserRole.OPERATOR) {
    return allow('operator_venue_scope');
  }
  return deny('role_cannot_read_tasks');
};

const operatorOnly: PolicyHandler = (actor) =>
  actor.kind === UserRole.OPERATOR ? allow('operator_venue_scope') : deny('operator_role_required');

/** Operators read venue-wide; fans and volunteers read only their own activity. */
const auditRead: PolicyHandler = (actor, resource) => {
  if (actor.kind === UserRole.OPERATOR) {
    return allow('operator_venue_scope');
  }
  if (resource.ownerId !== undefined) {
    const selfId = actor.kind === UserRole.FAN ? actor.sessionId : actor.userId;
    if (resource.ownerId === selfId) {
      return allow('own_activity_scope');
    }
  }
  return deny('audit_scope_denied');
};

/**
 * Deny-by-default policy table. The Record type forces an entry for every
 * PolicyAction, so a new action cannot ship without an explicit rule.
 */
const policyHandlers: Record<PolicyAction, PolicyHandler> = {
  [PolicyAction.FAN_CONTEXT_READ]: fanSessionOwnership,
  [PolicyAction.FAN_PREFERENCES_UPDATE]: fanSessionOwnership,
  [PolicyAction.ASSISTANCE_CREATE]: anyRoleMayReport,
  [PolicyAction.INCIDENT_CREATE]: anyRoleMayReport,
  [PolicyAction.INCIDENT_STATUS_UPDATE]: assignedVolunteerOrOperator,
  [PolicyAction.TASK_READ_OWN]: staffTaskRead,
  [PolicyAction.TASK_READ_ALL]: operatorOnly,
  [PolicyAction.TASK_UPDATE]: assignedVolunteerOrOperator,
  [PolicyAction.TASK_ASSIGN]: operatorOnly,
  [PolicyAction.GATE_STATE_CHANGE]: operatorOnly,
  [PolicyAction.RECOMMENDATION_DECIDE]: operatorOnly,
  [PolicyAction.NOTIFICATION_CREATE]: operatorOnly,
  [PolicyAction.OPERATOR_SNAPSHOT_READ]: operatorOnly,
  [PolicyAction.REPORTS_READ]: operatorOnly,
  [PolicyAction.AUDIT_READ]: auditRead,
  [PolicyAction.SIMULATION_CONTROL]: operatorOnly,
};

/** Central authorization decision: venue scope first, then the action rule. */
export function authorize(
  actor: Actor,
  action: PolicyAction,
  resource: ResourceScope,
): PolicyDecision {
  const venueDenial = requireVenue(actor, resource);
  if (venueDenial !== null) {
    return venueDenial;
  }
  return policyHandlers[action](actor, resource);
}
