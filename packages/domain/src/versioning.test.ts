import { describe, expect, it } from 'vitest';

import { checkExpectedVersion, shouldApplyEvent } from './versioning.js';

describe('checkExpectedVersion', () => {
  it('returns the next version when versions match', () => {
    const result = checkExpectedVersion(3, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(4);
    }
  });

  it('returns a conflict when the caller read stale data', () => {
    const result = checkExpectedVersion(5, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('version_conflict');
    }
  });
});

describe('shouldApplyEvent (out-of-order protection)', () => {
  it('applies events when no local state exists yet', () => {
    expect(shouldApplyEvent(undefined, 1)).toBe(true);
  });

  it('applies strictly newer events only', () => {
    expect(shouldApplyEvent(4, 5)).toBe(true);
    expect(shouldApplyEvent(5, 5)).toBe(false); // duplicate delivery
    expect(shouldApplyEvent(6, 5)).toBe(false); // out-of-order delivery
  });
});
