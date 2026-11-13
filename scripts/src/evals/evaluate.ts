import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getErrorMessage } from '../tokens/commands/types.js';
import { resolvePathFromRoot, resolveRootDir } from '../tokens/commands/utils.js';

const MAX_BYTES = 1024 * 1024;
const MAX_DURATION_MS = 600_000;

interface ContainsAssertion {
  id: string;
  kind: 'contains';
  contains: string;
}

function validateSchema(schema: Record<string, unknown>, label: string): void {
  const supported = new Set(['type', 'required', 'properties']);
  const unsupported = Object.keys(schema).filter(key => !supported.has(key));
  if (unsupported.length > 0) {
    throw new Error(`${label} contains unsupported JSON Schema keywords: ${unsupported.join(', ')}`);
  }
  if (schema.type !== undefined &&
      !['null', 'array', 'object', 'string', 'number', 'boolean'].includes(String(schema.type))) {
    throw new Error(`${label}.type is unsupported: ${String(schema.type)}`);
  }
  if (schema.required !== undefined &&
      (!Array.isArray(schema.required) || schema.required.some(key => typeof key !== 'string'))) {
    throw new Error(`${label}.required must be an array of strings`);
  }
  if (schema.properties !== undefined) {
    const properties = object(schema.properties, `${label}.properties`);
    for (const [key, child] of Object.entries(properties)) {
      validateSchema(object(child, `${label}.properties.${key}`), `${label}.properties.${key}`);
    }
  }
}

interface MatchesAssertion {
  id: string;
  kind: 'matches';
  matches: string;
}

interface NotContainsAssertion {
  id: string;
  kind: 'not-contains';
  notContains: string;
}

interface JsonSchemaAssertion {
  id: string;
  kind: 'json-schema';
  jsonSchema: Record<string, unknown>;
}

interface ArtifactAssertion {
  id: string;
  kind: 'artifact';
  artifact: { path: string; contains: string | null };
}

interface TrajectoryAssertion {
  id: string;
  kind: 'trajectory';
  trajectory: { tool: string; arguments: Record<string, unknown> | null };
}

interface CommandAssertion {
  id: string;
  kind: 'command';
  command: string[];
}

type Assertion =
  | ContainsAssertion
  | NotContainsAssertion
  | MatchesAssertion
  | JsonSchemaAssertion
  | ArtifactAssertion
  | TrajectoryAssertion
  | CommandAssertion;

interface EvalCase {
  id: string;
  prompt: string;
  shouldActivate: boolean;
  category: 'positive' | 'near-miss' | 'sibling-collision';
  dataset: 'train' | 'holdout';
  assertions: Assertion[];
}

interface MinimumLift {
  routingAccuracy?: number;
  assertionPassRate?: number;
}

