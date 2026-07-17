import { CalendarClock, DoorOpen, Footprints, MapPin } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { resolveActorOfKind } from '@/server/auth/session';
import { getFanContext, getFanRouteSteps } from '@/server/services/fan-context';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fan dashboard' };

const CONGESTION_LABELS: Record<string, string> = {
  low: 'Light crowds',
  moderate: 'Moderate crowds',
  high: 'Heavy crowds',
  severe: 'Severe congestion',
};

export default async function FanDashboardPage() {
  const actor = await resolveActorOfKind('fan');
  if (actor === null) {
    redirect('/fan/ticket');
  }
  const context = getFanContext(actor);
  if (context === null) {
    redirect('/fan/ticket');
  }
  const steps = getFanRouteSteps(actor);

  return (
    <main id="main" className="bg-ink min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-white">Your matchday</h1>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm text-neutral-400 hover:text-white">
              Sign out
            </button>
          </form>
        </header>

        {context.ticket === null ? (
          <section className="border-surface-line bg-surface mt-8 rounded-2xl border p-6">
            <p className="text-neutral-300">
              You&rsquo;re browsing as a guest. Verify a ticket to unlock your personal route.
            </p>
            <Link href="/fan/ticket" className="text-brand-cyan mt-3 inline-block hover:underline">
              Verify a ticket →
            </Link>
          </section>
        ) : (
          <>
            <section
              aria-label="Your ticket"
              className="border-brand-blue/40 bg-surface mt-8 rounded-2xl border p-6"
            >
              <p className="font-display text-lg font-bold text-white">
                {context.ticket.matchLabel}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Kick-off{' '}
                {new Date(context.ticket.startsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {context.ticket.venueName}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-ink rounded-lg p-3">
                  <dt className="text-xs tracking-wide text-neutral-500 uppercase">Gate</dt>
                  <dd className="font-display text-brand-cyan mt-1 text-xl font-bold">
                    {context.ticket.gateName.replace('Gate ', '')}
                  </dd>
                </div>
                <div className="bg-ink rounded-lg p-3">
                  <dt className="text-xs tracking-wide text-neutral-500 uppercase">Section</dt>
                  <dd className="font-display mt-1 text-xl font-bold text-white">
                    {context.ticket.section}
                  </dd>
                </div>
                <div className="bg-ink rounded-lg p-3">
                  <dt className="text-xs tracking-wide text-neutral-500 uppercase">Row · Seat</dt>
                  <dd className="font-display mt-1 text-xl font-bold text-white">
                    {context.ticket.row}·{context.ticket.seat}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-label="Live route"
              className="border-surface-line bg-surface mt-6 rounded-2xl border p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
                  <Footprints className="text-brand-blue h-5 w-5" aria-hidden="true" />
                  Route to your seat
                </h2>
                {context.route !== null && (
                  <span className="bg-ink rounded-full px-3 py-1 text-xs text-neutral-300">
                    ~{Math.round(context.route.totalTimeSeconds / 60)} min ·{' '}
                    {CONGESTION_LABELS[context.route.congestionLevel] ??
                      context.route.congestionLevel}
                  </span>
                )}
              </div>

              {context.route === null ? (
                <p className="mt-4 text-sm text-neutral-400">
                  No safe route is available right now. Please ask a volunteer for assistance —
                  staff can guide you directly.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <li key={step.nodeId} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === steps.length - 1
                            ? 'bg-status-green text-ink'
                            : 'bg-brand-blue/20 text-brand-cyan'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm text-white">{step.instruction}</p>
                        {step.distanceMeters > 0 && (
                          <p className="text-xs text-neutral-500">{step.distanceMeters} m</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="border-surface-line mt-4 flex items-center gap-2 border-t pt-3 text-xs text-neutral-500">
                <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Queue estimate: {context.route?.estimatedQueueMinutes ?? 0} min at the gate ·
                updates live as conditions change
              </p>
            </section>
          </>
        )}

        {context.activeNotices.length > 0 && (
          <section
            aria-label="Venue notices"
            className="border-status-orange/40 bg-surface mt-6 rounded-2xl border p-6"
          >
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
              <MapPin className="text-status-orange h-5 w-5" aria-hidden="true" />
              Venue notices
            </h2>
            <ul className="mt-3 space-y-2">
              {context.activeNotices.map((notice) => (
                <li key={notice.id} className="text-sm text-neutral-300">
                  {notice.message}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
