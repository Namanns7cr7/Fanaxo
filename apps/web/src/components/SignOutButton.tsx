'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Client sign-out: calls the logout API (which invalidates the server session
 * and clears the cookie), then navigates home. Uses fetch + router so it works
 * reliably regardless of redirect handling and gives the user clear feedback.
 */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the network call fails, send the user to the public landing.
    }
    router.push('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void signOut()}
      className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
