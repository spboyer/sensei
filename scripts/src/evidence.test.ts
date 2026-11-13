import { describe, expect, it } from 'vitest';
import type { EvidenceFinding } from './evidence.js';
import { summarizeProfiles } from './evidence.js';

const finding = (overrides: Partial<EvidenceFinding>): EvidenceFinding => ({
  id: 'test',
  profile: 'portable-spec',
  basis: 'spec',
  state: 'pass',
  severity: 'info',
  evidenceLevel: 'statically-verified',
  message: 'test',
  ...overrides
});

describe('summarizeProfiles', () => {
  it('does not turn unknown evidence into a pass', () => {
    const summaries = summarizeProfiles([
      finding({ state: 'pass' }),
      finding({ id: 'unknown', state: 'unknown' })
    ]);

    expect(summaries.find(summary => summary.profile === 'portable-spec')?.state).toBe('unknown');
  });

  it('gives failures precedence over warnings and unknowns', () => {
    const summaries = summarizeProfiles([
      finding({ state: 'warning' }),
      finding({ id: 'unknown', state: 'unknown' }),
      finding({ id: 'failure', state: 'fail' })
    ]);

    expect(summaries.find(summary => summary.profile === 'portable-spec')?.state).toBe('fail');
  });

  it('marks profiles without findings as not applicable', () => {
    const summaries = summarizeProfiles([]);
    expect(summaries.every(summary => summary.state === 'not-applicable')).toBe(true);
  });
});
