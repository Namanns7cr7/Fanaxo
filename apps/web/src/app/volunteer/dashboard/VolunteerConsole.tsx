'use client';

import { CheckCircle2, ClipboardList, Loader2, Play, Send, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { readApiError } from '@/lib/api-error';
import { uuid } from '@/lib/uuid';

export interface VolunteerTask {
  id: string;
  title: string;
  instructions: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  version: number;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-status-red/20 text-status-red',
  high: 'bg-status-orange/20 text-status-orange',
  medium: 'bg-brand-cyan/20 text-brand-cyan',
  low: 'bg-neutral-500/20 text-neutral-300',
};

/** The next lifecycle action offered for a task in a given status. */
function nextAction(status: string): { action: string; label: string; Icon: typeof Play } | null {
  switch (status) {
    case 'delivered':
      return { action: 'accept', label: 'Accept', Icon: CheckCircle2 };
    case 'accepted':
      return { action: 'start', label: 'Start', Icon: Play };
    case 'in_progress':
      return { action: 'complete', label: 'Mark done', Icon: CheckCircle2 };
    default:
      return null;
  }
}

export function VolunteerConsole({
  tasks,
  defaultZoneId,
}: {
  tasks: VolunteerTask[];
  defaultZoneId: string;
}) {
  return (
    <div className="mt-8 space-y-8">
      <TaskList tasks={tasks} />
      <ReportIncident defaultZoneId={defaultZoneId} />
    </div>
  );
}

function TaskList({ tasks }: { tasks: VolunteerTask[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(task: VolunteerTask, action: string) {
    setPendingId(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, expectedVersion: task.version }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not update the task.'));
        return;
      }
      router.refresh();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-label="Your tasks">
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
        <ClipboardList className="text-status-lime h-5 w-5" aria-hidden="true" />
        Your tasks
        <span className="bg-surface-raised rounded-full px-2.5 py-0.5 text-xs text-neutral-300">
          {tasks.length} open
        </span>
      </h2>

      {error !== null && (
        <p role="alert" className="text-status-red mt-3 text-sm">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <div className="border-surface-line bg-surface mt-4 rounded-2xl border p-8 text-center">
          <p className="text-neutral-300">No open tasks right now.</p>
          <p className="mt-1 text-sm text-neutral-500">
            New assignments appear here the moment operations dispatch them — try the operator
            demo&rsquo;s &ldquo;Simulate Gate C surge&rdquo; in another tab.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {tasks.map((task) => {
            const action = nextAction(task.status);
            const busy = pendingId === task.id;
            return (
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
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs tracking-wide text-neutral-500 uppercase">
                    {task.status.replaceAll('_', ' ')}
                  </span>
                  <div className="flex gap-2">
                    {task.status !== 'escalated' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(task, 'escalate')}
                        className="border-surface-line hover:border-status-orange flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:text-white disabled:opacity-50"
                      >
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        Escalate
                      </button>
                    )}
                    {action !== null && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(task, action.action)}
                        className="bg-status-lime text-ink hover:bg-status-lime/85 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <action.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const INCIDENT_CATEGORIES = [
  { value: 'crowd_congestion', label: 'Crowd congestion' },
  { value: 'medical', label: 'Medical' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'facility', label: 'Facility issue' },
  { value: 'security', label: 'Security' },
  { value: 'lost_child', label: 'Lost child' },
  { value: 'lost_item', label: 'Lost item' },
  { value: 'transport', label: 'Transport' },
] as const;

function ReportIncident({ defaultZoneId }: { defaultZoneId: string }) {
  const router = useRouter();
  const [category, setCategory] =
    useState<(typeof INCIDENT_CATEGORIES)[number]['value']>('crowd_congestion');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: defaultZoneId,
          category,
          description: description.trim(),
          clientRequestId: uuid(),
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not submit the report.'));
        return;
      }
      setDone(true);
      setDescription('');
      router.refresh();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Report an incident">
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
        <TriangleAlert className="text-status-orange h-5 w-5" aria-hidden="true" />
        Report an incident
      </h2>
      <form
        onSubmit={onSubmit}
        className="border-surface-line bg-surface mt-4 space-y-4 rounded-2xl border p-5"
      >
        <div>
          <label htmlFor="incident-category" className="block text-sm font-medium text-neutral-300">
            Category
          </label>
          <select
            id="incident-category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as (typeof INCIDENT_CATEGORIES)[number]['value'])
            }
            className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-2.5 text-sm text-white"
          >
            {INCIDENT_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="incident-description"
            className="block text-sm font-medium text-neutral-300"
          >
            What&rsquo;s happening?
          </label>
          <textarea
            id="incident-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (done) setDone(false);
            }}
            rows={3}
            maxLength={1000}
            placeholder="Describe the situation and exact location…"
            className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-2.5 text-sm text-white placeholder:text-neutral-600"
          />
          <p className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span>The operator sees this instantly. Severity is set automatically.</span>
            <span
              className={
                description.trim().length < 10 ? 'text-status-orange' : 'text-status-green'
              }
            >
              {description.trim().length < 10
                ? `${10 - description.trim().length} more characters`
                : 'ready'}
            </span>
          </p>
        </div>
        {error !== null && (
          <p role="alert" className="text-status-red text-sm">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-status-green text-sm">
            Report submitted — it&rsquo;s now on the operator feed.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || description.trim().length < 10}
          className="bg-status-orange hover:bg-status-orange/85 flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </section>
  );
}
