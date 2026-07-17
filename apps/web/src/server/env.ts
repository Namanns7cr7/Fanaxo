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
  /** 'anthropic' uses the Claude API; 'mock' is the deterministic fallback. */
  AI_PROVIDER: z.enum(['anthropic', 'mock']).default('mock'),
  ANTHROPIC_API_KEY: z.string().optional(),
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
