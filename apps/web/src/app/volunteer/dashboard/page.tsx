import { ClipboardList, MapPin } from 'lucide-react';
import { redirect } from 'next/navigation';

import { zones } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { resolveActorOfKind } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { listTasksForAssignee } from '@/server/services/tasks';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Volunteer dashboard' };

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-status-red/20 text-status-red',
  high: 'bg-status-orange/20 text-status-orange',
  medium: 'bg-brand-cyan/20 text-brand-cyan',
  low: 'bg-neutral-500/20 text-neutral-300',
};

export default async function VolunteerDashboardPage() {
  const actor = await resolveActorOfKind('volunteer');
  if (actor === null) {
    redirect('/volunteer/login');
  }

  const zone = getDb().db.select().from(zones).where(eq(zones.id, actor.zoneId)).get();
  const tasks = listTasksForAssignee(actor.venueId, actor.userId);
  const openTasks = tasks.filter(
    (task) => task.status !== 'completed' && task.status !== 'cancelled',
  );

  return (
    <main id="main" className="bg-ink min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Hi, {actor.displayName.split(' ')[0]}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400">
              <MapPin className="text-status-lime h-4 w-4" aria-hidden="true" />
              Assigned zone: {zone?.name ?? 'Unknown'} · {actor.roleType.replaceAll('_', ' ')}
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm text-neutral-400 hover:text-white">
              Sign out
            </button>
          </form>
        </header>

        <section aria-label="Your tasks" className="mt-8">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
            <ClipboardList className="text-status-lime h-5 w-5" aria-hidden="true" />
            Your tasks
            <span className="bg-surface-raised rounded-full px-2.5 py-0.5 text-xs text-neutral-300">
              {openTasks.length} open
            </span>
          </h2>

          {openTasks.length === 0 ? (
            <div className="border-surface-line bg-surface mt-4 rounded-2xl border p-8 text-center">
              <p className="text-neutral-300">No open tasks right now.</p>
              <p className="mt-1 text-sm text-neutral-500">
                New assignments appear here instantly when the operations team dispatches them.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {openTasks.map((task) => (
                <li key={task.id} className="border-surface-line bg-surface rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-white">{task.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.low}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">{task.instructions}</p>
                  <p className="mt-3 text-xs tracking-wide text-neutral-500 uppercase">
                    Status: {task.status.replaceAll('_', ' ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
