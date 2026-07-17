/**
 * Process-wide rate limiter instance (pinned on globalThis across dev
 * recompiles). Rules live in @fanaxo/auth; this is just the shared store.
 */

import 'server-only';

import { SlidingWindowRateLimiter } from '@fanaxo/auth';

const globalStore = globalThis as unknown as { __fanaxoLimiter?: SlidingWindowRateLimiter };

export function getRateLimiter(): SlidingWindowRateLimiter {
  globalStore.__fanaxoLimiter ??= new SlidingWindowRateLimiter();
  return globalStore.__fanaxoLimiter;
}
