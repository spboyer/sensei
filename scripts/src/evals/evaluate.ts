import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getErrorMessage } from '../tokens/commands/types.js';
import { resolvePathFromRoot, resolveRootDir } from '../tokens/commands/utils.js';

const MAX_BYTES = 1024 * 1024;
const MAX_DURATION_MS = 600_000;

interface Assertion {
  id: string;
  contains: string;
}

interface EvalCase {
  id: string;
  prompt: string;
  shouldActivate: boolean;
  assertions: Assertion[];
}

interface Manifest {
  version: 1;
  adapter: string[];
  skill: string;
  baseline: { kind: 'without-skill' | 'prior-version'; skill: string | null };
  repetitions: number;
  timeoutMs: number;
  cases: EvalCase[];
}

interface Evidence {
  source: string;
  excerpt: string;
}

export interface EvalRun {
  requestId: string;
  caseId: string;
  repetition: number;
  variant: 'candidate' | 'baseline';
  skill: string | null;
  expectedActivation: boolean;
  invoked: boolean | null;
  activationEvidence: Evidence | null;
  unavailableReason?: string;
  output?: string;
  assertions: { id: string; passed: boolean; expected: string }[];
  durationMs: number;
  tokens?: number;
  error?: string;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`Unknown ${label} field: ${key}`);
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a nonempty string`);
  return value;
}

function integer(value: unknown, label: string, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${label} must be an integer from 1 to ${max}`);
  }
  return value;
}

