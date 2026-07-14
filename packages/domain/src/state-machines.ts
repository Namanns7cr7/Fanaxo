/**
 * Lifecycle state machines (spec 04 §6.2, spec 03 §7).
 *
 * A single generic transition engine drives every lifecycle so the rules
 * live in data, are exhaustively testable, and cannot be duplicated across
 * features. Invalid transitions are expected failures, returned as Results.
 */

import {
  CongestionState,
  GateStatus,
  IncidentStatus,
  RecommendationStatus,
  TaskStatus,
} from '@fanaxo/contracts';

import { DomainErrorCode, domainError, type DomainError } from './errors.js';
import { err, ok, type Result } from './result.js';

/** Map of state -> states reachable from it. Anything absent is denied. */
export type TransitionMap<S extends string> = Readonly<Record<S, readonly S[]>>;

export function canTransition<S extends string>(map: TransitionMap<S>, from: S, to: S): boolean {
  return map[from].includes(to);
}

export function transition<S extends string>(
  map: TransitionMap<S>,
  from: S,
  to: S,
): Result<S, DomainError> {
  if (!canTransition(map, from, to)) {
    return err(
      domainError(DomainErrorCode.INVALID_TRANSITION, `Cannot move from ${from} to ${to}`, {
        from,
        to,
      }),
    );
  }
  return ok(to);
}

// ---------------------------------------------------------------------------
// Incident: reported -> triaged -> assigned -> acknowledged -> responding
//           -> resolved -> reopened
// ---------------------------------------------------------------------------

export const incidentTransitions: TransitionMap<IncidentStatus> = {
  [IncidentStatus.REPORTED]: [IncidentStatus.TRIAGED, IncidentStatus.ASSIGNED],
  [IncidentStatus.TRIAGED]: [IncidentStatus.ASSIGNED],
  [IncidentStatus.ASSIGNED]: [IncidentStatus.ACKNOWLEDGED],
  [IncidentStatus.ACKNOWLEDGED]: [IncidentStatus.RESPONDING],
  [IncidentStatus.RESPONDING]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.REOPENED],
  [IncidentStatus.REOPENED]: [IncidentStatus.ASSIGNED, IncidentStatus.TRIAGED],
};

// ---------------------------------------------------------------------------
// Volunteer task: created -> delivered -> accepted -> in_progress
//                 -> completed | escalated | cancelled
// ---------------------------------------------------------------------------

export const taskTransitions: TransitionMap<TaskStatus> = {
  [TaskStatus.CREATED]: [TaskStatus.DELIVERED, TaskStatus.CANCELLED],
  [TaskStatus.DELIVERED]: [TaskStatus.ACCEPTED, TaskStatus.CANCELLED],
  [TaskStatus.ACCEPTED]: [TaskStatus.IN_PROGRESS, TaskStatus.ESCALATED, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.ESCALATED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.ESCALATED]: [TaskStatus.ACCEPTED, TaskStatus.CANCELLED],
  [TaskStatus.CANCELLED]: [],
};

// ---------------------------------------------------------------------------
// AI recommendation: generated -> awaiting_approval -> approved | modified
//                    | rejected -> executing -> measured -> closed
// ---------------------------------------------------------------------------

export const recommendationTransitions: TransitionMap<RecommendationStatus> = {
  [RecommendationStatus.GENERATED]: [RecommendationStatus.AWAITING_APPROVAL],
  [RecommendationStatus.AWAITING_APPROVAL]: [
    RecommendationStatus.APPROVED,
    RecommendationStatus.MODIFIED,
    RecommendationStatus.REJECTED,
  ],
  [RecommendationStatus.APPROVED]: [RecommendationStatus.EXECUTING],
  [RecommendationStatus.MODIFIED]: [RecommendationStatus.EXECUTING],
  [RecommendationStatus.REJECTED]: [RecommendationStatus.CLOSED],
  [RecommendationStatus.EXECUTING]: [RecommendationStatus.MEASURED],
  [RecommendationStatus.MEASURED]: [RecommendationStatus.CLOSED],
  [RecommendationStatus.CLOSED]: [],
};

// ---------------------------------------------------------------------------
// Gate: open -> restricted -> closed -> reopening -> open
// ---------------------------------------------------------------------------

export const gateTransitions: TransitionMap<GateStatus> = {
  [GateStatus.OPEN]: [GateStatus.RESTRICTED, GateStatus.CLOSED],
  [GateStatus.RESTRICTED]: [GateStatus.OPEN, GateStatus.CLOSED],
  [GateStatus.CLOSED]: [GateStatus.REOPENING],
  [GateStatus.REOPENING]: [GateStatus.OPEN, GateStatus.RESTRICTED],
};

// ---------------------------------------------------------------------------
// Connected Gate C congestion scenario (spec 03 §7)
// ---------------------------------------------------------------------------

const congestionCancellable: readonly CongestionState[] = [CongestionState.CANCELLED];
const congestionEscalatable: readonly CongestionState[] = [CongestionState.ESCALATED];

export const congestionTransitions: TransitionMap<CongestionState> = {
  [CongestionState.NORMAL]: [CongestionState.RISING_DENSITY, ...congestionEscalatable],
  [CongestionState.RISING_DENSITY]: [
    CongestionState.PREDICTED_CONGESTION,
    CongestionState.NORMAL,
    ...congestionEscalatable,
    ...congestionCancellable,
  ],
  [CongestionState.PREDICTED_CONGESTION]: [
    CongestionState.PLAN_PROPOSED,
    CongestionState.RISING_DENSITY,
    ...congestionEscalatable,
    ...congestionCancellable,
  ],
  [CongestionState.PLAN_PROPOSED]: [
    CongestionState.PLAN_APPROVED,
    CongestionState.PREDICTED_CONGESTION,
    ...congestionEscalatable,
    ...congestionCancellable,
  ],
  [CongestionState.PLAN_APPROVED]: [
    CongestionState.EXECUTING,
    ...congestionEscalatable,
    ...congestionCancellable,
  ],
  [CongestionState.EXECUTING]: [
    CongestionState.STABILIZING,
    ...congestionEscalatable,
    ...congestionCancellable,
  ],
  [CongestionState.STABILIZING]: [
    CongestionState.RESOLVED,
    CongestionState.EXECUTING,
    ...congestionEscalatable,
    ...congestionCancellable,
  ],
  [CongestionState.RESOLVED]: [CongestionState.NORMAL],
  [CongestionState.ESCALATED]: [...congestionCancellable],
  [CongestionState.CANCELLED]: [CongestionState.NORMAL],
};

/** Task action names used by the API, mapped to their target status. */
export const taskActionTargets = {
  accept: TaskStatus.ACCEPTED,
  start: TaskStatus.IN_PROGRESS,
  complete: TaskStatus.COMPLETED,
  escalate: TaskStatus.ESCALATED,
  cancel: TaskStatus.CANCELLED,
} as const satisfies Record<string, TaskStatus>;

export type TaskAction = keyof typeof taskActionTargets;

/** Incident action names used by the API, mapped to their target status. */
export const incidentActionTargets = {
  triage: IncidentStatus.TRIAGED,
  assign: IncidentStatus.ASSIGNED,
  acknowledge: IncidentStatus.ACKNOWLEDGED,
  respond: IncidentStatus.RESPONDING,
  resolve: IncidentStatus.RESOLVED,
  reopen: IncidentStatus.REOPENED,
} as const satisfies Record<string, IncidentStatus>;

export type IncidentAction = keyof typeof incidentActionTargets;
