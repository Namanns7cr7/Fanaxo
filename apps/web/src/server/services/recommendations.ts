/**
 * AI recommendation lifecycle (spec 06 §5, §8).
 *
 * Recommendations are created by the congestion engine, wait for an explicit
 * operator decision, and only then execute their actions — each action runs
 * through the same guarded services an operator would use directly, so
 * policy, state machines, audit, and events apply identically.
 */

import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  AIRecommendationSchema,
  EventType,
  ProposedActionSchema,
  RecommendationStatus,
  type Actor,
  type AIRecommendation,
  type ProposedAction,
  type RecommendationDecision,
} from '@fanaxo/contracts';
import { recommendations } from '@fanaxo/db';
import {
  checkExpectedVersion,
  domainError,
  DomainErrorCode,
  err,
  ok,
  recommendationTransitions,
  transition,
  type DomainError,
  type Result,
} from '@fanaxo/domain';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { writeAudit } from '../audit';
import { getDb } from '../db';
import type { RecommendationDraft } from '../ai/recommendation-provider';
import { publishEvent } from '../realtime/bus';

type RecommendationRow = typeof recommendations.$inferSelect;

const decisionSchema = z
  .object({
    decision: z.enum(['approved', 'modified', 'rejected']),
    reason: z.string(),
    operatorId: z.string().uuid(),
    decidedAt: z.string().datetime(),
  })
  .nullable();

