/**
 * Sliding-window rate limiter (spec 07 §5).
 *
 * Pure in-memory implementation suitable for the single-instance demo and
 * unit testing. The store is injectable so a shared store (e.g. Redis) can
 * replace it without touching call sites.
 */

export interface RateLimitRule {
  readonly windowMs: number;
  readonly maxRequests: number;
}

/** Default rules for abuse-prone endpoints. */
export const RATE_LIMIT_RULES = {
  ticketVerify: { windowMs: 60_000, maxRequests: 10 },
  staffLogin: { windowMs: 60_000, maxRequests: 5 },
  incidentCreate: { windowMs: 60_000, maxRequests: 6 },
  aiPrompt: { windowMs: 60_000, maxRequests: 20 },
  notificationCreate: { windowMs: 60_000, maxRequests: 10 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Seconds until the caller may retry; 0 when allowed. */
  readonly retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  check(key: string, rule: RateLimitRule): RateLimitResult {
    const currentTime = this.now();
    const windowStart = currentTime - rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > windowStart);

    if (recent.length >= rule.maxRequests) {
      const oldest = recent[0] ?? currentTime;
      const retryAfterSeconds = Math.ceil((oldest + rule.windowMs - currentTime) / 1000);
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }

    recent.push(currentTime);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Drop expired entries; call periodically to bound memory. */
  prune(maxWindowMs: number): void {
    const cutoff = this.now() - maxWindowMs;
    for (const [key, times] of this.hits) {
      const recent = times.filter((time) => time > cutoff);
      if (recent.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, recent);
      }
    }
  }
}
