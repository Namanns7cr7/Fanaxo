'use client';

import { Activity, Check, DoorOpen, Loader2, Siren, Sparkles, Users, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readApiError } from '@/lib/api-error';

export interface OperatorGate {
  gateId: string;
  name: string;
  status: 'open' | 'restricted' | 'closed' | 'reopening';
  queueMinutes: number;
  currentCount: number;
  capacity: number;
  version: number;
}

export interface OperatorIncident {
  id: string;
  category: string;
  severity: string;
  status: string;
  summary: string;
}

export interface OperatorRecommendation {
  id: string;
  summary: string;
  riskLevel: string;
  confidence: number;
  version: number;
  actions: string[];
  limitations: string[];
}

export interface OperatorVolunteer {
  userId: string;
  displayName: string;
  roleType: string;
}

interface Props {
  operatorName: string;
  gates: OperatorGate[];
  incidents: OperatorIncident[];
  recommendations: OperatorRecommendation[];
  volunteers: OperatorVolunteer[];
}

function densityBadge(density: number): { label: string; className: string } {
  if (density >= 0.85) return { label: 'Severe', className: 'bg-status-red/20 text-status-red' };
  if (density >= 0.65)
    return { label: 'High', className: 'bg-status-orange/20 text-status-orange' };
  if (density >= 0.4) return { label: 'Moderate', className: 'bg-status-lime/20 text-status-lime' };
  return { label: 'Low', className: 'bg-status-green/20 text-status-green' };
}

