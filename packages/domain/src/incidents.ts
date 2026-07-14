/**
 * Incident domain rules.
 *
 * The server — never the client — decides final severity (spec 05 §5).
 * A reporter's hint can raise urgency but can never downgrade a category
 * below its safety baseline.
 */

import { IncidentCategory, IncidentSeverity } from '@fanaxo/contracts';

const severityRank: Record<IncidentSeverity, number> = {
  [IncidentSeverity.LOW]: 0,
  [IncidentSeverity.MEDIUM]: 1,
  [IncidentSeverity.HIGH]: 2,
  [IncidentSeverity.CRITICAL]: 3,
};

function rankOf(severity: IncidentSeverity): number {
  return severityRank[severity] ?? 0;
}

/** Minimum severity a category may ever be filed at. */
export const categoryBaselineSeverity: Record<IncidentCategory, IncidentSeverity> = {
  [IncidentCategory.MEDICAL]: IncidentSeverity.HIGH,
  [IncidentCategory.SECURITY]: IncidentSeverity.HIGH,
  [IncidentCategory.LOST_CHILD]: IncidentSeverity.HIGH,
  [IncidentCategory.CROWD_CONGESTION]: IncidentSeverity.MEDIUM,
  [IncidentCategory.ACCESSIBILITY]: IncidentSeverity.MEDIUM,
  [IncidentCategory.TRANSPORT]: IncidentSeverity.MEDIUM,
  [IncidentCategory.FACILITY]: IncidentSeverity.LOW,
  [IncidentCategory.LOST_ITEM]: IncidentSeverity.LOW,
};

/** Derive the final severity from the category baseline and an optional hint. */
export function deriveIncidentSeverity(
  category: IncidentCategory,
  severityHint?: IncidentSeverity,
): IncidentSeverity {
  const baseline = categoryBaselineSeverity[category];
  if (severityHint === undefined) {
    return baseline;
  }
  return rankOf(severityHint) > rankOf(baseline) ? severityHint : baseline;
}

/** Severity ordering helper for queues and dashboards. */
export function compareSeverityDesc(a: IncidentSeverity, b: IncidentSeverity): number {
  return rankOf(b) - rankOf(a);
}
