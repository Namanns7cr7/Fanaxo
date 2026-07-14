/**
 * Transparent crowd forecast heuristic (spec 05 §8.2).
 *
 * A deliberately explainable model for the demo: linear density trend blended
 * with net arrival pressure and match-phase weighting. Every output carries
 * its contributing signals and a model version; it makes no production-safety
 * claim. Thresholds live in venue configuration, not in UI code.
 */

import type { CrowdForecast, CrowdSnapshot } from '@fanaxo/contracts';

export const FORECAST_MODEL_VERSION = 'heuristic-v1';

export interface MatchPhaseSignal {
  /** e.g. 'pre_gates', 'gates_open', 'kickoff_approach', 'in_play', 'egress' */
  readonly phase: string;
  /** Expected arrival pressure multiplier for the phase. */
  readonly arrivalMultiplier: number;
}

export interface ForecastInput {
  /** Recent snapshots for one zone, oldest first; at least one required. */
  readonly snapshots: readonly CrowdSnapshot[];
  /** Net inflow as a fraction of zone capacity per minute (can be negative). */
  readonly netArrivalRatePerMinute: number;
  readonly matchPhase: MatchPhaseSignal;
  readonly horizonMinutes: number;
  readonly now: Date;
}

/** Least-squares slope of density over minutes; 0 for a single sample. */
export function densityTrendPerMinute(snapshots: readonly CrowdSnapshot[]): number {
  if (snapshots.length < 2) {
    return 0;
  }
  const first = snapshots[0];
  if (first === undefined) {
    return 0;
  }
  const t0 = new Date(first.capturedAt).getTime();
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const snapshot of snapshots) {
    const x = (new Date(snapshot.capturedAt).getTime() - t0) / 60_000;
    const y = snapshot.density;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const n = snapshots.length;
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }
  return (n * sumXY - sumX * sumY) / denominator;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Forecast zone density at the requested horizon. Confidence decays with
 * horizon length and rises with sample count, so a 30-minute forecast from
 * two snapshots is visibly less trustworthy than a 5-minute one from twelve.
 */
export function forecastZoneDensity(input: ForecastInput): CrowdForecast | null {
  const latest = input.snapshots[input.snapshots.length - 1];
  if (latest === undefined || input.horizonMinutes <= 0) {
    return null;
  }

  const trend = densityTrendPerMinute(input.snapshots);
  const arrivalPressure = input.netArrivalRatePerMinute * input.matchPhase.arrivalMultiplier;
  const projected = latest.density + (trend + arrivalPressure) * input.horizonMinutes;

  const sampleFactor = Math.min(1, input.snapshots.length / 10);
  const horizonFactor = Math.max(0.25, 1 - input.horizonMinutes / 60);
  const confidence = clamp01(0.35 + 0.45 * sampleFactor * horizonFactor);

  return {
    zoneId: latest.zoneId,
    venueId: latest.venueId,
    horizonMinutes: input.horizonMinutes,
    forecastDensity: clamp01(projected),
    confidence,
    contributingSignals: [
      `density_trend:${trend.toFixed(4)}/min`,
      `net_arrival_rate:${input.netArrivalRatePerMinute.toFixed(4)}/min`,
      `match_phase:${input.matchPhase.phase}`,
      `samples:${input.snapshots.length}`,
    ],
    modelVersion: FORECAST_MODEL_VERSION,
    generatedAt: input.now.toISOString(),
  };
}

/** Standard operator horizons (spec 01 §6: 5/15/30-minute forecasts). */
export const FORECAST_HORIZONS_MINUTES = [5, 15, 30] as const;