interface Manifest {
  version: 1;
  adapter: string[];
  skill: string;
  baseline: { kind: 'without-skill' | 'prior-version'; skill: string | null };
  repetitions: number;
  timeoutMs: number;
  cases: EvalCase[];
  claimImprovement: boolean;
  minimumLift: MinimumLift | null;
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
  caseCategory: EvalCase['category'];
  dataset: EvalCase['dataset'];
  invoked: boolean | null;
  activationEvidence: Evidence | null;
  unavailableReason?: string;
  output?: string;
  assertions: { id: string; kind: Assertion['kind']; passed: boolean; expected: string; detail?: string }[];
  artifacts?: Record<string, string>;
  trajectory?: readonly { tool: string; arguments: Record<string, unknown> }[];
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

function rateThreshold(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -1 || value > 1) {
    throw new Error(`${label} must be a finite number from -1 to 1`);
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
  keys(raw, [
    'version', 'adapter', 'skill', 'baseline', 'repetitions', 'timeoutMs', 'cases',
    'claimImprovement', 'minimumLift'
  ], 'manifest');
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
  if (baselineSkill !== null) {
    const candidateStat = statSync(skill);
    const baselineStat = statSync(baselineSkill);
    if (candidateStat.dev === baselineStat.dev && candidateStat.ino === baselineStat.ino) {
      throw new Error('prior-version baseline must use a different skill file');
    }
  }
  const repetitions = integer(raw.repetitions, 'repetitions', 100);
  const timeoutMs = integer(raw.timeoutMs ?? 30_000, 'timeoutMs', 120_000);
  if (raw.claimImprovement !== undefined && typeof raw.claimImprovement !== 'boolean') {
    throw new Error('claimImprovement must be boolean');
  }
  const claimImprovement = raw.claimImprovement === true;
  let minimumLift: MinimumLift | null = null;
  if (raw.minimumLift !== undefined) {
    const lift = object(raw.minimumLift, 'minimumLift');
    keys(lift, ['routingAccuracy', 'assertionPassRate'], 'minimumLift');
    if (lift.routingAccuracy === undefined && lift.assertionPassRate === undefined) {
      throw new Error('minimumLift must define routingAccuracy or assertionPassRate');
    }
    minimumLift = {
      routingAccuracy: lift.routingAccuracy === undefined
        ? undefined
        : rateThreshold(lift.routingAccuracy, 'minimumLift.routingAccuracy'),
      assertionPassRate: lift.assertionPassRate === undefined
        ? undefined
        : rateThreshold(lift.assertionPassRate, 'minimumLift.assertionPassRate')
    };
  }
  if (claimImprovement && minimumLift === null) {
    throw new Error('claimImprovement requires an explicit minimumLift');
  }
  if (claimImprovement && minimumLift &&
      [minimumLift.routingAccuracy, minimumLift.assertionPassRate]
        .some(value => value !== undefined && value <= 0)) {
    throw new Error('claimImprovement requires every configured minimumLift to be greater than zero');
  }
  if (!Array.isArray(raw.cases) || !raw.cases.length) throw new Error('cases must be a nonempty array');
  const cases: EvalCase[] = raw.cases.map((value) => {
    const c = object(value, 'case');
    keys(c, ['id', 'prompt', 'shouldActivate', 'category', 'dataset', 'assertions'], 'case');
    if (typeof c.shouldActivate !== 'boolean') throw new Error('case.shouldActivate must be boolean');
    const category = c.category ?? (c.shouldActivate ? 'positive' : 'near-miss');
    if (!['positive', 'near-miss', 'sibling-collision'].includes(category as string)) {
      throw new Error('case.category must be positive, near-miss, or sibling-collision');
    }
    if (category === 'positive' && !c.shouldActivate) throw new Error('positive cases must activate');
    if (category !== 'positive' && c.shouldActivate) throw new Error(`${category} cases must not activate`);
    const dataset = c.dataset ?? 'train';
    if (dataset !== 'train' && dataset !== 'holdout') throw new Error('case.dataset must be train or holdout');
    if (!Array.isArray(c.assertions) || !c.assertions.length) throw new Error('case.assertions must be nonempty');
    const assertions: Assertion[] = c.assertions.map((value) => {
      const a = object(value, 'assertion');
      keys(a, ['id', 'contains', 'notContains', 'matches', 'jsonSchema', 'artifact', 'trajectory', 'command'], 'assertion');
      const id = text(a.id, 'assertion.id');
      const kinds = ['contains', 'notContains', 'matches', 'jsonSchema', 'artifact', 'trajectory', 'command']
        .filter(key => a[key] !== undefined);
      if (kinds.length !== 1) throw new Error(`assertion ${id} must define exactly one assertion kind`);
      if (a.contains !== undefined) return { id, kind: 'contains', contains: text(a.contains, 'assertion.contains') };
      if (a.notContains !== undefined) {
        return { id, kind: 'not-contains', notContains: text(a.notContains, 'assertion.notContains') };
      }
      if (a.matches !== undefined) {
        const matches = text(a.matches, 'assertion.matches');
        try {
          new RegExp(matches);
        } catch {
          throw new Error(`assertion.matches must be a valid regular expression: ${matches}`);
        }
        return { id, kind: 'matches', matches };
      }
      if (a.jsonSchema !== undefined) {
        const jsonSchema = object(a.jsonSchema, 'assertion.jsonSchema');
        validateSchema(jsonSchema, 'assertion.jsonSchema');
        return { id, kind: 'json-schema', jsonSchema };
      }
      if (a.artifact !== undefined) {
        const artifact = object(a.artifact, 'assertion.artifact');
        keys(artifact, ['path', 'contains'], 'artifact assertion');
        return {
          id,
          kind: 'artifact',
          artifact: {
            path: text(artifact.path, 'assertion.artifact.path'),
            contains: artifact.contains === undefined ? null : text(artifact.contains, 'assertion.artifact.contains')
          }
        };
      }
      if (a.trajectory !== undefined) {
        const trajectory = object(a.trajectory, 'assertion.trajectory');
        keys(trajectory, ['tool', 'arguments'], 'trajectory assertion');
        return {
          id,
          kind: 'trajectory',
          trajectory: {
            tool: text(trajectory.tool, 'assertion.trajectory.tool'),
            arguments: trajectory.arguments === undefined
              ? null
              : object(trajectory.arguments, 'assertion.trajectory.arguments')
          }
        };
      }
      if (!Array.isArray(a.command) || a.command.length === 0) {
        throw new Error('assertion.command must be a nonempty argv array');
      }
      return { id, kind: 'command', command: a.command.map(value => text(value, 'assertion.command argument')) };
    });
    unique(assertions.map((a) => a.id), 'Assertion');
    return {
      id: text(c.id, 'case.id'),
      prompt: text(c.prompt, 'case.prompt'),
      shouldActivate: c.shouldActivate,
      category: category as EvalCase['category'],
      dataset: dataset as EvalCase['dataset'],
      assertions
    };
  });
  unique(cases.map((c) => c.id), 'Case');
  if (!cases.some((c) => c.shouldActivate) || !cases.some((c) => !c.shouldActivate)) {
    throw new Error('cases must include should-trigger and near-miss cases');
  }
  if (cases.length * repetitions * 2 > 200) throw new Error('Evaluation exceeds 200 adapter runs');
  return {
    version: 1,
    adapter,
    skill,
    baseline: { kind: baseline.kind, skill: baselineSkill },
    repetitions,
    timeoutMs,
    cases,
    claimImprovement,
    minimumLift
  };
}

function schemaMatches(value: unknown, schema: Record<string, unknown>): boolean {
  const type = schema.type;
  if (type !== undefined) {
    const matches = type === 'null' ? value === null
      : type === 'array' ? Array.isArray(value)
        : type === 'object' ? Boolean(value) && typeof value === 'object' && !Array.isArray(value)
          : typeof value === type;
    if (!matches) return false;
  }
  if (Array.isArray(schema.required)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    for (const key of schema.required) {
      if (typeof key !== 'string' || !Object.hasOwn(value, key)) return false;
    }
  }
  if (schema.properties !== undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const properties = object(schema.properties, 'jsonSchema.properties');
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key) &&
          !schemaMatches((value as Record<string, unknown>)[key], object(childSchema, `jsonSchema.properties.${key}`))) {
        return false;
      }
    }
  }
  return true;
}

