import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

function runCli(args: string[], cwd: string): string {
  return execFileSync(process.execPath, ['--import', 'tsx', 'src/tokens/cli.ts', ...args], {
    cwd,
    encoding: 'utf-8'
  });
}

function spawnCli(args: string[], cwd: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/tokens/cli.ts', ...args], {
    cwd,
    encoding: 'utf-8'
  });
}

describe('Sensei CLI integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sensei-cli-'));
    writeFileSync(join(tempDir, 'SKILL.md'), `---
name: external-skill
description: "Analyze external skills. WHEN: \\"external skill\\", \\"skill validation\\", \\"sensei check\\"."
---

# External Skill

Analyze external skills.
`);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('scores a skill from --root when invoked outside the skill directory', () => {
    const output = runCli(['score', '--root', tempDir, '--format=json'], process.cwd());
    const result = JSON.parse(output);

    expect(result.skillPath).toBe(tempDir);
    expect(result.specChecks.some((check: { name: string; status: string }) =>
      check.name === 'spec-name' && check.status === 'ok'
    )).toBe(true);
  });

  it('counts, scores and checks an external relative skill path from the Sensei checkout', () => {
    const skillPath = 'skills/external-skill';
    const skillDir = join(tempDir, skillPath);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), readFileSync(join(tempDir, 'SKILL.md'), 'utf8'));

    const count = JSON.parse(runCli(['count', '--root', tempDir, '--format=json', `${skillPath}/SKILL.md`], process.cwd()));
    expect(count.files[`${skillPath}/SKILL.md`]).toBeDefined();

    const score = JSON.parse(runCli(['score', '--root', tempDir, '--format=json', skillPath], process.cwd()));
    expect(score.skillPath).toBe(skillDir);

    const check = JSON.parse(runCli(['check', '--root', tempDir, '--format=json', `${skillPath}/SKILL.md`], process.cwd()));
    expect(check.results[0].file).toBe(`${skillPath}/SKILL.md`);
  });

  it('checks files with an explicit config relative to --root', () => {
    writeFileSync(join(tempDir, 'limits.json'), JSON.stringify({
      defaults: { 'SKILL.md': 1000, '*.md': 1000 },
      overrides: {}
    }));

    const output = runCli(['check', '--root', tempDir, '--config', 'limits.json', '--format=json', 'SKILL.md'], process.cwd());
    const result = JSON.parse(output);

    expect(result.exceededCount).toBe(0);
    expect(result.results).toEqual([
      expect.objectContaining({ file: 'SKILL.md', limit: 1000, exceeded: false })
    ]);
  });

  it('keeps optional suggestions out of spec results in CLI JSON and real proof', () => {
    const proofPath = join(tempDir, 'audit.md');
    const result = JSON.parse(runCli(['score', '--root', tempDir, '--format=json', `--emit-proof=${proofPath}`], process.cwd()));
    expect(result.specChecks.filter((check: { name: string }) => /license|version/.test(check.name))).toEqual([]);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'license-recommendation' }),
      expect.objectContaining({ name: 'version-recommendation' })
    ]));
    const proof = readFileSync(proofPath, 'utf8');
    const [spec, advisory] = proof.split('## Advisory Checks');
    expect(spec).not.toContain('license-recommendation');
    expect(advisory).toContain('license-recommendation');
    expect(proof).toContain('not observed activation');
  });

  it('reports malformed YAML via CLI and proof rather than claiming missing fields', () => {
    writeFileSync(join(tempDir, 'SKILL.md'), '---\nname: [unclosed\n---\n');
    const proofPath = join(tempDir, 'audit.md');
    const result = JSON.parse(runCli(['score', '--root', tempDir, '--format=json', `--emit-proof=${proofPath}`], process.cwd()));
    expect(result.specChecks[0].message).toContain('Cannot validate YAML');
    expect(readFileSync(proofPath, 'utf8')).toContain('Cannot validate YAML');
  });

  it('returns non-zero for strict check failures using --root and --config', () => {
    writeFileSync(join(tempDir, 'limits.json'), JSON.stringify({
      defaults: { 'SKILL.md': 1, '*.md': 1 },
      overrides: {}
    }));

    const result = spawnCli(['check', '--root', tempDir, '--config', 'limits.json', '--strict', 'SKILL.md'], process.cwd());

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('EXCEEDED');
  });

  it('rejects positional paths outside --root', () => {
    const result = spawnCli(['check', '--root', tempDir, '../outside.md'], process.cwd());

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('outside the configured root');
  });
});
