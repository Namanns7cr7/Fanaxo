/**
 * Connected Gate C congestion demo engine (spec 01 §10, spec 03 §7).
 *
 * Simulates a surge at Gate C: raises its live density (publishing crowd +
 * gate events), computes 5/15/30-minute forecasts with the domain model,
 * asks the recommendation provider (Claude or deterministic) for a response
 * plan, and persists it awaiting operator approval. Approving that plan is
 * what fans out to every portal.
 */

import 'server-only';

import {
  EventType,
  type CrowdForecast,
  type CrowdSnapshot,
  type GateState,
  type VolunteerProfile,
} from '@fanaxo/contracts';
import { crowdSnapshots, volunteerProfiles, zones } from '@fanaxo/db';
import { forecastZoneDensity, FORECAST_HORIZONS_MINUTES } from '@fanaxo/domain';
import { desc, eq } from 'drizzle-orm';

import { getRecommendationProvider } from '../ai/recommendation-provider';
import { getDb } from '../db';
import { newCorrelationId } from '../http';
import { publishEvent } from '../realtime/bus';
import { listGates, rowToGateState, updateGateTelemetry } from './gates';
import { createRecommendation } from './recommendations';

const SURGE_DENSITY = 0.9;
const SURGE_QUEUE_MINUTES = 16;

function findGate(gates: GateState[], nameFragment: string): GateState | undefined {
  return gates.find((gate) => gate.name.includes(nameFragment));
}

function recentSnapshots(venueId: string, zoneId: string): CrowdSnapshot[] {
  return getDb()
    .db.select()
    .from(crowdSnapshots)
    .where(eq(crowdSnapshots.zoneId, zoneId))
    .orderBy(desc(crowdSnapshots.capturedAt))
    .limit(12)
    .all()
    .filter((snapshot) => snapshot.venueId === venueId)
    .reverse()
    .map((snapshot) => ({
      id: snapshot.id,
      venueId: snapshot.venueId,
      zoneId: snapshot.zoneId,
      capturedAt: snapshot.capturedAt,
      count: snapshot.count,
      density: snapshot.density,
      flowRate: snapshot.flowRate,
      confidence: snapshot.confidence,
      trend: snapshot.trend,
    }));
}

function buildForecasts(venueId: string, zoneId: string, now: Date): CrowdForecast[] {
  const snapshots = recentSnapshots(venueId, zoneId);
  const forecasts: CrowdForecast[] = [];
  for (const horizon of FORECAST_HORIZONS_MINUTES) {
    const forecast = forecastZoneDensity({
      snapshots,
      netArrivalRatePerMinute: 0.02,
      matchPhase: { phase: 'kickoff_approach', arrivalMultiplier: 1.6 },
      horizonMinutes: horizon,
      now,
    });
    if (forecast !== null) {
      forecasts.push(forecast);
    }
  }
  return forecasts;
}

function availableVolunteers(venueId: string): VolunteerProfile[] {
  return getDb()
    .db.select()
    .from(volunteerProfiles)
    .where(eq(volunteerProfiles.venueId, venueId))
    .all()
    .filter((profile) => profile.status === 'available')
    .map((profile) => ({
      userId: profile.userId,
      venueId: profile.venueId,
      roleType: profile.roleType,
      zoneId: profile.zoneId,
      shiftStart: profile.shiftStart,
      shiftEnd: profile.shiftEnd,
      status: profile.status,
      displayName: profile.displayName,
    }));
}

function zoneNameMap(venueId: string): Map<string, string> {
  return new Map(
    getDb()
      .db.select()
      .from(zones)
      .where(eq(zones.venueId, venueId))
      .all()
      .map((zone) => [zone.id, zone.name]),
  );
}

export interface SurgeResult {
  readonly recommendationId: string;
  readonly congestedGate: string;
  readonly redirectGate: string;
}

/**
 * Trigger the Gate C surge and produce an operator-facing recommendation.
 * Returns null when the demo topology (Gate C + Gate D) isn't present.
 */
export async function triggerCongestionSurge(venueId: string): Promise<SurgeResult | null> {
  const gates = listGates(venueId);
  const congested = findGate(gates, 'Gate C');
  const redirect = findGate(gates, 'Gate D');
  if (congested === undefined || redirect === undefined) {
    return null;
  }

  const now = new Date();
  const correlationId = newCorrelationId();

  // 1. Raise Gate C telemetry to a surge level and record a fresh snapshot.
  const surgedCount = Math.round(SURGE_DENSITY * congested.capacity);
  updateGateTelemetry(
    venueId,
    congested.gateId,
    {
      queueMinutes: SURGE_QUEUE_MINUTES,
      throughput: congested.throughput,
      currentCount: surgedCount,
    },
    correlationId,
  );
  const snapshotId = newCorrelationId();
  getDb()
    .db.insert(crowdSnapshots)
    .values({
      id: snapshotId,
      venueId,
      zoneId: congested.gateId,
      capturedAt: now.toISOString(),
      count: surgedCount,
      density: SURGE_DENSITY,
      flowRate: 9,
      confidence: 0.9,
      trend: 'rising',
    })
    .run();
  publishEvent({
    eventType: EventType.CROWD_SNAPSHOT_UPDATED,
    venueId,
    aggregateId: congested.gateId,
    aggregateVersion: Date.now(),
    correlationId,
    payload: {
      id: snapshotId,
      venueId,
      zoneId: congested.gateId,
      capturedAt: now.toISOString(),
      count: surgedCount,
      density: SURGE_DENSITY,
      flowRate: 9,
      confidence: 0.9,
      trend: 'rising',
    },
  });

  // 2. Forecast, then ask the provider for a grounded response plan.
  const forecasts = buildForecasts(venueId, congested.gateId, now);
  for (const forecast of forecasts) {
    publishEvent({
      eventType: EventType.CROWD_FORECAST_UPDATED,
      venueId,
      aggregateId: congested.gateId,
      aggregateVersion: Date.now(),
      correlationId,
      payload: forecast,
    });
  }

  const surgedGate = rowToGateState({
    ...toGateRow(congested),
    queueMinutes: SURGE_QUEUE_MINUTES,
    currentCount: surgedCount,
  });

  const draft = await getRecommendationProvider().proposeCongestionPlan({
    congestedGate: surgedGate,
    redirectGate: redirect,
    currentDensity: SURGE_DENSITY,
    forecasts,
    availableVolunteers: availableVolunteers(venueId),
    zoneNameById: zoneNameMap(venueId),
  });

  // 3. Persist the recommendation awaiting operator approval.
  const recommendation = createRecommendation(
    venueId,
    'congestion',
    congested.gateId,
    draft,
    correlationId,
  );

  return {
    recommendationId: recommendation.id,
    congestedGate: congested.name,
    redirectGate: redirect.name,
  };
}

/** Re-materialize a GateState back into a row shape for rowToGateState. */
function toGateRow(gate: GateState): Parameters<typeof rowToGateState>[0] {
  return {
    gateId: gate.gateId,
    venueId: gate.venueId,
    name: gate.name,
    status: gate.status,
    queueMinutes: gate.queueMinutes,
    throughput: gate.throughput,
    currentCount: gate.currentCount,
    capacity: gate.capacity,
    version: gate.version,
    updatedAt: gate.updatedAt,
  };
}
