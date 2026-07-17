'use client';

import { Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { readApiError } from '@/lib/api-error';

const DEMO_TICKET_TOKEN = 'FNX-DEMO-GATEC-214-0001';

export default function FanTicketPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function verify(ticketToken: string) {
    setStatus('verifying');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/fan/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ticketToken }),
      });
      if (!response.ok) {
        setStatus('error');
        setErrorMessage(await readApiError(response, 'Verification failed. Please try again.'));
        return;
      }
      router.push('/fan/dashboard');
    } catch {
      setStatus('error');
      setErrorMessage('Network problem — check your connection and try again.');
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (token.trim().length >= 8) {
      void verify(token.trim());
    } else {
      setStatus('error');
      setErrorMessage('Ticket codes are at least 8 characters.');
    }
  }

  const busy = status === 'verifying';

  return (
    <main id="main" className="bg-ink flex min-h-screen flex-col items-center justify-center px-6">
      <div className="border-surface-line bg-surface w-full max-w-md rounded-2xl border p-8">
        <Ticket className="text-brand-blue h-10 w-10" aria-hidden="true" />
        <h1 className="font-display mt-4 text-2xl font-bold text-white">Verify your ticket</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Enter the code on your match ticket. We only send an opaque token — never personal
          details.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="ticket-token" className="block text-sm font-medium text-neutral-300">
              Ticket code
            </label>
            <input
              id="ticket-token"
              name="ticket-token"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="FNX-…"
              className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-3 font-mono text-white placeholder:text-neutral-600"
              aria-describedby={errorMessage === null ? undefined : 'ticket-error'}
              aria-invalid={status === 'error'}
            />
          </div>

          {errorMessage !== null && (
            <p id="ticket-error" role="alert" className="text-status-red text-sm">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-brand-blue font-display hover:bg-brand-blue/85 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Verifying ticket…' : 'Verify ticket'}
          </button>
        </form>

        <div className="border-surface-line mt-6 border-t pt-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void verify(DEMO_TICKET_TOKEN)}
            className="border-brand-cyan/40 text-brand-cyan hover:bg-brand-cyan/10 w-full rounded-lg border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            Use the demo ticket (Gate C · Section 214)
          </button>
        </div>
      </div>
      <Link href="/select-role" className="mt-8 text-sm text-neutral-500 hover:text-neutral-300">
        ← Choose a different role
      </Link>
    </main>
  );
}
