import { describe, expect, it } from 'vitest';
import { validateHostProfile } from './host-profiles.js';

describe('validateHostProfile', () => {
  const portable = { name: 'sample', description: 'Sample skill' };

  it('passes portable fields in both profiles', () => {
    expect(validateHostProfile(portable, 'portable')[0].state).toBe('pass');
    expect(validateHostProfile(portable, 'copilot')[0].state).toBe('pass');
  });

  it('separates a valid Copilot extension from portable compliance', () => {
    const fields = { ...portable, 'user-invocable': false };
    expect(validateHostProfile(fields, 'portable')[0].state).toBe('fail');
    expect(validateHostProfile(fields, 'copilot')[0].state).toBe('pass');
  });

  it('rejects invalid Copilot extension types', () => {
    const fields = { ...portable, 'disable-model-invocation': 'false' };
    const finding = validateHostProfile(fields, 'copilot')[0];
    expect(finding.state).toBe('fail');
    expect(finding.message).toContain('expected boolean');
  });

  it('rejects unsupported Copilot context modes', () => {
    const fields = { ...portable, context: 'not-a-real-mode' };
    const finding = validateHostProfile(fields, 'copilot')[0];
    expect(finding.state).toBe('fail');
    expect(finding.message).toContain('expected "fork"');
  });

  it('rejects fields unknown to the selected host profile', () => {
    const finding = validateHostProfile({ ...portable, model: 'example' }, 'copilot')[0];
    expect(finding.state).toBe('fail');
    expect(finding.message).toContain('model (unknown)');
  });
});
