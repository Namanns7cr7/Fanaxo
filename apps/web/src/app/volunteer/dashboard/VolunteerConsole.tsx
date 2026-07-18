'use client';

import {
  CheckCircle2,
  ClipboardList,
  HandHelping,
  Loader2,
  Play,
  Send,
  TriangleAlert,
} from 'lucide-react';
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

export interface HelpRequest {
  id: string;
  category: string;
  description: string;
  zoneName: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-status-red/20 text-status-red',
  high: 'bg-status-orange/20 text-status-orange',
  medium: 'bg-brand-cyan/20 text-brand-cyan',
  low: 'bg-neutral-500/20 text-neutral-300',
};

/** Target status for each task action (mirrors the domain task state machine). */
const ACTION_TARGET: Record<string, string> = {
  accept: 'accepted',
  start: 'in_progress',
  complete: 'completed',
  escalate: 'escalated',
  cancel: 'cancelled',
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
  tasks: initialTasks,
  helpRequests: initialRequests,
  defaultZoneId,
}: {
  tasks: VolunteerTask[];
  helpRequests: HelpRequest[];
  defaultZoneId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [requests, setRequests] = useState(initialRequests);

  return (
    <div className="mt-8 space-y-8">
      <HelpRequests requests={requests} setRequests={setRequests} />
      <TaskList tasks={tasks} setTasks={setTasks} />
      <ReportIncident defaultZoneId={defaultZoneId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fan help requests (fan → volunteer connection)
// ---------------------------------------------------------------------------

function HelpRequests({
  requests,
  setRequests,
}: {
  requests: HelpRequest[];
  setRequests: (updater: (prev: HelpRequest[]) => HelpRequest[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function respond(request: HelpRequest) {
    // Optimistic: remove immediately so the tap feels instant.
    setRequests((prev) => prev.filter((item) => item.id !== request.id));
    setError(null);
    try {
      const response = await fetch(`/api/assistance/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not accept the request.'));
        setRequests((prev) => [request, ...prev]); // revert
      }
    } catch {
      setError('Network problem — please try again.');
      setRequests((prev) => [request, ...prev]); // revert
    }
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <section aria-label="Fan help requests">
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
        <HandHelping className="text-brand-cyan h-5 w-5" aria-hidden="true" />
        Fans need help
        <span className="bg-brand-cyan/20 text-brand-cyan rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {requests.length}
        </span>
      </h2>
      {error !== null && (
        <p role="alert" className="text-status-red mt-3 text-sm">
          {error}
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <li
            key={request.id}
            className="border-brand-cyan/40 bg-surface flex items-start justify-between gap-4 rounded-2xl border p-5"
          >
            <div>
              <p className="text-brand-cyan text-xs font-bold tracking-wide uppercase">
                {request.category.replaceAll('_', ' ')} · {request.zoneName}
              </p>
              <p className="mt-1 text-sm text-neutral-200">{request.description}</p>
            </div>
            <button
              type="button"
              onClick={() => void respond(request)}
              className="bg-brand-cyan text-ink hover:bg-brand-cyan/85 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              I&rsquo;ll help
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tasks (optimistic actions)
// ---------------------------------------------------------------------------

function TaskList({
  tasks,
  setTasks,
}: {
  tasks: VolunteerTask[];
  setTasks: (updater: (prev: VolunteerTask[]) => VolunteerTask[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function act(task: VolunteerTask, action: string) {
    const target = ACTION_TARGET[action] ?? task.status;
    setError(null);
    // Optimistic: reflect the new status (or drop it when terminal) instantly.
    const isTerminal = target === 'completed' || target === 'cancelled';
    setTasks((prev) =>
      isTerminal
        ? prev.filter((item) => item.id !== task.id)
        : prev.map((item) => (item.id === task.id ? { ...item, status: target } : item)),
    );

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, expectedVersion: task.version }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not update the task.'));
        // Revert to the original task on failure.
        setTasks((prev) => {
          const withoutTask = prev.filter((item) => item.id !== task.id);
          return [task, ...withoutTask].sort((a, b) => a.title.localeCompare(b.title));
        });
        return;
      }
      // Sync the authoritative version from the server so the next action works.
      const body = (await response.json()) as { task: VolunteerTask };
      setTasks((prev) => prev.map((item) => (item.id === task.id ? body.task : item)));
    } catch {
      setError('Network problem — please try again.');
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
                        onClick={() => void act(task, 'escalate')}
                        className="border-surface-line hover:border-status-orange flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:text-white"
                      >
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        Escalate
                      </button>
                    )}
                    {action !== null && (
                      <button
                        type="button"
                        onClick={() => void act(task, action.action)}
                        className="bg-status-lime text-ink hover:bg-status-lime/85 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        <action.Icon className="h-3.5 w-3.5" aria-hidden="true" />
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

// ---------------------------------------------------------------------------
// Report an incident
// ---------------------------------------------------------------------------

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
