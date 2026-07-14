import { describe, expect, it } from 'vitest';

import { CongestionState, type CrowdForecast } from '@fanaxo/contracts';

import { DEFAULT_CONGESTION_THRESHOLDS, evaluateCongestionSignal } from './congestion.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000001';
const ZONE_ID = '00000000-0000-4000-8000-000000000002';

function forecast(horizonMinutes: number, forecastDensity: number): CrowdForecast {
  return {
    zoneId: ZONE_ID,
    venueId: VENUE_ID,
    horizonMinutes,
    forecastDensity,
    confidence: 0.7,
    contributingSignals: [],
    modelVersion: 'heuristic-v1',
    generatedAt: '2026-07-15T17:00:00.000Z',
  };
}

describe('evaluateCongestionSignal', () => {
  it('moves NORMAL to RISING_DENSITY when density crosses the warning threshold', () => {
    expect(
      evaluateCongestionSignal(CongestionState.NORMAL, {
        currentDensity: 0.65,
        forecasts: [],
      }),
    ).toBe(CongestionState.RISING_DENSITY);
  });

  it('keeps NORMAL below the warning threshold', () => {
    expect(
      evaluateCongestionSignal(CongestionState.NORMAL, {
        currentDensity: 0.3,
        forecasts: [],
      }),
    ).toBeNull();
  });

  it('predicts congestion only when a near-horizon forecast breaches the threshold', () => {
    expect(
      evaluateCongestionSignal(CongestionState.RISING_DENSITY, {
        currentDensity: 0.65,
        forecasts: [forecast(15, 0.85)],
      }),
    ).toBe(CongestionState.PREDICTED_CONGESTION);

    // A 30-minute forecast is outside the 15-minute prediction horizon.
    expect(
      evaluateCongestionSignal(CongestionState.RISING_DENSITY, {
        currentDensity: 0.65,
        forecasts: [forecast(30, 0.9)],
      }),
    ).toBeNull();
  });

  it('recovers RISING_DENSITY back to NORMAL when density drops', () => {
    expect(
      evaluateCongestionSignal(CongestionState.RISING_DENSITY, {
        currentDensity: 0.4,
        forecasts: [],
      }),
    ).toBe(CongestionState.NORMAL);
  });

  it('waits for human decisions in proposal and approval states', () => {
    for (const state of [
      CongestionState.PREDICTED_CONGESTION,
      CongestionState.PLAN_PROPOSED,
      CongestionState.PLAN_APPROVED,
    ]) {
      expect(evaluateCongestionSignal(state, { currentDensity: 0.95, forecasts: [] })).toBeNull();
    }
  });

  it('stabilizes and resolves as density falls after execution', () => {
    expect(
      evaluateCongestionSignal(CongestionState.EXECUTING, {
        currentDensity: 0.45,
        forecasts: [],
      }),
    ).toBe(CongestionState.STABILIZING);
    expect(
      evaluateCongestionSignal(CongestionState.STABILIZING, {
        currentDensity: 0.4,
        forecasts: [],
      }),
    ).toBe(CongestionState.RESOLVED);
  });

  it('returns to EXECUTING when density spikes while stabilizing', () => {
    expect(
      evaluateCongestionSignal(CongestionState.STABILIZING, {
        currentDensity: DEFAULT_CONGESTION_THRESHOLDS.warningDensity,
        forecasts: [],
      }),
    ).toBe(CongestionState.EXECUTING);
  });

  it('never auto-transitions escalated or cancelled scenarios', () => {
    for (const state of [CongestionState.ESCALATED, CongestionState.CANCELLED]) {
      expect(evaluateCongestionSignal(state, { currentDensity: 0.99, forecasts: [] })).toBeNull();
    }
  });
});