function assertionExpected(assertion: Assertion): string {
  switch (assertion.kind) {
    case 'contains': return assertion.contains;
    case 'not-contains': return `not ${assertion.notContains}`;
    case 'matches': return `/${assertion.matches}/`;
    case 'json-schema': return JSON.stringify(assertion.jsonSchema);
    case 'artifact': return assertion.artifact.contains
      ? `${assertion.artifact.path} contains ${assertion.artifact.contains}`
      : assertion.artifact.path;
    case 'trajectory': return assertion.trajectory.tool;
    case 'command': return assertion.command.join(' ');
  }
}

function argumentsMatch(
  actual: Record<string, unknown>,
  expected: Record<string, unknown> | null
): boolean {
  if (expected === null) return true;
  return Object.entries(expected).every(([key, value]) =>
    JSON.stringify(actual[key]) === JSON.stringify(value)
  );
}

function regexMatches(pattern: string, output: string, cwd: string, deadlineMs: number): boolean {
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs <= 0) throw new Error('Evaluation time budget exhausted before regex assertion');
  const script = [
    "let input='';",
    "process.stdin.on('data', chunk => input += chunk);",
    "process.stdin.on('end', () => {",
    "  const value = JSON.parse(input);",
    "  process.exit(new RegExp(value.pattern).test(value.output) ? 0 : 1);",
    "});"
  ].join('\n');
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd,
    shell: false,
    encoding: 'utf8',
    maxBuffer: MAX_BYTES,
    timeout: remainingMs,
    killSignal: 'SIGKILL',
    input: JSON.stringify({ pattern, output })
  });
  if (result.error) throw new Error(`Regex assertion execution failed: ${result.error.message}`);
  return result.status === 0;
}

