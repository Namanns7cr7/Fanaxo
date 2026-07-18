import { redirect } from 'next/navigation';

import type { ProposedAction } from '@fanaxo/contracts';
import { volunteerProfiles, zones } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { BackButton } from '@/components/BackButton';
import { SignOutButton } from '@/components/SignOutButton';
import { resolveActorOfKind } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { getEnv } from '@/server/env';
import { listGates } from '@/server/services/gates';
import { listVenueIncidents } from '@/server/services/incidents';
import { listRecommendations } from '@/server/services/recommendations';

import {
  OperatorConsole,
  type OperatorRecommendation,
  type OperatorVolunteer,
} from './OperatorConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Command center' };

/** Render a proposed action as an operator-readable line, resolving zone names. */
function describeAction(action: ProposedAction, zoneName: (id: string) => string): string {
  switch (action.type) {
    case 'redirect_fans':
      return `Redirect fans from ${zoneName(action.fromGateId)} to ${zoneName(action.toGateId)}`;
    case 'assign_volunteers':
      return `Assign ${action.volunteerIds.length} volunteer(s) to ${zoneName(action.zoneId)}`;
    case 'restrict_gate':
      return `Set ${zoneName(action.gateId)} to ${action.newStatus}`;
    case 'draft_notification':
      return `Notify ${action.audience.replaceAll('_', ' ')} in ${action.languages.length} language(s)`;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export default async function OperatorDashboardPage() {
  const actor = await resolveActorOfKind('operator');
  if (actor === null) {
    redirect('/operator/login');
  }

  const zoneNames = new Map(
    getDb()
      .db.select()
      .from(zones)
      .where(eq(zones.venueId, actor.venueId))
      .all()
      .map((zone) => [zone.id, zone.name]),
  );
  const zoneName = (id: string): string => zoneNames.get(id) ?? 'a zone';

  const gates = listGates(actor.venueId).map((gate) => ({
    gateId: gate.gateId,
    name: gate.name,
    status: gate.status,
    queueMinutes: gate.queueMinutes,
    currentCount: gate.currentCount,
    capacity: gate.capacity,
    version: gate.version,
  }));

  const incidents = listVenueIncidents(actor.venueId, 10)
    .filter((incident) => incident.status !== 'resolved')
    .map((incident) => ({
      id: incident.id,
      category: incident.category,
      severity: incident.severity,
      status: incident.status,
      summary: incident.summary,
    }));

  const recommendations: OperatorRecommendation[] = listRecommendations(actor.venueId, 5)
    .filter((rec) => rec.status === 'awaiting_approval')
    .map((rec) => ({
      id: rec.id,
      summary: rec.summary,
      riskLevel: rec.riskLevel,
      confidence: rec.confidence,
      version: rec.version,
      actions: rec.proposedActions.map((action) => describeAction(action, zoneName)),
      limitations: rec.limitations.filter((limitation) => !limitation.startsWith('model:')),
    }));

  const volunteers: OperatorVolunteer[] = getDb()
    .db.select()
    .from(volunteerProfiles)
    .where(eq(volunteerProfiles.venueId, actor.venueId))
    .all()
    .filter((profile) => profile.status === 'available')
    .map((profile) => ({
      userId: profile.userId,
      displayName: profile.displayName,
      roleType: profile.roleType,
    }));

  return (
    <main id="main" className="bg-ink min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <OperatorConsole
          operatorName={actor.displayName}
          gates={gates}
          incidents={incidents}
          recommendations={recommendations}
          volunteers={volunteers}
          aiPowered={
            getEnv().AI_PROVIDER === 'anthropic' && getEnv().ANTHROPIC_API_KEY !== undefined
          }
        />
        <div className="border-surface-line mt-8 flex items-center justify-between border-t pt-4">
          <BackButton href="/select-role" label="Switch role" />
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
