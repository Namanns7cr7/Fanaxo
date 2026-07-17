'use client';

import { Loader2, TowerControl } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
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
      const response = await fetch('/api/auth/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          mfaCode: mfaCode.trim(),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setErrorMessage(body.message ?? 'Sign-in failed. Please try again.');
        setBusy(false);
        return;
      }
      router.push('/operator/dashboard');
    } catch {
      setErrorMessage('Network problem — check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <main id="main" className="bg-ink flex min-h-screen flex-col items-center justify-center px-6">
      <div className="border-surface-line bg-surface w-full max-w-md rounded-2xl border p-8">
        <TowerControl className="text-brand-purple h-10 w-10" aria-hidden="true" />
        <h1 className="font-display mt-4 text-2xl font-bold text-white">Operator sign-in</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Organization account with multi-factor verification.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@organization.example"
              className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-3 text-white placeholder:text-neutral-600"
              aria-invalid={errorMessage !== null}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-surface-line bg-ink mt-1 w-full rounded-lg border px-4 py-3 text-white"
              aria-invalid={errorMessage !== null}
            />
          </div>
          <div>
            <label htmlFor="mfa" className="block text-sm font-medium text-neutral-300">
              MFA code
            </label>
            <input
              id="mfa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
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
            className="bg-brand-purple font-display hover:bg-brand-purple/85 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="border-surface-line mt-6 border-t pt-4 text-xs text-neutral-500">
          Demo account: operator@fanaxo.demo · FanaxoOps!2026 · MFA 123456
        </p>
      </div>
      <Link href="/select-role" className="mt-8 text-sm text-neutral-500 hover:text-neutral-300">
        ← Choose a different role
      </Link>
    </main>
  );
}
