import { afterEach, describe, expect, it } from 'vitest';
import { linkSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { evaluate } from './evaluate.js';

const adapter = fileURLToPath(new URL('./fixtures/adapter.mjs', import.meta.url));
const cli = fileURLToPath(new URL('../tokens/cli.ts', import.meta.url));
const loader = new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href;
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
    expect(report.candidate).toMatchObject({ precision: 1, recall: 1, falsePositiveRate: 0, routingStdDev: 0 });
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

  it('supports held-out and sibling-collision routing metadata', () => {
    const { path, root, manifest, save } = setup();
    save({
      ...manifest,
      cases: [
        { ...manifest.cases[0], category: 'positive', dataset: 'holdout' },
        { ...manifest.cases[1], category: 'sibling-collision', dataset: 'holdout' }
      ]
    });
    const report = evaluate(path, root);
    expect(report.status).toBe('passed');
    expect(report.holdoutCandidate).toMatchObject({ observed: 4, precision: 1, recall: 1, falsePositiveRate: 0 });
    expect(report.runs.every(run => run.dataset === 'holdout')).toBe(true);
    expect(report.runs[2].caseCategory).toBe('sibling-collision');
  });

  it('evaluates schema, artifact, trajectory, regex, and command assertions', () => {
    const { path, root, manifest, save } = setup('rich');
    const command = [
      process.execPath,
      '-e',
      "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.exit(JSON.parse(d).trajectory[0].tool==='Read'?0:1))"
    ];
    const assertions = [
      { id: 'regex', matches: '"status":"ok"' },
      { id: 'negative', notContains: 'incorrect' },
      { id: 'schema', jsonSchema: { type: 'object', required: ['status'], properties: { status: { type: 'string' } } } },
      { id: 'artifact', artifact: { path: 'report.json', contains: '"ok"' } },
      { id: 'trajectory', trajectory: { tool: 'Read', arguments: { path: 'SKILL.md' } } },
      { id: 'command', command }
    ];
    save({
      ...manifest,
      cases: manifest.cases.map(item => ({ ...item, assertions }))
    });
    const report = evaluate(path, root);
    expect(report.status).toBe('passed');
    expect(report.runs[0].assertions.every(assertion => assertion.passed)).toBe(true);
    expect(report.runs[0].artifacts).toHaveProperty('report.json');
    expect(report.runs[0].trajectory?.[0].tool).toBe('Read');
  });

  it('enforces explicit baseline lift when improvement is claimed', () => {
    const { path, root, manifest, save } = setup('baseline-failure');
    save({
      ...manifest,
      baseline: { kind: 'prior-version', skill: 'prior.md' },
      claimImprovement: true,
      minimumLift: { assertionPassRate: 0.5 }
    });

    const passing = evaluate(path, root);
    expect(passing.status).toBe('passed');
    expect(passing.liftGate).toMatchObject({ configured: true, claimImprovement: true, passed: true });

    save({
      ...manifest,
      claimImprovement: true,
      minimumLift: { routingAccuracy: 0.1 }
    });
    const failing = evaluate(path, root);
    expect(failing.status).toBe('failed');
    expect(failing.liftGate.failures[0]).toContain('routingAccuracy');
  });

  it('shares one run deadline across executable assertions', () => {
    const { path, root, manifest, save } = setup('rich');
    const sleeper = [
      process.execPath,
      '-e',
      'setTimeout(() => process.exit(0), 1000)'
    ];
    save({
      ...manifest,
      timeoutMs: 50,
      cases: manifest.cases.map(item => ({
        ...item,
        assertions: [
          { id: 'slow-one', command: sleeper },
          { id: 'slow-two', command: sleeper }
        ]
      }))
    });

    const started = Date.now();
    const report = evaluate(path, root);
    expect(report.status).toBe('unavailable');
    expect(report.runs[0].error).toMatch(/timed out|time budget|ETIMEDOUT/i);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('bounds catastrophic regular-expression assertions in a subprocess', () => {
    const { path, root, manifest, save } = setup('regex-output');
    save({
      ...manifest,
      timeoutMs: 100,
      cases: manifest.cases.map(item => ({
        ...item,
        assertions: [{ id: 'catastrophic', matches: '(a+)+$' }]
      }))
    });
    const started = Date.now();
    const report = evaluate(path, root);
    expect(report.status).toBe('unavailable');
    expect(report.runs[0].error).toMatch(/Regex assertion execution failed|timed out|ETIMEDOUT/i);
    expect(Date.now() - started).toBeLessThan(750);
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
    { typo: true }, { claimImprovement: true }, { minimumLift: {} },
    { minimumLift: { routingAccuracy: 2 } },
    { claimImprovement: true, minimumLift: { routingAccuracy: 0 } },
    { claimImprovement: true, minimumLift: { routingAccuracy: -0.1 } }
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

  it('rejects inconsistent case metadata and malformed rich assertions', () => {
    const { root, path, manifest, save } = setup();
    save({ ...manifest, cases: [{ ...manifest.cases[0], category: 'near-miss' }, manifest.cases[1]] });
    expect(() => evaluate(path, root)).toThrow(/must not activate/);
    save({ ...manifest, cases: [{ ...manifest.cases[0], dataset: 'test' }, manifest.cases[1]] });
    expect(() => evaluate(path, root)).toThrow(/dataset/);
    save({
      ...manifest,
      cases: [{ ...manifest.cases[0], assertions: [{ id: 'both', contains: 'x', matches: 'x' }] }, manifest.cases[1]]
    });
    expect(() => evaluate(path, root)).toThrow(/exactly one/);
    save({
      ...manifest,
      cases: [{
        ...manifest.cases[0],
        assertions: [{ id: 'schema', jsonSchema: { type: 'object', additionalProperties: false } }]
      }, manifest.cases[1]]
    });
    expect(() => evaluate(path, root)).toThrow(/unsupported JSON Schema keywords/);
    save({
      ...manifest,
      cases: [{
        ...manifest.cases[0],
        assertions: [{ id: 'own-property', jsonSchema: { type: 'object', required: ['toString'] } }]
      }, manifest.cases[1]]
    });
    expect(evaluate(path, root).status).toBe('failed');
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
