import { describe, expect, it } from 'vitest';

import type { CrowdSnapshot } from '@fanaxo/contracts';

import { densityTrendPerMinute, forecastZoneDensity, FORECAST_MODEL_VERSION } from './forecast.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000001';
const ZONE_ID = '00000000-0000-4000-8000-000000000002';
const BASE_TIME = new Date('2026-07-15T17:00:00.000Z');

function snapshotAt(minutesAfterBase: number, density: number): CrowdSnapshot {
  return {
    id: `00000000-0000-4000-8000-${String(minutesAfterBase + 100).padStart(12, '0')}`,
    venueId: VENUE_ID,
    zoneId: ZONE_ID,
    capturedAt: new Date(BASE_TIME.getTime() + minutesAfterBase * 60_000).toISOString(),
    count: Math.round(density * 1000),
    density,
    flowRate: 0,
    confidence: 0.9,
    trend: 'rising',
  };
}

describe('densityTrendPerMinute', () => {
  it('returns 0 for fewer than two samples', () => {
    expect(densityTrendPerMinute([])).toBe(0);
    expect(densityTrendPerMinute([snapshotAt(0, 0.5)])).toBe(0);
  });

  it('recovers a linear rising trend', () => {
    const snapshots = [snapshotAt(0, 0.2), snapshotAt(5, 0.3), snapshotAt(10, 0.4)];
    expect(densityTrendPerMinute(snapshots)).toBeCloseTo(0.02, 5);
  });

  it('recovers a falling trend', () => {
    const snapshots = [snapshotAt(0, 0.6), snapshotAt(10, 0.4)];
    expect(densityTrendPerMinute(snapshots)).toBeCloseTo(-0.02, 5);
  });
});

describe('forecastZoneDensity', () => {
  const phase = { phase: 'kickoff_approach', arrivalMultiplier: 1.5 };

  it('returns null without snapshots or with a non-positive horizon', () => {
    expect(
      forecastZoneDensity({
        snapshots: [],
        netArrivalRatePerMinute: 0,
        matchPhase: phase,
        horizonMinutes: 15,
        now: BASE_TIME,
      }),
    ).toBeNull();
    expect(
      forecastZoneDensity({
        snapshots: [snapshotAt(0, 0.5)],
        netArrivalRatePerMinute: 0,
        matchPhase: phase,
        horizonMinutes: 0,
        now: BASE_TIME,
      }),
    ).toBeNull();
  });

  it('projects a rising trend forward and clamps to [0, 1]', () => {
    const snapshots = [snapshotAt(0, 0.5), snapshotAt(5, 0.6), snapshotAt(10, 0.7)];
    const forecast = forecastZoneDensity({
      snapshots,
      netArrivalRatePerMinute: 0.01,
      matchPhase: phase,
      horizonMinutes: 30,
      now: BASE_TIME,
    });
    expect(forecast).not.toBeNull();
    expect(forecast?.forecastDensity).toBe(1); // 0.7 + (0.02 + 0.015)*30 clamps at 1
    expect(forecast?.modelVersion).toBe(FORECAST_MODEL_VERSION);
  });

  it('reports lower confidence for longer horizons', () => {
    const snapshots = [snapshotAt(0, 0.4), snapshotAt(5, 0.45), snapshotAt(10, 0.5)];
    const shortHorizon = forecastZoneDensity({
      snapshots,
      netArrivalRatePerMinute: 0,
      matchPhase: phase,
      horizonMinutes: 5,
      now: BASE_TIME,
    });
    const longHorizon = forecastZoneDensity({
      snapshots,
      netArrivalRatePerMinute: 0,
      matchPhase: phase,
      horizonMinutes: 30,
      now: BASE_TIME,
    });
    expect(shortHorizon).not.toBeNull();
    expect(longHorizon).not.toBeNull();
    if (shortHorizon && longHorizon) {
      expect(shortHorizon.confidence).toBeGreaterThan(longHorizon.confidence);
    }
  });

  it('lists its contributing signals for explainability', () => {
    const forecast = forecastZoneDensity({
      snapshots: [snapshotAt(0, 0.3), snapshotAt(5, 0.35)],
      netArrivalRatePerMinute: 0.005,
      matchPhase: phase,
      horizonMinutes: 15,
      now: BASE_TIME,
    });
    expect(forecast?.contributingSignals).toEqual(
      expect.arrayContaining([
        expect.stringContaining('density_trend:'),
        expect.stringContaining('net_arrival_rate:'),
        'match_phase:kickoff_approach',
        'samples:2',
      ]),
    );
  });
});