export function OperatorConsole({
  operatorName,
  gates,
  incidents,
  recommendations,
  volunteers,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function simulateSurge() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/operator/simulate', { method: 'POST' });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not run the simulation.'));
        return;
      }
      setNotice('Gate C surge simulated — an AI recommendation is awaiting your approval below.');
      router.refresh();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Command center</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400">
            <Activity className="animate-pulse-dot text-status-green h-4 w-4" aria-hidden="true" />
            Live · signed in as {operatorName}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void simulateSurge()}
          className="bg-brand-purple font-display hover:bg-brand-purple/85 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Zap className="h-4 w-4" aria-hidden="true" />
          )}
          Simulate Gate C surge
        </button>
      </header>

      {notice !== null && (
        <p
          role="status"
          className="border-brand-purple/40 text-brand-cyan bg-surface mt-4 rounded-lg border px-4 py-2 text-sm"
        >
          {notice}
        </p>
      )}
      {error !== null && (
        <p role="alert" className="text-status-red mt-4 text-sm">
          {error}
        </p>
      )}

      {recommendations.length > 0 && (
        <RecommendationsPanel recommendations={recommendations} onDone={() => router.refresh()} />
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GatesPanel gates={gates} onDone={() => router.refresh()} />
        <IncidentsPanel incidents={incidents} />
        <WorkforcePanel volunteers={volunteers} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function RecommendationsPanel({
  recommendations,
  onDone,
}: {
  recommendations: OperatorRecommendation[];
  onDone: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(rec: OperatorRecommendation, decision: 'approved' | 'rejected') {
    setPendingId(rec.id);
    setError(null);
    try {
      const response = await fetch(`/api/operator/recommendations/${rec.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason:
            decision === 'approved'
              ? 'Approved from the command center to relieve Gate C congestion.'
              : 'Rejected from the command center; handling manually.',
          expectedVersion: rec.version,
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not record your decision.'));
        return;
      }
      onDone();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section
      aria-label="AI recommendations awaiting approval"
      className="border-brand-purple/50 bg-surface mt-6 rounded-2xl border p-6"
    >
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
        <Sparkles className="text-brand-purple h-5 w-5" aria-hidden="true" />
        AI recommendation — your approval required
      </h2>
      {error !== null && (
        <p role="alert" className="text-status-red mt-3 text-sm">
          {error}
        </p>
      )}
      <ul className="mt-4 space-y-4">
        {recommendations.map((rec) => {
          const busy = pendingId === rec.id;
          return (
            <li key={rec.id} className="bg-ink rounded-xl p-4">
              <p className="text-neutral-100">{rec.summary}</p>
              <p className="mt-2 text-xs text-neutral-500">
                Risk {rec.riskLevel} · confidence {(rec.confidence * 100).toFixed(0)}%
              </p>
              {rec.actions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Proposed actions
                  </p>
                  <ul className="mt-1 space-y-1">
                    {rec.actions.map((action, index) => (
                      <li key={index} className="text-brand-cyan flex items-start gap-2 text-sm">
                        <span aria-hidden="true">→</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rec.limitations.length > 0 && (
                <p className="mt-3 text-xs text-neutral-500">
                  Limitations: {rec.limitations.join('; ')}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void decide(rec, 'approved')}
                  className="bg-status-green text-ink hover:bg-status-green/85 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Approve &amp; execute
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void decide(rec, 'rejected')}
                  className="border-surface-line hover:border-status-red flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm text-neutral-300 transition-colors hover:text-white disabled:opacity-60"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

function GatesPanel({ gates, onDone }: { gates: OperatorGate[]; onDone: () => void }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeGate(gate: OperatorGate, status: 'restricted' | 'closed' | 'reopening') {
    setPendingId(gate.gateId);
    setError(null);
    try {
      const response = await fetch(`/api/gates/${gate.gateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reason: `Operator set ${gate.name} to ${status} from the command center.`,
          confirm: true,
          expectedVersion: gate.version,
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not change the gate.'));
        return;
      }
      onDone();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section
      aria-label="Gate status"
      className="border-surface-line bg-surface rounded-2xl border p-6"
    >
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
        <DoorOpen className="text-brand-cyan h-5 w-5" aria-hidden="true" />
        Gates
      </h2>
      {error !== null && (
        <p role="alert" className="text-status-red mt-3 text-sm">
          {error}
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {gates.map((gate) => {
          const density = gate.capacity > 0 ? gate.currentCount / gate.capacity : 0;
          const badge = densityBadge(density);
          const busy = pendingId === gate.gateId;
          const canReopen = gate.status === 'closed' || gate.status === 'restricted';
          return (
            <li key={gate.gateId} className="bg-ink rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{gate.name}</p>
                  <p className="text-xs text-neutral-500">
                    {gate.status.toUpperCase()} · queue {gate.queueMinutes} min ·{' '}
                    {gate.currentCount}/{gate.capacity}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {gate.status === 'open' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeGate(gate, 'restricted')}
                    className="border-surface-line hover:border-status-orange rounded-md border px-2.5 py-1 text-xs text-neutral-300 hover:text-white disabled:opacity-50"
                  >
                    Restrict
                  </button>
                )}
                {gate.status !== 'closed' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeGate(gate, 'closed')}
                    className="border-surface-line hover:border-status-red rounded-md border px-2.5 py-1 text-xs text-neutral-300 hover:text-white disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
                {canReopen && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeGate(gate, 'reopening')}
                    className="border-surface-line hover:border-status-green rounded-md border px-2.5 py-1 text-xs text-neutral-300 hover:text-white disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
                {busy && (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" aria-hidden="true" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Incidents + workforce (read-only panels)
// ---------------------------------------------------------------------------

function IncidentsPanel({ incidents }: { incidents: OperatorIncident[] }) {
  return (
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
  );
}

function WorkforcePanel({ volunteers }: { volunteers: OperatorVolunteer[] }) {
  return (
    <section
      aria-label="Workforce"
      className="border-surface-line bg-surface rounded-2xl border p-6"
    >
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
        <Users className="text-status-lime h-5 w-5" aria-hidden="true" />
        Workforce
      </h2>
      <p className="mt-3 text-sm text-neutral-300">{volunteers.length} volunteers available</p>
      <ul className="mt-2 space-y-1">
        {volunteers.slice(0, 6).map((volunteer) => (
          <li key={volunteer.userId} className="text-xs text-neutral-500">
            {volunteer.displayName} · {volunteer.roleType.replaceAll('_', ' ')}
          </li>
        ))}
      </ul>
    </section>
  );
}