function readJson(path: string): unknown {
  if (!statSync(path).isFile() || statSync(path).size > MAX_BYTES) {
    throw new Error(`Expected a JSON file of at most ${MAX_BYTES} bytes: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function unique(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${label} IDs must be unique`);
}

function loadManifest(path: string, root: string): Manifest {
  const raw = object(readJson(path), 'manifest');
  keys(raw, ['version', 'adapter', 'skill', 'baseline', 'repetitions', 'timeoutMs', 'cases'], 'manifest');
  if (raw.version !== 1) throw new Error('manifest.version must be 1');
  if (!Array.isArray(raw.adapter) || !raw.adapter.length) throw new Error('adapter must be a nonempty argv array');
  const adapter = raw.adapter.map((arg) => text(arg, 'adapter argument'));
  const file = (value: unknown): string => {
    const full = resolvePathFromRoot(root, resolve(dirname(path), text(value, 'skill')));
    if (!statSync(full).isFile()) throw new Error(`Skill must be a file: ${full}`);
    return full;
  };
  const skill = file(raw.skill);
  const baseline = object(raw.baseline, 'baseline');
  keys(baseline, ['kind', 'skill'], 'baseline');
  if (baseline.kind !== 'without-skill' && baseline.kind !== 'prior-version') {
    throw new Error('baseline.kind must be without-skill or prior-version');
  }
  if (baseline.kind === 'without-skill' && baseline.skill !== undefined) {
    throw new Error('without-skill baseline must omit skill');
  }
  const baselineSkill = baseline.kind === 'prior-version' ? file(baseline.skill) : null;
  if (baselineSkill === skill) throw new Error('prior-version baseline must use a different skill file');
  const repetitions = integer(raw.repetitions, 'repetitions', 100);
  const timeoutMs = integer(raw.timeoutMs ?? 30_000, 'timeoutMs', 120_000);
  if (!Array.isArray(raw.cases) || !raw.cases.length) throw new Error('cases must be a nonempty array');
  const cases: EvalCase[] = raw.cases.map((value) => {
    const c = object(value, 'case');
    keys(c, ['id', 'prompt', 'shouldActivate', 'assertions'], 'case');
    if (typeof c.shouldActivate !== 'boolean') throw new Error('case.shouldActivate must be boolean');
    if (!Array.isArray(c.assertions) || !c.assertions.length) throw new Error('case.assertions must be nonempty');
    const assertions = c.assertions.map((value) => {
      const a = object(value, 'assertion');
      keys(a, ['id', 'contains'], 'assertion');
      return { id: text(a.id, 'assertion.id'), contains: text(a.contains, 'assertion.contains') };
    });
    unique(assertions.map((a) => a.id), 'Assertion');
    return { id: text(c.id, 'case.id'), prompt: text(c.prompt, 'case.prompt'), shouldActivate: c.shouldActivate, assertions };
  });
  unique(cases.map((c) => c.id), 'Case');
  if (!cases.some((c) => c.shouldActivate) || !cases.some((c) => !c.shouldActivate)) {
    throw new Error('cases must include should-trigger and near-miss cases');
  }
  if (cases.length * repetitions * 2 > 200) throw new Error('Evaluation exceeds 200 adapter runs');
  return { version: 1, adapter, skill, baseline: { kind: baseline.kind, skill: baselineSkill }, repetitions, timeoutMs, cases };
}

function observe(value: unknown, run: EvalRun): void {
  const response = object(value, 'adapter response');
  keys(response, ['version', 'requestId', 'caseId', 'repetition', 'variant', 'activation', 'output', 'tokens'], 'response');
  for (const [key, expected] of Object.entries({
    version: 1, requestId: run.requestId, caseId: run.caseId, repetition: run.repetition, variant: run.variant
  })) {
    if (response[key] !== expected) throw new Error(`Adapter response ${key} does not match request`);
  }
  const activation = object(response.activation, 'activation');
  keys(activation, ['invoked', 'evidence', 'reason'], 'activation');
  if (activation.invoked !== null && typeof activation.invoked !== 'boolean') {
    throw new Error('activation.invoked must be boolean or null');
  }
  run.invoked = activation.invoked;
  if (activation.invoked === null) {
    run.unavailableReason = text(activation.reason, 'unavailable activation reason');
  } else {
    const evidence = object(activation.evidence, 'activation.evidence');
    keys(evidence, ['source', 'excerpt'], 'evidence');
    run.activationEvidence = {
      source: text(evidence.source, 'evidence.source'),
      excerpt: text(evidence.excerpt, 'evidence.excerpt')
    };
  }
  if (typeof response.output !== 'string') throw new Error('adapter output must be a string');
  const output = response.output;
  run.output = output;
  run.assertions = run.assertions.map((a) => ({ ...a, passed: output.includes(a.expected) }));
  if (response.tokens !== undefined) {
    if (typeof response.tokens !== 'number' || !Number.isSafeInteger(response.tokens) || response.tokens < 0) {
      throw new Error('tokens must be a nonnegative safe integer when supplied');
    }
    run.tokens = response.tokens;
  }
}

function summarize(runs: EvalRun[]) {
  const observed = runs.filter((r) => !r.error && r.invoked !== null);
  const assertions = runs.filter((r) => !r.error).flatMap((r) => r.assertions);
  const rate = (n: number, total: number) => total ? n / total : null;
  return {
    runs: runs.length,
    observed: observed.length,
    unavailable: runs.filter((r) => !r.error && r.invoked === null).length,
    errors: runs.filter((r) => r.error).length,
    activationRate: rate(observed.filter((r) => r.invoked).length, observed.length),
    routingAccuracy: rate(observed.filter((r) => r.invoked === r.expectedActivation).length, observed.length),
    assertionPassRate: rate(assertions.filter((a) => a.passed).length, assertions.length)
  };
}

export function evaluate(manifestPath: string, root = process.cwd()) {
  const rootDir = resolveRootDir(root);
  const path = resolvePathFromRoot(rootDir, manifestPath);
  const manifest = loadManifest(path, rootDir);
  const started = Date.now();
  const runs: EvalRun[] = [];
  outer: for (let repetition = 1; repetition <= manifest.repetitions; repetition++) {
    for (const c of manifest.cases) {
      // Alternating order reduces order bias; adapters must still isolate host sessions.
      const variants: EvalRun['variant'][] = repetition % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'];
      for (const variant of variants) {
        const run: EvalRun = {
          requestId: randomUUID(), caseId: c.id, repetition, variant,
          skill: variant === 'candidate' ? manifest.skill : manifest.baseline.skill,
          expectedActivation: variant === 'baseline' && manifest.baseline.kind === 'without-skill' ? false : c.shouldActivate,
          invoked: null, activationEvidence: null, durationMs: 0,
          assertions: c.assertions.map((a) => ({ id: a.id, expected: a.contains, passed: false }))
        };
        runs.push(run);
        const runStart = Date.now();
        try {
          const remaining = MAX_DURATION_MS - (runStart - started);
          if (remaining <= 0) throw new Error('Evaluation exceeded 10 minute budget');
          const result = spawnSync(manifest.adapter[0], manifest.adapter.slice(1), {
            cwd: dirname(path), shell: false, encoding: 'utf8', maxBuffer: MAX_BYTES,
            timeout: Math.min(manifest.timeoutMs, remaining), killSignal: 'SIGKILL',
            input: JSON.stringify({
              version: 1, requestId: run.requestId, caseId: c.id, prompt: c.prompt,
              repetition, variant, skill: run.skill
            })
          });
          if (result.error) throw new Error(`Adapter execution failed: ${result.error.message}`);
          if (result.status !== 0) {
            throw new Error(`Adapter exited ${result.status ?? result.signal}: ${result.stderr.trim()}`);
          }
          observe(JSON.parse(result.stdout), run);
        } catch (error) {
          run.error = getErrorMessage(error);
        } finally {
          run.durationMs = Date.now() - runStart;
        }
        if (run.error) break outer;
      }
    }
  }
  const candidate = summarize(runs.filter((r) => r.variant === 'candidate'));
  const baseline = summarize(runs.filter((r) => r.variant === 'baseline'));
  const unavailable = runs.some((r) => r.error || r.invoked === null);
  const failed = runs.some((r) => r.variant === 'candidate' &&
    (r.invoked !== r.expectedActivation || r.assertions.some((a) => !a.passed)));
  const delta = (a: number | null, b: number | null) => a === null || b === null ? null : a - b;
  return {
    version: 1,
    status: unavailable ? 'unavailable' : failed ? 'failed' : 'passed',
    baselineKind: manifest.baseline.kind,
    expectedRuns: manifest.cases.length * manifest.repetitions * 2,
    candidate, baseline,
    deltas: {
      activationRate: delta(candidate.activationRate, baseline.activationRate),
      routingAccuracy: delta(candidate.routingAccuracy, baseline.routingAccuracy),
      assertionPassRate: delta(candidate.assertionPassRate, baseline.assertionPassRate)
    },
    limitations: 'Adapter-supplied observations; Sensei validates structure, not trace authenticity. Baseline deltas are descriptive, not an improvement pass gate or causal proof.',
    runs
  };
}

export function reportEvalError(error: unknown, json: boolean): void {
  const message = getErrorMessage(error);
  if (json) console.log(JSON.stringify({ version: 1, status: 'unavailable', error: message }));
  else console.error(`Evaluation unavailable: ${message}`);
  process.exitCode = 2;
}

export function runEval(paths: string[], options: Record<string, unknown>): void {
  const format = options.format ?? 'table';
  try {
    if (format !== 'table' && format !== 'json') throw new Error('eval format must be table or json');
    if (paths.length !== 1) throw new Error('eval requires exactly one manifest JSON path');
    for (const key of Object.keys(options)) {
      if (!['format', 'root'].includes(key)) throw new Error(`Unsupported eval option: ${key}`);
    }
    const report = evaluate(paths[0], typeof options.root === 'string' ? options.root : undefined);
    if (format === 'json') console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`Behavioral evaluation: ${report.status} (${report.runs.length}/${report.expectedRuns} runs)`);
      console.table({ candidate: report.candidate, baseline: report.baseline });
      console.log('Candidate minus baseline rates:', report.deltas);
      console.log(report.limitations);
      for (const run of report.runs) {
        console.log(`${run.caseId} #${run.repetition} ${run.variant}: ` +
          (run.error ?? run.unavailableReason ??
            `activation=${run.invoked}, routing=${run.invoked === run.expectedActivation}, assertions=${run.assertions.filter((a) => a.passed).length}/${run.assertions.length}`));
      }
    }
    process.exitCode = report.status === 'passed' ? 0 : report.status === 'failed' ? 1 : 2;
  } catch (error) {
    reportEvalError(error, format === 'json');
  }
}