export function rowToRecommendation(row: RecommendationRow): AIRecommendation {
  const operatorDecision = decisionSchema.parse(row.operatorDecision ?? null);
  return AIRecommendationSchema.parse({
    id: row.id,
    venueId: row.venueId,
    contextType: row.contextType,
    contextId: row.contextId,
    summary: row.summary,
    riskLevel: row.riskLevel,
    confidence: row.confidence,
    evidence: row.evidence,
    proposedActions: z.array(ProposedActionSchema).parse(row.proposedActions),
    requiresHumanApproval: true,
    limitations: row.limitations ?? [],
    status: row.status,
    ...(operatorDecision === null ? {} : { operatorDecision }),
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/** Persist a provider draft as an awaiting-approval recommendation. */
export function createRecommendation(
  venueId: string,
  contextType: 'congestion' | 'incident' | 'staffing' | 'safety' | 'operational',
  contextId: string,
  draft: RecommendationDraft,
  correlationId: string,
): AIRecommendation {
  const handle = getDb();
  const now = new Date().toISOString();
  const row: typeof recommendations.$inferInsert = {
    id: randomUUID(),
    venueId,
    contextType,
    contextId,
    summary: draft.summary,
    riskLevel: draft.riskLevel,
    confidence: draft.confidence,
    evidence: draft.evidence,
    proposedActions: draft.proposedActions,
    limitations: [...draft.limitations, `model:${draft.modelLabel}`].slice(0, 5),
    status: RecommendationStatus.AWAITING_APPROVAL,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  handle.db.insert(recommendations).values(row).run();

  const recommendation = rowToRecommendation({
    ...row,
    operatorDecision: null,
  } as RecommendationRow);
  publishEvent({
    eventType: EventType.RECOMMENDATION_CREATED,
    venueId,
    aggregateId: recommendation.id,
    aggregateVersion: recommendation.version,
    correlationId,
    payload: recommendation,
  });
  return recommendation;
}

export interface DecisionOutcome {
  readonly recommendation: AIRecommendation;
  /** Actions the caller must now execute (empty when rejected). */
  readonly actionsToExecute: readonly ProposedAction[];
  readonly correlationId: string;
}

/**
 * Record an operator decision. Approved/modified plans move to `executing`
 * and return the action list; the caller executes them through the guarded
 * services and then marks the recommendation measured/closed.
 */
export function decideRecommendation(
  actor: Actor,
  recommendationId: string,
  input: RecommendationDecision,
): Result<DecisionOutcome, DomainError> {
  const handle = getDb();
  const row = handle.db
    .select()
    .from(recommendations)
    .where(eq(recommendations.id, recommendationId))
    .get();
  if (row === undefined || row.venueId !== actor.venueId) {
    return err(domainError(DomainErrorCode.NOT_FOUND, 'Recommendation not found'));
  }

  const versionCheck = checkExpectedVersion(row.version, input.expectedVersion);
  if (!versionCheck.ok) {
    return versionCheck;
  }
  const decisionStatus: RecommendationStatus =
    input.decision === 'approved'
      ? RecommendationStatus.APPROVED
      : input.decision === 'modified'
        ? RecommendationStatus.MODIFIED
        : RecommendationStatus.REJECTED;
  const transitionResult = transition(recommendationTransitions, row.status, decisionStatus);
  if (!transitionResult.ok) {
    return transitionResult;
  }

  const correlationId = randomUUID();
  const now = new Date().toISOString();
  const operatorId = actor.kind === 'fan' ? actor.sessionId : actor.userId;
  const finalActions =
    input.decision === 'modified' && input.modifiedActions !== undefined
      ? input.modifiedActions
      : z.array(ProposedActionSchema).parse(row.proposedActions);
  // Approved/modified plans immediately enter execution.
  const nextStatus =
    input.decision === 'rejected' ? RecommendationStatus.REJECTED : RecommendationStatus.EXECUTING;
  const nextVersion = versionCheck.value;

  const decisionRecord = {
    decision: input.decision,
    reason: input.reason,
    operatorId,
    decidedAt: now,
  };

  const updateTxn = handle.sqlite.transaction(() => {
    handle.db
      .update(recommendations)
      .set({
        status: nextStatus,
        operatorDecision: decisionRecord,
        proposedActions: finalActions,
        version: nextVersion,
        updatedAt: now,
      })
      .where(eq(recommendations.id, recommendationId))
      .run();
    writeAudit({
      actor,
      action: `recommendation.${input.decision}`,
      resource: 'recommendation',
      resourceId: recommendationId,
      venueId: actor.venueId,
      correlationId,
      reason: input.reason,
      before: { status: row.status, version: row.version },
      after: { status: nextStatus, version: nextVersion },
    });
  });
  updateTxn();

  const updated = rowToRecommendation({
    ...row,
    status: nextStatus,
    operatorDecision: decisionRecord,
    proposedActions: finalActions,
    version: nextVersion,
    updatedAt: now,
  });

  publishEvent({
    eventType: EventType.RECOMMENDATION_DECISION_RECORDED,
    venueId: actor.venueId,
    aggregateId: recommendationId,
    aggregateVersion: nextVersion,
    correlationId,
    payload: updated,
  });

  return ok({
    recommendation: updated,
    actionsToExecute: input.decision === 'rejected' ? [] : finalActions,
    correlationId,
  });
}

/** Advance an executing recommendation once its actions have run/measured. */
export function progressRecommendation(
  venueId: string,
  recommendationId: string,
  to: 'measured' | 'closed',
  correlationId: string,
): void {
  const handle = getDb();
  const row = handle.db
    .select()
    .from(recommendations)
    .where(eq(recommendations.id, recommendationId))
    .get();
  if (row === undefined || row.venueId !== venueId) {
    return;
  }
  const target =
    to === 'measured' ? RecommendationStatus.MEASURED : RecommendationStatus.CLOSED;
  if (!transition(recommendationTransitions, row.status, target).ok) {
    return;
  }
  const now = new Date().toISOString();
  handle.db
    .update(recommendations)
    .set({ status: target, version: row.version + 1, updatedAt: now })
    .where(eq(recommendations.id, recommendationId))
    .run();
  publishEvent({
    eventType: EventType.RECOMMENDATION_DECISION_RECORDED,
    venueId,
    aggregateId: recommendationId,
    aggregateVersion: row.version + 1,
    correlationId,
    payload: rowToRecommendation({
      ...row,
      status: target,
      version: row.version + 1,
      updatedAt: now,
    }),
  });
}

export function listRecommendations(venueId: string, limit = 20): AIRecommendation[] {
  return getDb()
    .db.select()
    .from(recommendations)
    .where(eq(recommendations.venueId, venueId))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(rowToRecommendation);
}
