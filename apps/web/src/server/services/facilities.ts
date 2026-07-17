/**
 * Facilities finder for fans.
 *
 * Returns nearby food, restrooms, and medical points with a live walk time
 * computed from the same trusted route graph the navigation uses — so a
 * closed gate or congestion is reflected in the estimate. Grounded entirely
 * in seeded data; no invented facilities.
 */

import 'server-only';

import type { RouteNode } from '@fanaxo/contracts';
import { routeNodes, tickets, zones } from '@fanaxo/db';
import type { RoutePreferences } from '@fanaxo/domain';
import { eq } from 'drizzle-orm';

import { getDb } from '../db';
import { computeRoute } from './routing';

export type FacilityKind = 'food' | 'restroom' | 'medical';

export interface FacilityResult {
  readonly id: string;
  readonly name: string;
  readonly kind: FacilityKind;
  readonly walkMinutes: number | null;
}

const KIND_NODE_TYPES: Record<FacilityKind, RouteNode['type']> = {
  food: 'food',
  restroom: 'restroom',
  medical: 'medical',
};

/** Resolve the route node nearest to (representing) the fan's seat section. */
function fanOriginNode(ticketId: string): RouteNode | undefined {
  const db = getDb().db;
  const ticket = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
  if (ticket === undefined) {
    return undefined;
  }
  const sectionZone = db
    .select()
    .from(zones)
    .where(eq(zones.name, `Section ${ticket.section}`))
    .get();
  if (sectionZone === undefined) {
    return undefined;
  }
  const node = db.select().from(routeNodes).where(eq(routeNodes.zoneId, sectionZone.id)).get();
  if (node === undefined) {
    return undefined;
  }
  return toRouteNode(node);
}

function toRouteNode(row: typeof routeNodes.$inferSelect): RouteNode {
  return {
    id: row.id,
    venueId: row.venueId,
    name: row.name,
    type: row.type,
    x: row.x,
    y: row.y,
    floor: row.floor,
    ...(row.zoneId === null ? {} : { zoneId: row.zoneId }),
  };
}

/**
 * Facilities of every kind, each with a live walk time from the fan's seat.
 * Sorted nearest-first within each kind.
 */
export function findFacilitiesForFan(
  venueId: string,
  ticketId: string,
  preferences: RoutePreferences,
): FacilityResult[] {
  const origin = fanOriginNode(ticketId);
  const allNodes = getDb()
    .db.select()
    .from(routeNodes)
    .where(eq(routeNodes.venueId, venueId))
    .all()
    .map(toRouteNode);

  const results: FacilityResult[] = [];
  for (const [kind, nodeType] of Object.entries(KIND_NODE_TYPES) as [
    FacilityKind,
    RouteNode['type'],
  ][]) {
    for (const node of allNodes.filter((candidate) => candidate.type === nodeType)) {
      results.push({
        id: node.id,
        name: node.name,
        kind,
        walkMinutes: walkMinutesTo(venueId, origin, node.id, preferences),
      });
    }
  }

  return results.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind.localeCompare(b.kind);
    }
    return (a.walkMinutes ?? Infinity) - (b.walkMinutes ?? Infinity);
  });
}

function walkMinutesTo(
  venueId: string,
  origin: RouteNode | undefined,
  destinationNodeId: string,
  preferences: RoutePreferences,
): number | null {
  if (origin === undefined) {
    return null;
  }
  const result = computeRoute(venueId, origin.id, destinationNodeId, preferences);
  return result.ok ? Math.max(1, Math.round(result.value.route.totalTimeSeconds / 60)) : null;
}
