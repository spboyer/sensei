import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { scoreSkillContent } from './score.js';

interface Fixture {
  source: string;
  commit: string;
  validator: string;
  capturedAt: string;
  cases: Array<{
    id: string;
    fields: Record<string, unknown>;
    valid: boolean;
  }>;
}

const fixturePath = fileURLToPath(new URL('./fixtures/agentskills-validator.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture;

describe('canonical Agent Skills parity corpus', () => {
  it('is pinned to an immutable upstream commit', () => {
    expect(fixture.source).toBe('https://github.com/agentskills/agentskills');
    expect(fixture.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(fixture.validator).toContain('validator.py');
  });

  it.each(fixture.cases)('$id matches the captured validator result', ({ fields, valid }) => {
    const content = `---\n${stringify(fields)}---\n`;
    const result = scoreSkillContent(content);
    const passed = result.specChecks.every(check => check.status !== 'warning');
    expect(passed).toBe(valid);
  });
});
