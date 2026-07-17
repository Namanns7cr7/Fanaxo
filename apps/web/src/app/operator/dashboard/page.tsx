import { Activity, DoorOpen, Siren, Sparkles, Users } from 'lucide-react';
import { redirect } from 'next/navigation';

import { volunteerProfiles } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { resolveActorOfKind } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { listGates } from '@/server/services/gates';
import { listVenueIncidents } from '@/server/services/incidents';
import { listRecommendations } from '@/server/services/recommendations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Command center' };

function densityBadge(density: number): { label: string; className: string } {
  if (density >= 0.85) return { label: 'Severe', className: 'bg-status-red/20 text-status-red' };
  if (density >= 0.65)
    return { label: 'High', className: 'bg-status-orange/20 text-status-orange' };
  if (density >= 0.4) return { label: 'Moderate', className: 'bg-status-lime/20 text-status-lime' };
  return { label: 'Low', className: 'bg-status-green/20 text-status-green' };
}

export default async function OperatorDashboardPage() {
  const actor = await resolveActorOfKind('operator');
  if (actor === null) {
    redirect('/operator/login');
  }

  const gates = listGates(actor.venueId);
  const incidents = listVenueIncidents(actor.venueId, 10).filter(
    (incident) => incident.status !== 'resolved',
  );
  const recommendations = listRecommendations(actor.venueId, 5).filter(
    (recommendation) => recommendation.status === 'awaiting_approval',
  );
  const availableVolunteers = getDb()
    .db.select()
    .from(volunteerProfiles)
    .where(eq(volunteerProfiles.venueId, actor.venueId))
    .all()
    .filter((profile) => profile.status === 'available');

  return (
    <main id="main" className="bg-ink min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Command center</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400">
              <Activity
                className="animate-pulse-dot text-status-green h-4 w-4"
                aria-hidden="true"
              />
              Live · signed in as {actor.displayName}
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm text-neutral-400 hover:text-white">
              Sign out
            </button>
          </form>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gates */}
          <section
            aria-label="Gate status"
            className="border-surface-line bg-surface rounded-2xl border p-6"
          >
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
              <DoorOpen className="text-brand-cyan h-5 w-5" aria-hidden="true" />
              Gates
            </h2>
            <ul className="mt-4 space-y-3">
              {gates.map((gate) => {
                const density = gate.capacity > 0 ? gate.currentCount / gate.capacity : 0;
                const badge = densityBadge(density);
                return (
                  <li
                    key={gate.gateId}
                    className="bg-ink flex items-center justify-between rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">{gate.name}</p>
                      <p className="text-xs text-neutral-500">
                        {gate.status.toUpperCase()} · queue {gate.queueMinutes} min ·{' '}
                        {gate.currentCount}/{gate.capacity}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Incidents */}
          <section
            aria-label="Open incidents"
            className="border-surface-line bg-surface rounded-2xl border p-6"
          >
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
              <Siren className="text-status-orange h-5 w-5" aria-hidden="true" />
              Open incidents
              <span className="bg-surface-raised rounded-full px-2.5 py-0.5 text-xs text-neutral-300">
                {incidents.length}
              </span>
            </h2>
            {incidents.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">
                No open incidents. Reports from fans and volunteers appear here instantly.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {incidents.map((incident) => (
                  <li key={incident.id} className="bg-ink rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-status-orange text-xs font-bold uppercase">
                        {incident.severity} · {incident.category.replaceAll('_', ' ')}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {incident.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-300">{incident.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI + workforce */}
          <div className="space-y-6">
            <section
              aria-label="AI recommendations"
              className="border-brand-purple/40 bg-surface rounded-2xl border p-6"
            >
              <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
                <Sparkles className="text-brand-purple h-5 w-5" aria-hidden="true" />
                AI recommendations
              </h2>
              {recommendations.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-400">
                  No plans awaiting approval. When crowd forecasts breach thresholds, the copilot
                  proposes a response here — you decide.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recommendations.map((recommendation) => (
                    <li key={recommendation.id} className="bg-ink rounded-lg px-4 py-3">
                      <p className="text-sm text-neutral-200">{recommendation.summary}</p>
                      <p className="mt-2 text-xs text-neutral-500">
                        Risk {recommendation.riskLevel} · confidence{' '}
                        {(recommendation.confidence * 100).toFixed(0)}% · awaiting your decision
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-label="Workforce"
              className="border-surface-line bg-surface rounded-2xl border p-6"
            >
              <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
                <Users className="text-status-lime h-5 w-5" aria-hidden="true" />
                Workforce
              </h2>
              <p className="mt-3 text-sm text-neutral-300">
                {availableVolunteers.length} volunteers available
              </p>
              <ul className="mt-2 space-y-1">
                {availableVolunteers.slice(0, 5).map((profile) => (
                  <li key={profile.userId} className="text-xs text-neutral-500">
                    {profile.displayName} · {profile.roleType.replaceAll('_', ' ')}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
