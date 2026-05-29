import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectRepoPolicy } from './repo-policy.js';

describe('detectRepoPolicy', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sensei-policy-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('returns no-policy when nothing matches', () => {
    writeFileSync(join(dir, 'README.md'), '# Project\n\nA cool tool.\n');
    const p = detectRepoPolicy(dir);
    expect(p.shortDescriptionsPreferred).toBe(false);
    expect(p.source).toBeNull();
  });

  it('detects descriptionStyle in .sensei.json', () => {
    writeFileSync(join(dir, '.sensei.json'), JSON.stringify({ descriptionStyle: 'short-trigger' }));
    const p = detectRepoPolicy(dir);
    expect(p.shortDescriptionsPreferred).toBe(true);
    expect(p.source).toBe('.sensei.json');
  });

  it('detects advisoryOverrides.minDescriptionLength: false', () => {
    writeFileSync(join(dir, '.sensei.json'), JSON.stringify({
      advisoryOverrides: { minDescriptionLength: false }
    }));
    const p = detectRepoPolicy(dir);
    expect(p.shortDescriptionsPreferred).toBe(true);
  });

  it('detects "short trigger phrase" in AGENTS.md near "description"', () => {
    writeFileSync(join(dir, 'AGENTS.md'),
      '# Agent rules\n\nSkill descriptions should be a short trigger phrase, not full documentation.\n');
    const p = detectRepoPolicy(dir);
    expect(p.shortDescriptionsPreferred).toBe(true);
    expect(p.source).toBe('AGENTS.md');
    expect(p.evidence).toMatch(/trigger/i);
  });

  it('ignores malformed .sensei.json and falls through to prose scan', () => {
    writeFileSync(join(dir, '.sensei.json'), '{not valid json');
    writeFileSync(join(dir, 'AGENTS.md'),
      'Description: keep it short, just a trigger phrase.');
    const p = detectRepoPolicy(dir);
    expect(p.shortDescriptionsPreferred).toBe(true);
    expect(p.source).toBe('AGENTS.md');
  });

  it('does not match unrelated "trigger" mentions far from "description"', () => {
    const filler = 'word '.repeat(200);
    writeFileSync(join(dir, 'README.md'), `Use a trigger phrase. ${filler} Long descriptions are fine.`);
    const p = detectRepoPolicy(dir);
    expect(p.shortDescriptionsPreferred).toBe(false);
  });

  it('returns no-policy for non-existent directory', () => {
    const p = detectRepoPolicy(join(dir, 'does-not-exist'));
    expect(p.shortDescriptionsPreferred).toBe(false);
  });
});
