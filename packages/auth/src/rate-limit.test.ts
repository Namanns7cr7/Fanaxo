import { describe, expect, it } from 'vitest';

import { SlidingWindowRateLimiter } from './rate-limit.js';

describe('SlidingWindowRateLimiter', () => {
  const rule = { windowMs: 60_000, maxRequests: 3 };

  it('allows requests under the limit and blocks the overflow', () => {
    let now = 1_000_000;
    const limiter = new SlidingWindowRateLimiter(() => now);

    expect(limiter.check('ip:1', rule).allowed).toBe(true);
    expect(limiter.check('ip:1', rule).allowed).toBe(true);
    expect(limiter.check('ip:1', rule).allowed).toBe(true);

    const blocked = limiter.check('ip:1', rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    now += 61_000; // window expires
    expect(limiter.check('ip:1', rule).allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = new SlidingWindowRateLimiter(() => 1_000_000);
    for (let i = 0; i < 3; i++) {
      limiter.check('ip:1', rule);
    }
    expect(limiter.check('ip:1', rule).allowed).toBe(false);
    expect(limiter.check('ip:2', rule).allowed).toBe(true);
  });

  it('prunes expired entries to bound memory', () => {
    let now = 1_000_000;
    const limiter = new SlidingWindowRateLimiter(() => now);
    limiter.check('ip:1', rule);
    now += 120_000;
    limiter.prune(60_000);
    // After pruning, the key starts fresh.
    for (let i = 0; i < 3; i++) {
      expect(limiter.check('ip:1', rule).allowed).toBe(true);
    }
  });
});
