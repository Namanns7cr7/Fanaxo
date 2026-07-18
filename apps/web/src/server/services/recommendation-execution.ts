/**
 * Execute an approved AI recommendation's actions (spec 03 §7 EXECUTING).
 *
 * Each proposed action runs through the same guarded service an operator
 * would use by hand — so authorization, state machines, audit, versioning,
 * and realtime events all apply. This is what makes the connected Gate C
 * scenario land in every portal: one approval fans out to gate changes,
 * volunteer tasks, notifications, and fresh fan routes.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import type { Actor, ProposedAction } from '@fanaxo/contracts';
import { gateStates } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { getDb } from '../db';
import { pushFanRouteUpdates } from './fan-context';
import { patchGateState } from './gates';
import { createNotification } from './notifications';
import { assignTask } from './tasks';

export interface ExecutionSummary {
  readonly gateChanges: number;
  readonly tasksCreated: number;
  readonly notificationsSent: number;
  readonly fansRerouted: boolean;
}

/** Run every action in an approved plan; failures of one action don't abort the rest. */
export function executeRecommendationActions(
  actor: Actor,
  actions: readonly ProposedAction[],
  correlationId: string,
): ExecutionSummary {
  let gateChanges = 0;
  let tasksCreated = 0;
  let notificationsSent = 0;
  let fansRerouted = false;

  for (const action of actions) {
    switch (action.type) {
      case 'restrict_gate': {
        const current = getDb()
          .db.select()
          .from(gateStates)
          .where(eq(gateStates.gateId, action.gateId))
          .get();
        if (current !== undefined) {
          const result = patchGateState(
            actor,
            action.gateId,
            {
              status: action.newStatus,
              reason: action.reason,
              confirm: true,
              expectedVersion: current.version,
            },
            correlationId,
          );
          if (result.ok) {
            gateChanges += 1;
          }
        }
        break;
      }
      case 'assign_volunteers': {
        for (const volunteerId of action.volunteerIds) {
          const result = assignTask(
            actor,
            {
              assigneeId: volunteerId,
              priority: 'high',
              title: 'Crowd redirect support',
              instructions: action.instructions,
              zoneId: action.zoneId,
              clientRequestId: randomUUID(),
            },
            correlationId,
          );
          if (result.ok) {
            tasksCreated += 1;
          }
        }
        break;
      }
      case 'draft_notification': {
        const result = createNotification(
          actor,
          {
            audience: action.audience,
            ...(action.zoneId === undefined ? {} : { zoneId: action.zoneId }),
            message: action.message,
            languages: action.languages,
            clientRequestId: randomUUID(),
          },
          correlationId,
        );
        if (result.ok) {
          notificationsSent += result.value.length;
        }
        break;
      }
      case 'redirect_fans': {
        // The gate change (if any) already reshaped the graph; make sure every
        // active fan session gets a freshly recomputed route either way.
        pushFanRouteUpdates(actor.venueId, correlationId, 'congestion');
        fansRerouted = true;
        break;
      }
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  }

  return { gateChanges, tasksCreated, notificationsSent, fansRerouted };
}
