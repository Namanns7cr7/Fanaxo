import { describe, expect, it } from 'vitest';

import { UserRole, VolunteerRoleType, type Actor } from '@fanaxo/contracts';

import { authorize, PolicyAction, type ResourceScope } from './policy.js';

const VENUE_A = '00000000-0000-4000-8000-00000000000a';
const VENUE_B = '00000000-0000-4000-8000-00000000000b';
const FAN_SESSION = '00000000-0000-4000-8000-000000000101';
const VOLUNTEER_USER = '00000000-0000-4000-8000-000000000201';
const OPERATOR_USER = '00000000-0000-4000-8000-000000000301';
const OTHER_USER = '00000000-0000-4000-8000-000000000999';

const fan: Actor = {
  kind: UserRole.FAN,
  sessionId: FAN_SESSION,
  venueId: VENUE_A,
  ticketId: null,
};

const volunteer: Actor = {
  kind: UserRole.VOLUNTEER,
  sessionId: '00000000-0000-4000-8000-000000000202',
  userId: VOLUNTEER_USER,
  venueId: VENUE_A,
  zoneId: '00000000-0000-4000-8000-000000000203',
  roleType: VolunteerRoleType.CROWD_MANAGEMENT,
  displayName: 'Demo Volunteer',
};

const operator: Actor = {
  kind: UserRole.OPERATOR,
  sessionId: '00000000-0000-4000-8000-000000000302',
  userId: OPERATOR_USER,
  venueId: VENUE_A,
  displayName: 'Demo Operator',
};

const inVenue: ResourceScope = { venueId: VENUE_A };

describe('venue scoping', () => {
  it('denies every action outside the actor venue, even for operators', () => {
    for (const action of Object.values(PolicyAction)) {
      const decision = authorize(operator, action, { venueId: VENUE_B });
      expect(decision.allowed, `${action} cross-venue`).toBe(false);
      expect(decision.reason).toBe('venue_scope_mismatch');
    }
  });
});

describe('operator-only actions', () => {
  const operatorOnly = [
    PolicyAction.TASK_READ_ALL,
    PolicyAction.TASK_ASSIGN,
    PolicyAction.GATE_STATE_CHANGE,
    PolicyAction.RECOMMENDATION_DECIDE,
    PolicyAction.NOTIFICATION_CREATE,
    PolicyAction.OPERATOR_SNAPSHOT_READ,
    PolicyAction.REPORTS_READ,
    PolicyAction.SIMULATION_CONTROL,
  ] as const;

  it.each(operatorOnly)('%s allows operators and denies fans and volunteers', (action) => {
    expect(authorize(operator, action, inVenue).allowed).toBe(true);
    expect(authorize(volunteer, action, inVenue).allowed).toBe(false);
    expect(authorize(fan, action, inVenue).allowed).toBe(false);
  });
});

describe('fan session ownership', () => {
  it('allows a fan to read and update their own context', () => {
    const own: ResourceScope = { venueId: VENUE_A, ownerId: FAN_SESSION };
    expect(authorize(fan, PolicyAction.FAN_CONTEXT_READ, own).allowed).toBe(true);
    expect(authorize(fan, PolicyAction.FAN_PREFERENCES_UPDATE, own).allowed).toBe(true);
  });

  it('denies a fan reading another fan session (IDOR)', () => {
    const foreign: ResourceScope = { venueId: VENUE_A, ownerId: OTHER_USER };
    const decision = authorize(fan, PolicyAction.FAN_CONTEXT_READ, foreign);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('not_resource_owner');
  });

  it('denies staff roles using fan-session endpoints', () => {
    expect(authorize(volunteer, PolicyAction.FAN_CONTEXT_READ, inVenue).allowed).toBe(false);
    expect(authorize(operator, PolicyAction.FAN_PREFERENCES_UPDATE, inVenue).allowed).toBe(false);
  });
});

describe('reporting actions', () => {
  it('allows all roles to create incidents and assistance requests', () => {
    for (const actor of [fan, volunteer, operator]) {
      expect(authorize(actor, PolicyAction.INCIDENT_CREATE, inVenue).allowed).toBe(true);
      expect(authorize(actor, PolicyAction.ASSISTANCE_CREATE, inVenue).allowed).toBe(true);
    }
  });
});

describe('task update assignment rules', () => {
  it('allows the assigned volunteer to update their task', () => {
    const assigned: ResourceScope = { venueId: VENUE_A, assigneeId: VOLUNTEER_USER };
    expect(authorize(volunteer, PolicyAction.TASK_UPDATE, assigned).allowed).toBe(true);
  });

  it("denies a volunteer updating someone else's task (IDOR)", () => {
    const foreign: ResourceScope = { venueId: VENUE_A, assigneeId: OTHER_USER };
    const decision = authorize(volunteer, PolicyAction.TASK_UPDATE, foreign);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('volunteer_not_assigned');
  });

  it('denies a volunteer updating an unassigned task', () => {
    expect(authorize(volunteer, PolicyAction.TASK_UPDATE, inVenue).allowed).toBe(false);
  });

  it('allows operators to update any venue task and denies fans', () => {
    expect(authorize(operator, PolicyAction.TASK_UPDATE, inVenue).allowed).toBe(true);
    expect(authorize(fan, PolicyAction.TASK_UPDATE, inVenue).allowed).toBe(false);
  });
});

describe('incident status updates', () => {
  it('allows the assigned volunteer and operators; denies others', () => {
    const assigned: ResourceScope = { venueId: VENUE_A, assigneeId: VOLUNTEER_USER };
    expect(authorize(volunteer, PolicyAction.INCIDENT_STATUS_UPDATE, assigned).allowed).toBe(true);
    expect(authorize(operator, PolicyAction.INCIDENT_STATUS_UPDATE, inVenue).allowed).toBe(true);
    expect(authorize(fan, PolicyAction.INCIDENT_STATUS_UPDATE, assigned).allowed).toBe(false);
    expect(
      authorize(volunteer, PolicyAction.INCIDENT_STATUS_UPDATE, {
        venueId: VENUE_A,
        assigneeId: OTHER_USER,
      }).allowed,
    ).toBe(false);
  });
});

describe('task reads', () => {
  it('lets volunteers read own tasks and operators read venue tasks', () => {
    expect(authorize(volunteer, PolicyAction.TASK_READ_OWN, inVenue).allowed).toBe(true);
    expect(authorize(operator, PolicyAction.TASK_READ_OWN, inVenue).allowed).toBe(true);
    expect(authorize(fan, PolicyAction.TASK_READ_OWN, inVenue).allowed).toBe(false);
  });
});

describe('audit reads', () => {
  it('allows operators venue-wide audit access', () => {
    expect(authorize(operator, PolicyAction.AUDIT_READ, inVenue).allowed).toBe(true);
  });

  it('allows fans and volunteers to read only their own activity', () => {
    expect(
      authorize(fan, PolicyAction.AUDIT_READ, { venueId: VENUE_A, ownerId: FAN_SESSION }).allowed,
    ).toBe(true);
    expect(
      authorize(volunteer, PolicyAction.AUDIT_READ, {
        venueId: VENUE_A,
        ownerId: VOLUNTEER_USER,
      }).allowed,
    ).toBe(true);
    expect(
      authorize(fan, PolicyAction.AUDIT_READ, { venueId: VENUE_A, ownerId: OTHER_USER }).allowed,
    ).toBe(false);
    expect(authorize(volunteer, PolicyAction.AUDIT_READ, inVenue).allowed).toBe(false);
  });
});
