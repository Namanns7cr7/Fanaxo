import { describe, expect, it } from 'vitest';

import {
  generateSessionToken,
  hashSessionToken,
  hashTicketToken,
  tokenHashMatches,
} from './tokens.js';

describe('ticket token hashing', () => {
  it('produces a stable one-way hash', () => {
    const hash = hashTicketToken('FNX-DEMO-TICKET-0001');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashTicketToken('FNX-DEMO-TICKET-0001')).toBe(hash);
  });

  it('matches only the original token', () => {
    const storedHash = hashTicketToken('FNX-DEMO-TICKET-0001');
    expect(tokenHashMatches('FNX-DEMO-TICKET-0001', storedHash)).toBe(true);
    expect(tokenHashMatches('FNX-DEMO-TICKET-0002', storedHash)).toBe(false);
    expect(tokenHashMatches('', storedHash)).toBe(false);
  });

  it('rejects malformed stored hashes without throwing', () => {
    expect(tokenHashMatches('anything', 'not-a-hex-hash')).toBe(false);
  });
});

describe('session tokens', () => {
  it('generates unique high-entropy tokens', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40); // 32 bytes base64url
  });

  it('hashes session tokens for storage', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
