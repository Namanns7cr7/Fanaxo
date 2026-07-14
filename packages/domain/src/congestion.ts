/**
 * Connected Gate C congestion scenario rules (spec 03 §7).
 *
 * Pure signal evaluation: given live density and forecast, decide which
 * automatic scenario transition (if any) applies. Operator decisions
 * (plan approval, cancellation) arrive through the state machine directly.
 */

import { CongestionState, type CrowdForecast } from '@fanaxo/contracts';

export interface CongestionThresholds {
  /** Density fraction at which the scenario enters RISING_DENSITY. */
  readonly warningDensity: number;
  /** Forecast density fraction that predicts congestion within the horizon. */
  readonly predictedDensity: number;
  /** Horizon (minutes) inside which a forecast breach counts. */
  readonly predictionHorizonMinutes: number;
  /** Density fraction below which the scenario stabilizes/resolves. */
  readonly recoveryDensity: number;
}

export const DEFAULT_CONGESTION_THRESHOLDS: CongestionThresholds = {
  warningDensity: 0.6,
  predictedDensity: 0.8,
  predictionHorizonMinutes: 15,
  recoveryDensity: 0.5,
};

export interface CongestionSignal {
  readonly currentDensity: number;
  readonly forecasts: readonly CrowdForecast[];
}

/** True when any forecast inside the prediction horizon breaches the threshold. */
function hasForecastBreach(signal: CongestionSignal, thresholds: CongestionThresholds): boolean {
  return signal.forecasts.some(
    (forecast) =>
      forecast.horizonMinutes <= thresholds.predictionHorizonMinutes &&
      forecast.forecastDensity >= thresholds.predictedDensity,
  );
}

type StateEvaluator = (
  signal: CongestionSignal,
  thresholds: CongestionThresholds,
) => CongestionState | null;

/** Human-gated or terminal states never move automatically. */
const waitForHuman: StateEvaluator = () => null;

const evaluators: Record<CongestionState, StateEvaluator> = {
  [CongestionState.NORMAL]: (signal, thresholds) =>
    signal.currentDensity >= thresholds.warningDensity ? CongestionState.RISING_DENSITY : null,

  [CongestionState.RISING_DENSITY]: (signal, thresholds) => {
    if (hasForecastBreach(signal, thresholds)) {
      return CongestionState.PREDICTED_CONGESTION;
    }
    return signal.currentDensity < thresholds.recoveryDensity ? CongestionState.NORMAL : null;
  },

  // Waiting on AI proposal / operator decision / execution kickoff.
  [CongestionState.PREDICTED_CONGESTION]: waitForHuman,
  [CongestionState.PLAN_PROPOSED]: waitForHuman,
  [CongestionState.PLAN_APPROVED]: waitForHuman,

  [CongestionState.EXECUTING]: (signal, thresholds) =>
    signal.currentDensity < thresholds.recoveryDensity ? CongestionState.STABILIZING : null,

  [CongestionState.STABILIZING]: (signal, thresholds) => {
    if (signal.currentDensity >= thresholds.warningDensity) {
      return CongestionState.EXECUTING;
    }
    return signal.currentDensity < thresholds.recoveryDensity ? CongestionState.RESOLVED : null;
  },

  [CongestionState.RESOLVED]: () => CongestionState.NORMAL,

  // Only explicit human action moves these states.
  [CongestionState.ESCALATED]: waitForHuman,
  [CongestionState.CANCELLED]: waitForHuman,
};

/**
 * Decide the next automatic state for the scenario, or null when no
 * automatic transition applies in the current state.
 */
export function evaluateCongestionSignal(
  state: CongestionState,
  signal: CongestionSignal,
  thresholds: CongestionThresholds = DEFAULT_CONGESTION_THRESHOLDS,
): CongestionState | null {
  return evaluators[state](signal, thresholds);
}
