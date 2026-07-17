'use client';

import { HardHat, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { readApiError } from '@/lib/api-error';

export default function VolunteerLoginPage() {
  const router = useRouter();
  const [badgeId, setBadgeId] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/auth/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId: badgeId.trim(), otp: otp.trim() }),
      });
      if (!response.ok) {
        setErrorMessage(await readApiError(response, 'Sign-in failed. Please try again.'));
        setBusy(false);
        return;
      }
      router.push('/volunteer/dashboard');
    } catch {
      setErrorMessage('Network problem — check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <main id="main" className="bg-ink flex min-h-screen flex-col items-center justify-center px-6">
      <div className="border-surface-line bg-surface w-full max-w-md rounded-2xl border p-8">
        <HardHat className="text-status-lime h-10 w-10" aria-hidden="true" />
        <h1 className="font-display mt-4 text-2xl font-bold text-white">Volunteer sign-in</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Use your staff badge ID and the one-time code from your briefing.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="badge-id" className="block text-sm font-medium text-neutral-300">
              Badge ID
            </label>
            <input
              id="badge-id"
              type="text"
              autoComplete="username"
              value={badgeId}
              onChange={(event) => setBadgeId(event.target.value)}
              placeholder="V-1001"
              className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-3 font-mono text-white placeholder:text-neutral-600"
              aria-invalid={errorMessage !== null}
            />
          </div>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-neutral-300">
              One-time code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="6-digit code"
              className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-3 font-mono text-white placeholder:text-neutral-600"
              aria-invalid={errorMessage !== null}
            />
          </div>

          {errorMessage !== null && (
            <p role="alert" className="text-status-red text-sm">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-status-lime font-display text-ink hover:bg-status-lime/85 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="border-surface-line mt-6 border-t pt-4 text-xs text-neutral-500">
          Demo badges: V-1001 … V-1008 · code 123456
        </p>
      </div>
      <Link href="/select-role" className="mt-8 text-sm text-neutral-500 hover:text-neutral-300">
        ← Choose a different role
      </Link>
    </main>
  );
}
