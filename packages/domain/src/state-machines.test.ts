import { describe, expect, it } from 'vitest';

import {
  CongestionState,
  GateStatus,
  IncidentStatus,
  RecommendationStatus,
  TaskStatus,
} from '@fanaxo/contracts';

import {
  canTransition,
  congestionTransitions,
  gateTransitions,
  incidentActionTargets,
  incidentTransitions,
  recommendationTransitions,
  taskActionTargets,
  taskTransitions,
  transition,
} from './state-machines.js';

describe('incident state machine', () => {
  it('follows the specified happy path', () => {
    const path = [
      IncidentStatus.REPORTED,
      IncidentStatus.TRIAGED,
      IncidentStatus.ASSIGNED,
      IncidentStatus.ACKNOWLEDGED,
      IncidentStatus.RESPONDING,
      IncidentStatus.RESOLVED,
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      if (from === undefined || to === undefined) throw new Error('bad fixture');
      expect(canTransition(incidentTransitions, from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('allows reopening a resolved incident', () => {
    expect(
      canTransition(incidentTransitions, IncidentStatus.RESOLVED, IncidentStatus.REOPENED),
    ).toBe(true);
  });

  it('rejects skipping directly from reported to resolved', () => {
    const result = transition(
      incidentTransitions,
      IncidentStatus.REPORTED,
      IncidentStatus.RESOLVED,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_transition');
    }
  });

  it('covers every incident status in the transition map', () => {
    for (const status of Object.values(IncidentStatus)) {
      expect(incidentTransitions[status]).toBeDefined();
    }
  });

  it('maps every API incident action to a valid status', () => {
    expect(incidentActionTargets.resolve).toBe(IncidentStatus.RESOLVED);
    expect(incidentActionTargets.triage).toBe(IncidentStatus.TRIAGED);
  });
});

describe('task state machine', () => {
  it('follows created -> delivered -> accepted -> in_progress -> completed', () => {
    const path = [
      TaskStatus.CREATED,
      TaskStatus.DELIVERED,
      TaskStatus.ACCEPTED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      if (from === undefined || to === undefined) throw new Error('bad fixture');
      expect(canTransition(taskTransitions, from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('treats completed and cancelled as terminal', () => {
    for (const target of Object.values(TaskStatus)) {
      expect(canTransition(taskTransitions, TaskStatus.COMPLETED, target)).toBe(false);
      expect(canTransition(taskTransitions, TaskStatus.CANCELLED, target)).toBe(false);
    }
  });

  it('allows escalation from accepted and in_progress only', () => {
    expect(canTransition(taskTransitions, TaskStatus.ACCEPTED, TaskStatus.ESCALATED)).toBe(true);
    expect(canTransition(taskTransitions, TaskStatus.IN_PROGRESS, TaskStatus.ESCALATED)).toBe(true);
    expect(canTransition(taskTransitions, TaskStatus.CREATED, TaskStatus.ESCALATED)).toBe(false);
    expect(canTransition(taskTransitions, TaskStatus.DELIVERED, TaskStatus.ESCALATED)).toBe(false);
  });

  it('maps every API task action to its target status', () => {
    expect(taskActionTargets.accept).toBe(TaskStatus.ACCEPTED);
    expect(taskActionTargets.start).toBe(TaskStatus.IN_PROGRESS);
    expect(taskActionTargets.complete).toBe(TaskStatus.COMPLETED);
    expect(taskActionTargets.escalate).toBe(TaskStatus.ESCALATED);
    expect(taskActionTargets.cancel).toBe(TaskStatus.CANCELLED);
  });
});

describe('recommendation state machine', () => {
  it('requires approval before execution', () => {
    expect(
      canTransition(
        recommendationTransitions,
        RecommendationStatus.GENERATED,
        RecommendationStatus.EXECUTING,
      ),
    ).toBe(false);
    expect(
      canTransition(
        recommendationTransitions,
        RecommendationStatus.AWAITING_APPROVAL,
        RecommendationStatus.APPROVED,
      ),
    ).toBe(true);
    expect(
      canTransition(
        recommendationTransitions,
        RecommendationStatus.APPROVED,
        RecommendationStatus.EXECUTING,
      ),
    ).toBe(true);
  });

  it('closes rejected recommendations without execution', () => {
    expect(
      canTransition(
        recommendationTransitions,
        RecommendationStatus.REJECTED,
        RecommendationStatus.EXECUTING,
      ),
    ).toBe(false);
    expect(
      canTransition(
        recommendationTransitions,
        RecommendationStatus.REJECTED,
        RecommendationStatus.CLOSED,
      ),
    ).toBe(true);
  });
});

describe('gate state machine', () => {
  it('cycles open -> restricted -> closed -> reopening -> open', () => {
    expect(canTransition(gateTransitions, GateStatus.OPEN, GateStatus.RESTRICTED)).toBe(true);
    expect(canTransition(gateTransitions, GateStatus.RESTRICTED, GateStatus.CLOSED)).toBe(true);
    expect(canTransition(gateTransitions, GateStatus.CLOSED, GateStatus.REOPENING)).toBe(true);
    expect(canTransition(gateTransitions, GateStatus.REOPENING, GateStatus.OPEN)).toBe(true);
  });

  it('never jumps from closed straight to open', () => {
    expect(canTransition(gateTransitions, GateStatus.CLOSED, GateStatus.OPEN)).toBe(false);
  });
});

describe('congestion scenario state machine', () => {
  it('follows the connected demo path end to end', () => {
    const path = [
      CongestionState.NORMAL,
      CongestionState.RISING_DENSITY,
      CongestionState.PREDICTED_CONGESTION,
      CongestionState.PLAN_PROPOSED,
      CongestionState.PLAN_APPROVED,
      CongestionState.EXECUTING,
      CongestionState.STABILIZING,
      CongestionState.RESOLVED,
      CongestionState.NORMAL,
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      if (from === undefined || to === undefined) throw new Error('bad fixture');
      expect(canTransition(congestionTransitions, from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('allows escalation from any non-final state', () => {
    const nonFinal = [
      CongestionState.NORMAL,
      CongestionState.RISING_DENSITY,
      CongestionState.PREDICTED_CONGESTION,
      CongestionState.PLAN_PROPOSED,
      CongestionState.PLAN_APPROVED,
      CongestionState.EXECUTING,
      CongestionState.STABILIZING,
    ] as const;
    for (const state of nonFinal) {
      expect(
        canTransition(congestionTransitions, state, CongestionState.ESCALATED),
        `${state} -> escalated`,
      ).toBe(true);
    }
  });

  it('does not allow approving a plan that was never proposed', () => {
    expect(
      canTransition(
        congestionTransitions,
        CongestionState.RISING_DENSITY,
        CongestionState.PLAN_APPROVED,
      ),
    ).toBe(false);
  });
});
