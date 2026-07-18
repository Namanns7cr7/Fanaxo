'use client';

import {
  Accessibility,
  Coffee,
  Cross,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Toilet,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { readApiError } from '@/lib/api-error';
import { uuid } from '@/lib/uuid';

type Tab = 'assistant' | 'facilities' | 'help' | 'access';

interface AssistantReply {
  answer: string;
  sources: string[];
  suggestions: string[];
  escalated: boolean;
}

interface Facility {
  id: string;
  name: string;
  kind: 'food' | 'restroom' | 'medical';
  walkMinutes: number | null;
}

interface ChatEntry {
  role: 'fan' | 'assistant';
  text: string;
  sources?: string[];
}

const TABS: { id: Tab; label: string; Icon: typeof Sparkles }[] = [
  { id: 'assistant', label: 'Assistant', Icon: Sparkles },
  { id: 'facilities', label: 'Facilities', Icon: Coffee },
  { id: 'help', label: 'Get help', Icon: MapPin },
  { id: 'access', label: 'Access', Icon: Accessibility },
];

const FACILITY_ICON: Record<Facility['kind'], typeof Coffee> = {
  food: Coffee,
  restroom: Toilet,
  medical: Cross,
};

export function FanCompanion({ stepFreeInitial }: { stepFreeInitial: boolean }) {
  const [tab, setTab] = useState<Tab>('assistant');

  return (
    <section
      aria-label="Matchday companion"
      className="border-surface-line bg-surface mt-6 rounded-2xl border p-2"
    >
      <div role="tablist" aria-label="Companion sections" className="flex gap-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
              tab === id
                ? 'bg-brand-blue text-white'
                : 'hover:bg-surface-raised text-neutral-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'assistant' && <AssistantPanel />}
        {tab === 'facilities' && <FacilitiesPanel />}
        {tab === 'help' && <HelpPanel />}
        {tab === 'access' && <AccessPanel stepFreeInitial={stepFreeInitial} />}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------------

function AssistantPanel() {
  const [chat, setChat] = useState<ChatEntry[]>([
    {
      role: 'assistant',
      text: 'Hi! Ask me about your seat, facilities, your route, or the match. I only answer from live venue information.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Where is my seat?',
    'Where can I get food?',
    'When does the match start?',
  ]);

  async function ask(question: string) {
    if (question.trim().length < 2 || busy) {
      return;
    }
    setChat((prev) => [...prev, { role: 'fan', text: question }]);
    setInput('');
    setBusy(true);
    try {
      const response = await fetch('/api/fan/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        const message = await readApiError(response, 'The assistant is unavailable right now.');
        setChat((prev) => [...prev, { role: 'assistant', text: message }]);
        return;
      }
      const reply = (await response.json()) as AssistantReply;
      setChat((prev) => [
        ...prev,
        { role: 'assistant', text: reply.answer, sources: reply.sources },
      ]);
      setSuggestions(reply.suggestions);
    } catch {
      setChat((prev) => [
        ...prev,
        { role: 'assistant', text: 'Network problem — please try again.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <div>
      <div
        className="max-h-72 space-y-3 overflow-y-auto"
        aria-live="polite"
        aria-label="Conversation"
      >
        {chat.map((entry, index) => (
          <div
            key={index}
            className={entry.role === 'fan' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                entry.role === 'fan' ? 'bg-brand-blue text-white' : 'bg-ink text-neutral-200'
              }`}
            >
              <p>{entry.text}</p>
              {entry.sources !== undefined && entry.sources.length > 0 && (
                <p className="text-brand-cyan mt-2 flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Based on: {entry.sources.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-ink rounded-2xl px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" aria-hidden="true" />
              <span className="sr-only">Assistant is thinking</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={busy}
            onClick={() => void ask(suggestion)}
            className="border-surface-line hover:border-brand-cyan rounded-full border px-3 py-1 text-xs text-neutral-300 transition-colors hover:text-white disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <label htmlFor="assistant-input" className="sr-only">
          Ask the assistant
        </label>
        <input
          id="assistant-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your seat, food, route…"
          className="border-surface-line bg-ink flex-1 rounded-lg border px-4 py-2.5 text-sm text-white placeholder:text-neutral-600"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length < 2}
          className="bg-brand-blue hover:bg-brand-blue/85 flex items-center justify-center rounded-lg px-4 text-white transition-colors disabled:opacity-50"
          aria-label="Send question"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Facilities
// ---------------------------------------------------------------------------

function FacilitiesPanel() {
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/fan/facilities');
      if (!response.ok) {
        setError(await readApiError(response, 'Could not load facilities.'));
        return;
      }
      const body = (await response.json()) as { facilities: Facility[] };
      setFacilities(body.facilities);
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (facilities === null) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-neutral-400">
          Find the nearest food, restrooms, and medical points with live walk times.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="bg-brand-blue hover:bg-brand-blue/85 mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Finding facilities…' : 'Find facilities near me'}
        </button>
        {error !== null && (
          <p role="alert" className="text-status-red mt-3 text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {facilities.map((facility) => {
        const Icon = FACILITY_ICON[facility.kind];
        return (
          <li
            key={facility.id}
            className="bg-ink flex items-center justify-between rounded-lg px-4 py-3"
          >
            <span className="flex items-center gap-3 text-sm text-white">
              <Icon className="text-brand-cyan h-4 w-4" aria-hidden="true" />
              {facility.name}
              <span className="text-xs text-neutral-500 capitalize">({facility.kind})</span>
            </span>
            <span className="text-xs text-neutral-400">
              {facility.walkMinutes === null ? 'unavailable' : `${facility.walkMinutes} min walk`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Help / assistance
// ---------------------------------------------------------------------------

const HELP_CATEGORIES = [
  { value: 'navigation', label: 'Help finding my way' },
  { value: 'accessibility', label: 'Accessibility support' },
  { value: 'language', label: 'Language help' },
  { value: 'medical_nonurgent', label: 'Non-urgent medical' },
  { value: 'other', label: 'Something else' },
] as const;

function HelpPanel() {
  const [category, setCategory] = useState<(typeof HELP_CATEGORIES)[number]['value']>('navigation');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submitRequest();
  }

  async function submitRequest() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/fan/assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          clientRequestId: uuid(),
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, 'Could not send your request.'));
        return;
      }
      setDone(true);
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="py-6 text-center">
        <div className="bg-status-green/20 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <MapPin className="text-status-green h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-4 font-semibold text-white">Request sent</p>
        <p className="mt-1 text-sm text-neutral-400">
          A volunteer near your gate has been notified and will acknowledge shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-neutral-400">
        Request a volunteer. Your gate location is shared automatically.
      </p>
      <div>
        <label htmlFor="help-category" className="block text-sm font-medium text-neutral-300">
          What do you need?
        </label>
        <select
          id="help-category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as (typeof HELP_CATEGORIES)[number]['value'])
          }
          className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-2.5 text-sm text-white"
        >
          {HELP_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="help-description" className="block text-sm font-medium text-neutral-300">
          Details
        </label>
        <textarea
          id="help-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          minLength={5}
          maxLength={500}
          placeholder="Briefly describe how we can help…"
          className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-2.5 text-sm text-white placeholder:text-neutral-600"
        />
      </div>
      {error !== null && (
        <p role="alert" className="text-status-red text-sm">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || description.trim().length < 5}
        className="bg-brand-blue hover:bg-brand-blue/85 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {busy ? 'Sending…' : 'Request a volunteer'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

function AccessPanel({ stepFreeInitial }: { stepFreeInitial: boolean }) {
  const [stepFree, setStepFree] = useState(stepFreeInitial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle(next: boolean) {
    setStepFree(next);
    setBusy(true);
    setSaved(false);
    try {
      const response = await fetch('/api/fan/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          accessibilityProfile: {
            flags: next ? ['step_free', 'wheelchair'] : [],
            preferredLanguage: 'en',
            reducedMotion: false,
            highContrast: false,
            fontSize: 'normal',
          },
        }),
      });
      if (response.ok) {
        setSaved(true);
      } else {
        setStepFree(!next);
      }
    } catch {
      setStepFree(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        Turn on step-free routing to avoid stairs. Your route recalculates immediately using lifts
        and ramps only.
      </p>
      <div className="border-surface-line bg-ink flex items-center justify-between rounded-lg border px-4 py-3">
        <span id="stepfree-label" className="flex items-center gap-3 text-sm text-white">
          <Accessibility className="text-brand-cyan h-5 w-5" aria-hidden="true" />
          Step-free route (avoid stairs)
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={stepFree}
          aria-labelledby="stepfree-label"
          disabled={busy}
          onClick={() => void toggle(!stepFree)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            stepFree ? 'bg-status-green' : 'bg-surface-line'
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              stepFree ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      {saved && (
        <p role="status" className="text-status-green text-sm">
          Preferences saved — your route has been updated.
        </p>
      )}
    </div>
  );
}
