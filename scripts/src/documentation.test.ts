import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = join(process.cwd(), '..');
const jsonExampleDocs = [
  'README.md',
  'references/evaluation.md',
  'references/configuration.md',
  'docs/blog/sensei-launch.md',
  'demo-docs/TALKING-POINTS.md',
  'demo-docs/VIDEO-OUTLINE.md',
  'demo-docs/INTERACTIVE-GUIDE.md'
];

describe('source-checkout documentation', () => {
  it.each(jsonExampleDocs)('uses silent npm output for JSON examples in %s', file => {
    const content = readFileSync(join(repoRoot, file), 'utf8');
    expect(content).not.toMatch(/npm run tokens -- [^\n]*--format=json/);
  });

  it('produces parseable JSON with the documented npm invocation', () => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(
      npm,
      ['run', '--silent', 'tokens', '--', 'count', 'SKILL.md', '--format=json'],
      { cwd: repoRoot, encoding: 'utf8' }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout).files['SKILL.md']).toBeDefined();
  });
});
