import { describe, expect, it } from 'vitest';

import { IncidentCategory, IncidentSeverity } from '@fanaxo/contracts';

import { compareSeverityDesc, deriveIncidentSeverity } from './incidents.js';

describe('deriveIncidentSeverity', () => {
  it('uses the category baseline when no hint is provided', () => {
    expect(deriveIncidentSeverity(IncidentCategory.MEDICAL)).toBe(IncidentSeverity.HIGH);
    expect(deriveIncidentSeverity(IncidentCategory.FACILITY)).toBe(IncidentSeverity.LOW);
  });

  it('lets a hint raise severity above the baseline', () => {
    expect(deriveIncidentSeverity(IncidentCategory.FACILITY, IncidentSeverity.CRITICAL)).toBe(
      IncidentSeverity.CRITICAL,
    );
  });

  it('never lets a hint lower severity below the safety baseline', () => {
    expect(deriveIncidentSeverity(IncidentCategory.MEDICAL, IncidentSeverity.LOW)).toBe(
      IncidentSeverity.HIGH,
    );
    expect(deriveIncidentSeverity(IncidentCategory.LOST_CHILD, IncidentSeverity.MEDIUM)).toBe(
      IncidentSeverity.HIGH,
    );
  });

  it('covers every category with a baseline', () => {
    for (const category of Object.values(IncidentCategory)) {
      expect(deriveIncidentSeverity(category)).toBeDefined();
    }
  });
});

describe('compareSeverityDesc', () => {
  it('sorts critical before low', () => {
    const sorted = [IncidentSeverity.LOW, IncidentSeverity.CRITICAL, IncidentSeverity.MEDIUM].sort(
      compareSeverityDesc,
    );
    expect(sorted).toEqual([
      IncidentSeverity.CRITICAL,
      IncidentSeverity.MEDIUM,
      IncidentSeverity.LOW,
    ]);
  });
});
