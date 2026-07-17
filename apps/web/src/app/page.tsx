import { ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';

const PILLARS = [
  { label: 'FANS', color: 'text-brand-blue', description: 'Ticket-aware live routing' },
  { label: 'FLOW', color: 'text-status-lime', description: 'Crowd forecasts and rerouting' },
  { label: 'ACCESS', color: 'text-brand-cyan', description: 'Step-free inclusive paths' },
  { label: 'SAFETY', color: 'text-status-orange', description: 'Incidents to resolution' },
  { label: 'LIVE', color: 'text-brand-purple', description: 'One shared realtime state' },
] as const;

export default function LandingPage() {
  return (
    <main id="main" className="bg-ink flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-xl font-bold tracking-tight text-white">
          FANAXO<span className="text-brand-cyan">·</span>AI
        </span>
        <span className="border-surface-line flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-neutral-400">
          <Radio className="animate-pulse-dot text-status-green h-3 w-3" aria-hidden="true" />
          Demo environment — simulated data
        </span>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display max-w-3xl text-4xl leading-tight font-bold text-white sm:text-6xl">
          The stadium&rsquo;s
          <span className="from-brand-blue via-brand-cyan to-brand-purple bg-gradient-to-r bg-clip-text text-transparent">
            {' '}
            operating layer{' '}
          </span>
          for matchday
        </h1>
        <p className="mt-6 max-w-xl text-lg text-balance text-neutral-400">
          One live state connects every fan route, volunteer task, and operator decision — with AI
          that proposes and humans who approve.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/select-role"
            className="bg-brand-blue font-display hover:bg-brand-blue/85 inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 font-semibold text-white transition-colors"
          >
            Enter Live Engine
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/select-role?demo=connected"
            className="border-surface-line font-display hover:border-brand-cyan inline-flex items-center justify-center rounded-lg border px-8 py-4 font-semibold text-neutral-200 transition-colors hover:text-white"
          >
            Watch Connected Demo
          </Link>
        </div>
      </section>

      <section aria-label="Platform pillars" className="border-surface-line border-t">
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-px sm:grid-cols-5">
          {PILLARS.map((pillar) => (
            <li key={pillar.label} className="px-6 py-6 text-center sm:text-left">
              <span className={`font-display text-sm font-bold tracking-widest ${pillar.color}`}>
                {pillar.label}
              </span>
              <p className="mt-1 text-sm text-neutral-500">{pillar.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
