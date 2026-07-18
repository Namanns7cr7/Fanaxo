/**
 * Server-only environment validation (spec 08 §7).
 * Fails fast at startup with a readable message; never import from client code.
 */

import 'server-only';

import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** SQLite file path for the demo database. */
  DATABASE_FILE: z.string().min(1).default('.data/fanaxo.db'),
  /** Secret for hashing session tokens at rest; any long random string. */
  SESSION_SECRET: z.string().min(16).default('fanaxo-demo-session-secret-not-for-production'),
  /**
   * Which live model backs the copilots:
   *  - 'anthropic' → Claude API (needs ANTHROPIC_API_KEY)
   *  - 'google'    → Gemini 2.5 API (needs GEMINI_API_KEY)
   *  - 'mock'      → deterministic fallback, no secrets
   */
  AI_PROVIDER: z.enum(['anthropic', 'google', 'mock']).default('mock'),
  /** Empty/whitespace normalizes to undefined so an unset key never "looks" configured. */
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.trim() === '' ? undefined : value)),
  /** Gemini key (Google AI Studio). Same empty→undefined normalization as above. */
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.trim() === '' ? undefined : value)),
  /** Demo mode enables seeded data, demo credentials, and the reset endpoint. */
  DEMO_MODE: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached === null) {
    // Read each key by name: bundlers (Next.js/webpack) only inline
    // explicitly-referenced process.env keys, so passing process.env
    // wholesale to safeParse would drop everything and skip the defaults.
    const raw = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_FILE: process.env.DATABASE_FILE,
      SESSION_SECRET: process.env.SESSION_SECRET,
      AI_PROVIDER: process.env.AI_PROVIDER,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      DEMO_MODE: process.env.DEMO_MODE,
    };
    const parsed = EnvSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid server environment: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/**
 * Single source of truth for whether the live Claude path is active.
 * True only when the provider is 'anthropic' and a non-empty key is present.
 */
export function isClaudeEnabled(): boolean {
  const env = getEnv();
  return env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY !== undefined;
}

/**
 * Whether the live Gemini path is active.
 * True only when the provider is 'google' and a non-empty key is present.
 */
export function isGeminiEnabled(): boolean {
  const env = getEnv();
  return env.AI_PROVIDER === 'google' && env.GEMINI_API_KEY !== undefined;
}

/** True when any live model backs the copilots (Claude or Gemini). */
export function isAiEnabled(): boolean {
  return isClaudeEnabled() || isGeminiEnabled();
}

/** Human-readable label of the active copilot model, for UI badges. */
export function activeAiLabel(): string {
  if (isClaudeEnabled()) {
    return 'Claude';
  }
  if (isGeminiEnabled()) {
    return 'Gemini';
  }
  return 'Deterministic';
}
