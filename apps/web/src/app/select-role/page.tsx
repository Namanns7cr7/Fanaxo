import { HardHat, Ticket, TowerControl } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Choose your role' };

const ROLES = [
  {
    href: '/fan/ticket',
    label: 'Fan',
    accent: 'border-brand-blue hover:shadow-brand-blue/20',
    iconColor: 'text-brand-blue',
    Icon: Ticket,
    description: 'Verify your match ticket, get a live route to your seat, and ask for help.',
  },
  {
    href: '/volunteer/login',
    label: 'Volunteer',
    accent: 'border-status-lime hover:shadow-status-lime/20',
    iconColor: 'text-status-lime',
    Icon: HardHat,
    description: 'Sign in with your badge, receive tasks, and report incidents from the ground.',
  },
  {
    href: '/operator/login',
    label: 'Operator',
    accent: 'border-brand-purple hover:shadow-brand-purple/20',
    iconColor: 'text-brand-purple',
    Icon: TowerControl,
    description: 'Command center: crowd intelligence, incidents, and AI-assisted decisions.',
  },
] as const;

export default function SelectRolePage() {
  return (
    <main
      id="main"
      className="bg-ink flex min-h-screen flex-col items-center justify-center px-6 py-16"
    >
      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Choose your portal</h1>
      <p className="mt-3 text-neutral-400">
        Three roles, one shared live state. Open several in parallel tabs to see the connection.
      </p>
      <div className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {ROLES.map(({ href, label, accent, iconColor, Icon, description }) => (
          <Link
            key={href}
            href={href}
            className={`group bg-surface flex flex-col rounded-2xl border p-8 transition-all hover:-translate-y-1 hover:shadow-2xl ${accent}`}
          >
            <Icon className={`h-10 w-10 ${iconColor}`} aria-hidden="true" />
            <span className="font-display mt-6 text-2xl font-bold text-white">{label}</span>
            <span className="mt-2 text-sm leading-relaxed text-neutral-400">{description}</span>
            <span className="mt-6 text-sm font-semibold text-neutral-300 group-hover:text-white">
              Continue →
            </span>
          </Link>
        ))}
      </div>
      <Link href="/" className="mt-12 text-sm text-neutral-500 hover:text-neutral-300">
        ← Back to landing
      </Link>
    </main>
  );
}
