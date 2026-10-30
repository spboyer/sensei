import { afterEach, describe, expect, it } from 'vitest';
import { linkSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { evaluate } from './evaluate.js';

const adapter = fileURLToPath(new URL('./fixtures/adapter.mjs', import.meta.url));
const cli = fileURLToPath(new URL('../tokens/cli.ts', import.meta.url));
const loader = fileURLToPath(new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url));
const dirs: string[] = [];

function setup(mode = '') {
  const root = mkdtempSync(join(tmpdir(), 'sensei-eval-'));
  dirs.push(root);
  writeFileSync(join(root, 'SKILL.md'), '---\nname: fixture\n---\nFixture');
  writeFileSync(join(root, 'prior.md'), 'Previous fixture');
  const manifest = {
    version: 1,
    adapter: [process.execPath, adapter, ...(mode ? [mode] : [])],
    skill: 'SKILL.md',
    baseline: { kind: 'without-skill' },
    repetitions: 2,
    timeoutMs: 2000,
    cases: [
      { id: 'trigger', prompt: 'Improve skill routing', shouldActivate: true, assertions: [{ id: 'result', contains: 'Fixture task completed' }] },
      { id: 'near-miss', prompt: 'Explain routing only', shouldActivate: false, assertions: [{ id: 'result', contains: 'Fixture task completed' }] }
    ]
  };
  const path = join(root, 'eval.json');
  const save = (value: unknown = manifest) => writeFileSync(path, JSON.stringify(value));
  save();
  return { root, path, manifest, save };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('behavioral adapter evaluation', () => {
  it('executes repeated, correlated candidate/baseline subprocesses and retains evidence', () => {
    const { path, root } = setup();
    const report = evaluate(path, root);
    expect(report.status).toBe('passed');
    expect(report.runs).toHaveLength(8);
    expect(new Set(report.runs.map((r) => r.requestId)).size).toBe(8);
    expect(report.runs.map((r) => r.variant)).toEqual([
      'candidate', 'baseline', 'candidate', 'baseline', 'baseline', 'candidate', 'baseline', 'candidate'
    ]);
    expect(report.candidate).toMatchObject({ activationRate: 0.5, routingAccuracy: 1, assertionPassRate: 1 });
    expect(report.baseline).toMatchObject({ activationRate: 0, routingAccuracy: 1 });
    expect(report.deltas.activationRate).toBe(0.5);
    expect(report.runs[0]).toMatchObject({
      tokens: 0, output: 'Fixture task completed',
      activationEvidence: { source: 'fixture://synthetic-trace' },
      assertions: [{ id: 'result', passed: true, expected: 'Fixture task completed' }]
    });
    expect(report.runs.every((r) => r.durationMs >= 0)).toBe(true);
  });

  it('runs a prior-version baseline and treats baseline quality as descriptive', () => {
    const { path, root, manifest, save } = setup('baseline-failure');
    save({ ...manifest, baseline: { kind: 'prior-version', skill: 'prior.md' } });
    const report = evaluate(path, root);
    expect(report.status).toBe('passed');
    expect(report.baseline.assertionPassRate).toBe(0);
    expect(report.baseline.activationRate).toBe(0.5);
    expect(report.deltas.assertionPassRate).toBe(1);
    expect(report.runs.find((r) => r.variant === 'baseline')?.skill).toBe(join(root, 'prior.md'));
  });

  it.each(['symlink', 'hardlink'])('rejects a %s alias of the candidate before execution', (kind) => {
    const { path, root, manifest, save } = setup();
    const alias = join(root, 'alias.md');
    if (kind === 'symlink') symlinkSync('SKILL.md', alias);
    else linkSync(join(root, 'SKILL.md'), alias);
    save({ ...manifest, baseline: { kind: 'prior-version', skill: 'alias.md' } });
    expect(() => evaluate(path, root)).toThrow('prior-version baseline must use a different skill file');
  });

  it.each(['quality-failure', 'wrong-routing'])('fails candidate expectations: %s', (mode) => {
    const { root, path } = setup(mode);
    expect(evaluate(path, root).status).toBe('failed');
  });

  it.each([
    'failure', 'malformed', 'missing-evidence', 'empty-evidence', 'missing-output',
    'mismatch', 'baseline-mismatch', 'overflow', 'invalid-tokens',
    'missing-negative-evidence', 'invalid-activation', 'null-without-reason'
  ])('reports explicit execution/protocol errors, not passes: %s', (mode) => {
    const { root, path } = setup(mode);
    const report = evaluate(path, root);
    expect(report.status).toBe('unavailable');
    expect(report.runs.at(-1)?.error).toBeTruthy();
    expect(report.runs.length).toBeLessThan(report.expectedRuns);
  });

  it('reports null observation as unavailable, not a negative observation', () => {
    const { root, path } = setup('unobservable');
    const report = evaluate(path, root);
    expect(report.status).toBe('unavailable');
    expect(report.candidate).toMatchObject({ observed: 0, unavailable: 4, activationRate: null, routingAccuracy: null });
    expect(report.runs[0].unavailableReason).toBeTruthy();
  });

  it('does not invent token metrics when the adapter omits them', () => {
    const { root, path } = setup('no-tokens');
    const report = evaluate(path, root);
    expect(report.status).toBe('passed');
    expect(report.runs.every((run) => !('tokens' in run))).toBe(true);
  });

  it('enforces a subprocess timeout', () => {
    const { root, path, manifest, save } = setup('timeout');
    save({ ...manifest, timeoutMs: 50 });
    const report = evaluate(path, root);
    expect(report.status).toBe('unavailable');
    expect(report.runs[0].error).toMatch(/ETIMEDOUT/);
    expect(report.runs).toHaveLength(1);
  });

  it('reports a missing executable', () => {
    const { root, path, manifest, save } = setup();
    save({ ...manifest, adapter: [join(root, 'missing-executable')] });
    expect(evaluate(path, root).runs[0].error).toMatch(/ENOENT/);
  });

  it.each([
    { cases: [] }, { repetitions: 0 }, { repetitions: 101 }, { repetitions: 100 },
    { timeoutMs: 0 }, { timeoutMs: 120001 }, { adapter: [] }, { adapter: 'node' },
    { version: 2 }, { skill: 'missing.md' }, { baseline: { kind: 'recorded' } },
    { baseline: { kind: 'prior-version', skill: 'SKILL.md' } },
    { baseline: { kind: 'prior-version', skill: 'missing.md' } },
    { baseline: { kind: 'without-skill', skill: 'prior.md' } },
    { typo: true }
  ])('rejects invalid manifest before execution: %j', (patch) => {
    const { root, path, manifest, save } = setup();
    save({ ...manifest, ...patch });
    expect(() => evaluate(path, root)).toThrow();
  });

  it('rejects missing near misses, duplicate IDs and missing assertions', () => {
    const { root, path, manifest, save } = setup();
    save({ ...manifest, cases: [manifest.cases[0]] });
    expect(() => evaluate(path, root)).toThrow(/near-miss/);
    save({ ...manifest, cases: [manifest.cases[0], manifest.cases[0]] });
    expect(() => evaluate(path, root)).toThrow(/unique/);
    save({ ...manifest, cases: [{ ...manifest.cases[0], assertions: [] }, manifest.cases[1]] });
    expect(() => evaluate(path, root)).toThrow(/assertions/);
  });

  it('rejects missing/malformed files and outside-root skill paths', () => {
    const { root, path, manifest, save } = setup();
    expect(() => evaluate(join(root, 'absent.json'), root)).toThrow();
    writeFileSync(path, 'not json');
    expect(() => evaluate(path, root)).toThrow();
    save({ ...manifest, skill: adapter });
    expect(() => evaluate(path, root)).toThrow(/outside/);
  });

  it.each([['', 0], ['quality-failure', 1], ['malformed', 2]])('CLI emits JSON and exit status for %s', (mode, code) => {
    const { root, path } = setup(mode);
    const result = spawnSync(process.execPath, ['--import', loader, cli, 'eval', path, `--root=${root}`, '--format=json'], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(code);
    expect(JSON.parse(result.stdout).status).toBe(['passed', 'failed', 'unavailable'][code]);
  });

  it('CLI rejects no cases with JSON error and exit 2', () => {
    const { root, path, manifest, save } = setup();
    save({ ...manifest, cases: [] });
    const result = spawnSync(process.execPath, ['--import', loader, cli, 'eval', path, `--root=${root}`, '--format=json'], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'unavailable', error: expect.stringContaining('cases') });
  });

  it.each([
    { flags: ['--unsupported'], error: 'Unsupported eval option' },
    { flags: ['--strict'], error: 'Unsupported eval option' },
    { flags: ['--root'], error: 'Missing value' }
  ])('CLI uses exit 2 and JSON for invalid input: $flags', ({ flags, error }) => {
    const { path } = setup();
    const result = spawnSync(process.execPath, [
      '--import', loader, cli, 'eval', path, '--format=json', ...flags
    ], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'unavailable', error: expect.stringContaining(error) });
  });

  it('CLI rejects a missing manifest argument', () => {
    const result = spawnSync(process.execPath, [
      '--import', loader, cli, 'eval', '--format=json'
    ], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).error).toContain('exactly one manifest');
  });

  it('CLI renders readable summaries and rejects unsupported formats', () => {
    const { root, path } = setup();
    const result = spawnSync(process.execPath, [
      '--import', loader, cli, 'eval', path, `--root=${root}`
    ], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Behavioral evaluation: passed (8/8 runs)');
    const invalid = spawnSync(process.execPath, [
      '--import', loader, cli, 'eval', path, `--root=${root}`, '--format=csv'
    ], { encoding: 'utf8' });
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain('format must be table or json');
  });
});
