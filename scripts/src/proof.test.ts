import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeProof, defaultProofPath } from './proof.js';
import type { ScoringResult } from './tokens/commands/score.js';

const sampleResult = (path: string): ScoringResult => ({
  skillPath: path,
  complexity: 'compact',
  tokenCount: 400,
  moduleCount: 2,
  specChecks: [
    { name: 'frontmatter', status: 'ok', message: 'valid' }
  ],
  checks: [
    { name: 'description-density', status: 'ok', message: 'within limits' },
    { name: 'routing-clarity', status: 'warning', message: 'add INVOKES section' }
  ]
});

describe('writeProof', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sensei-proof-'));
    writeFileSync(join(dir, 'SKILL.md'),
      '---\nname: test-skill\ndescription: "trigger me"\n---\n\n# body\n');
  });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('writes sensei-audit.md to default path', () => {
    const out = writeProof({ skillDir: dir, result: sampleResult(dir) });
    expect(out).toBe(defaultProofPath(dir));
    expect(existsSync(out)).toBe(true);
    const md = readFileSync(out, 'utf-8');
    expect(md).toContain('# Sensei Audit');
    expect(md).toContain('## Frontmatter');
    expect(md).toContain('name: test-skill');
    expect(md).toContain('## Score Summary');
    expect(md).toContain('Complexity:** compact');
    expect(md).toContain('## Advisory Checks');
    expect(md).toContain('routing-clarity');
  });

  it('honors custom outputPath', () => {
    const custom = join(dir, 'subdir-out.md');
    const out = writeProof({ skillDir: dir, result: sampleResult(dir), outputPath: custom });
    expect(out).toBe(custom);
    expect(existsSync(custom)).toBe(true);
  });

  it('includes repo policy section when policy detected', () => {
    const out = writeProof({
      skillDir: dir,
      result: sampleResult(dir),
      policy: { shortDescriptionsPreferred: true, source: '.sensei.json', evidence: 'opt-in' }
    });
    const md = readFileSync(out, 'utf-8');
    expect(md).toContain('## Repo-Local Policy Detected');
    expect(md).toContain('.sensei.json');
    expect(md).toContain('suppressed');
  });

  it('omits policy section when no policy is in effect', () => {
    const out = writeProof({
      skillDir: dir,
      result: sampleResult(dir),
      policy: { shortDescriptionsPreferred: false, source: null, evidence: null }
    });
    const md = readFileSync(out, 'utf-8');
    expect(md).not.toContain('## Repo-Local Policy Detected');
  });

  it('handles missing SKILL.md gracefully', () => {
    const empty = mkdtempSync(join(tmpdir(), 'sensei-proof-empty-'));
    try {
      const out = writeProof({ skillDir: empty, result: sampleResult(empty) });
      const md = readFileSync(out, 'utf-8');
      expect(md).toContain('(SKILL.md not found)');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