function observe(
  value: unknown,
  run: EvalRun,
  assertions: readonly Assertion[],
  cwd: string,
  deadlineMs: number
): void {
  const response = object(value, 'adapter response');
  keys(response, [
    'version', 'requestId', 'caseId', 'repetition', 'variant', 'activation',
    'output', 'tokens', 'artifacts', 'trajectory'
  ], 'response');
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
  let artifacts: Record<string, string> = {};
  if (response.artifacts !== undefined) {
    const rawArtifacts = object(response.artifacts, 'artifacts');
    artifacts = Object.fromEntries(Object.entries(rawArtifacts).map(([path, content]) => [
      path,
      text(content, `artifact ${path}`)
    ]));
    run.artifacts = artifacts;
  }
  let trajectory: { tool: string; arguments: Record<string, unknown> }[] = [];
  if (response.trajectory !== undefined) {
    if (!Array.isArray(response.trajectory)) throw new Error('trajectory must be an array');
    trajectory = response.trajectory.map((event, index) => {
      const item = object(event, `trajectory[${index}]`);
      keys(item, ['tool', 'arguments'], 'trajectory event');
      return {
        tool: text(item.tool, 'trajectory.tool'),
        arguments: item.arguments === undefined ? {} : object(item.arguments, 'trajectory.arguments')
      };
    });
    run.trajectory = trajectory;
  }
  run.assertions = assertions.map(assertion => {
    let passed = false;
    let detail: string | undefined;
    switch (assertion.kind) {
      case 'contains':
        passed = output.includes(assertion.contains);
        break;
      case 'not-contains':
        passed = !output.includes(assertion.notContains);
        break;
      case 'matches':
        passed = regexMatches(assertion.matches, output, cwd, deadlineMs);
        break;
      case 'json-schema':
        try {
          passed = schemaMatches(JSON.parse(output), assertion.jsonSchema);
        } catch (error) {
          detail = `Output is not valid JSON: ${getErrorMessage(error)}`;
        }
        break;
      case 'artifact': {
        const content = artifacts[assertion.artifact.path];
        passed = content !== undefined
          && (assertion.artifact.contains === null || content.includes(assertion.artifact.contains));
        break;
      }
      case 'trajectory':
        passed = trajectory.some(event =>
          event.tool === assertion.trajectory.tool
          && argumentsMatch(event.arguments, assertion.trajectory.arguments)
        );
        break;
      case 'command': {
        const remainingMs = deadlineMs - Date.now();
        if (remainingMs <= 0) throw new Error('Evaluation time budget exhausted before command assertion');
        const result = spawnSync(assertion.command[0], assertion.command.slice(1), {
          cwd,
          shell: false,
          encoding: 'utf8',
          maxBuffer: MAX_BYTES,
          timeout: remainingMs,
          killSignal: 'SIGKILL',
          input: JSON.stringify({ output, artifacts, trajectory })
        });
        if (result.error) throw new Error(`Command assertion execution failed: ${result.error.message}`);
        passed = result.status === 0;
        detail = result.stderr.trim() || undefined;
        break;
      }
    }
    return {
      id: assertion.id,
      kind: assertion.kind,
      passed,
      expected: assertionExpected(assertion),
      detail
    };
  });
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
  const truePositives = observed.filter((r) => r.expectedActivation && r.invoked).length;
  const falsePositives = observed.filter((r) => !r.expectedActivation && r.invoked).length;
  const falseNegatives = observed.filter((r) => r.expectedActivation && !r.invoked).length;
  const trueNegatives = observed.filter((r) => !r.expectedActivation && !r.invoked).length;
  const correctness: number[] = observed.map(run => run.invoked === run.expectedActivation ? 1 : 0);
  const mean = correctness.length ? correctness.reduce((sum, item) => sum + item, 0) / correctness.length : null;
  const routingStdDev = mean === null ? null : Math.sqrt(
    correctness.reduce((sum, item) => sum + ((item - mean) ** 2), 0) / correctness.length
  );
  return {
    runs: runs.length,
    observed: observed.length,
    unavailable: runs.filter((r) => !r.error && r.invoked === null).length,
    errors: runs.filter((r) => r.error).length,
    activationRate: rate(observed.filter((r) => r.invoked).length, observed.length),
    routingAccuracy: rate(observed.filter((r) => r.invoked === r.expectedActivation).length, observed.length),
    assertionPassRate: rate(assertions.filter((a) => a.passed).length, assertions.length),
    precision: rate(truePositives, truePositives + falsePositives),
    recall: rate(truePositives, truePositives + falseNegatives),
    falsePositiveRate: rate(falsePositives, falsePositives + trueNegatives),
    routingStdDev
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
          caseCategory: c.category,
          dataset: c.dataset,
          invoked: null, activationEvidence: null, durationMs: 0,
          assertions: c.assertions.map((a) => ({
            id: a.id,
            kind: a.kind,
            expected: assertionExpected(a),
            passed: false
          }))
        };
        runs.push(run);
        const runStart = Date.now();
        const runDeadline = Math.min(started + MAX_DURATION_MS, runStart + manifest.timeoutMs);
        try {
          const remaining = runDeadline - Date.now();
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
          observe(JSON.parse(result.stdout), run, c.assertions, dirname(path), runDeadline);
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
  const holdoutCandidate = summarize(runs.filter((r) => r.variant === 'candidate' && r.dataset === 'holdout'));
  const unavailable = runs.some((r) => r.error || r.invoked === null);
  const failed = runs.some((r) => r.variant === 'candidate' &&
    (r.invoked !== r.expectedActivation || r.assertions.some((a) => !a.passed)));
  const delta = (a: number | null, b: number | null) => a === null || b === null ? null : a - b;
  const deltas = {
    activationRate: delta(candidate.activationRate, baseline.activationRate),
    routingAccuracy: delta(candidate.routingAccuracy, baseline.routingAccuracy),
    assertionPassRate: delta(candidate.assertionPassRate, baseline.assertionPassRate)
  };
  const liftFailures: string[] = [];
  if (manifest.minimumLift?.routingAccuracy !== undefined &&
      (deltas.routingAccuracy === null || deltas.routingAccuracy < manifest.minimumLift.routingAccuracy)) {
    liftFailures.push(`routingAccuracy requires ${manifest.minimumLift.routingAccuracy}, observed ${deltas.routingAccuracy}`);
  }
  if (manifest.minimumLift?.assertionPassRate !== undefined &&
      (deltas.assertionPassRate === null || deltas.assertionPassRate < manifest.minimumLift.assertionPassRate)) {
    liftFailures.push(`assertionPassRate requires ${manifest.minimumLift.assertionPassRate}, observed ${deltas.assertionPassRate}`);
  }
  return {
    version: 1,
    status: unavailable ? 'unavailable' : failed || liftFailures.length > 0 ? 'failed' : 'passed',
    baselineKind: manifest.baseline.kind,
    expectedRuns: manifest.cases.length * manifest.repetitions * 2,
    candidate, baseline, holdoutCandidate,
    deltas,
    liftGate: {
      configured: manifest.minimumLift !== null,
      claimImprovement: manifest.claimImprovement,
      passed: liftFailures.length === 0,
      failures: liftFailures
    },
    limitations: 'Adapter-supplied observations; Sensei validates structure, not trace authenticity. Baseline deltas are descriptive unless minimumLift is configured and never establish causal proof.',
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
