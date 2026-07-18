import { MapPin } from 'lucide-react';
import { redirect } from 'next/navigation';

import { zones } from '@fanaxo/db';
import { eq } from 'drizzle-orm';

import { BackButton } from '@/components/BackButton';
import { SignOutButton } from '@/components/SignOutButton';
import { resolveActorOfKind } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { listTasksForAssignee } from '@/server/services/tasks';

import { VolunteerConsole, type VolunteerTask } from './VolunteerConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Volunteer dashboard' };

export default async function VolunteerDashboardPage() {
  const actor = await resolveActorOfKind('volunteer');
  if (actor === null) {
    redirect('/volunteer/login');
  }

  const zone = getDb().db.select().from(zones).where(eq(zones.id, actor.zoneId)).get();
  const openTasks: VolunteerTask[] = listTasksForAssignee(actor.venueId, actor.userId)
    .filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
    .map((task) => ({
      id: task.id,
      title: task.title,
      instructions: task.instructions,
      priority: task.priority,
      status: task.status,
      version: task.version,
    }));

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
          <SignOutButton />
        </header>

        <VolunteerConsole tasks={openTasks} defaultZoneId={actor.zoneId} />

        <div className="border-surface-line mt-8 flex justify-start border-t pt-4">
          <BackButton href="/select-role" label="Switch role" />
        </div>
      </div>
    </main>
  );
}
