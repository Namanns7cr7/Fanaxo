/**
 * Deterministic demo identifiers (spec 05 §10).
 *
 * Every seeded row derives its UUID from a stable name, so tests, demos, and
 * documentation reference identical IDs on every machine and every reseed.
 * The output is a valid RFC-4122-shaped UUID (version and variant bits set).
 */

import { createHash } from 'node:crypto';

export function demoId(name: string): string {
  const digest = createHash('sha256').update(`fanaxo-demo:${name}`).digest('hex');
  const hex = digest.slice(0, 32).split('');
  hex[12] = '4'; // version nibble
  hex[16] = '8'; // variant nibble
  const raw = hex.join('');
  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    raw.slice(12, 16),
    raw.slice(16, 20),
    raw.slice(20, 32),
  ].join('-');
}
