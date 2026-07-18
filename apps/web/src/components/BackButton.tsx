'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Back navigation. Uses a real link to a known destination (not history.back)
 * so it behaves predictably after redirects and on a fresh tab.
 */
export function BackButton({
  href = '/select-role',
  label = 'Back',
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
