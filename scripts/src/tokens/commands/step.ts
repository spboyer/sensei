/**
 * `sensei step --append <json>` — record one Ralph-loop step into the
 * current run's `steps.ndjson`. The canvas provider tails this file and
 * broadcasts each new line over SSE to the iframe.
 *
 * The agent calls this at the end of each numbered Ralph step in SKILL.md
 * (Phase 2). It must succeed regardless of whether a canvas is open or
 * trusted — the agent should never branch on canvas availability.
 *
 * The command is also responsible for managing the run lifecycle on the
 * filesystem so callers don't need a separate "begin run" command:
 *   - On first call for a given runId, the run directory is created and
 *     `manifest.json` is written.
 *   - `latest.txt` is atomically replaced to point at this run.
 *   - Subsequent calls just append a line to `steps.ndjson`.
 *
 * Stdin form: when `--append` is `-`, the JSON payload is read from stdin.
 */

import { existsSync, mkdirSync, writeFileSync, appendFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveArtifactsDir,
  resolveLatestPointerPath,
  resolveRunDir,
} from './artifacts.js';

export interface StepOptions {
  /** ULID of the run this step belongs to. Required. */
  runId?: string;
  /** JSON payload describing the step outcome. Use '-' to read from stdin. */
  append?: string;
  /** Override the artifacts directory (mainly for testing). */
  artifactsDir?: string;
  /** Stdin stream for testing; defaults to process.stdin. */
  stdin?: NodeJS.ReadableStream;
}

/**
 * Read all bytes from a stream as UTF-8.
 *
 * Used when the `--append` argument is `-`, meaning the JSON payload is
 * piped in (common case: the agent constructs a large step record and
 * shell-pipes it to avoid argv-length limits).
 */
function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

/**
 * Validate and normalize a JSON payload from argv or stdin.
 *
 * The payload must parse as JSON and serialize back to a single line so
 * the NDJSON file stays one-record-per-line. We re-serialize rather than
 * trust the input's whitespace because the caller's shell might have
 * pretty-printed it.
 */
function normalizeStepPayload(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Empty step payload.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`Step payload is not valid JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Step payload must be a JSON object.');
  }
  // Stamp a timestamp if the caller didn't provide one — canvas can sort by it.
  const stamped = { t: new Date().toISOString(), ...(parsed as Record<string, unknown>) };
  return JSON.stringify(stamped);
}

/**
 * Atomically update `latest.txt` so a canvas watching the file never
 * observes a partial write. We write to a sibling tempfile and rename;
 * rename is atomic on the same filesystem on macOS, Linux, and Windows.
 */
function writeLatestPointer(latestPath: string, runId: string): void {
  const tmp = `${latestPath}.${process.pid}.tmp`;
  writeFileSync(tmp, runId, 'utf8');
  renameSync(tmp, latestPath);
}

/**
 * Ensure the run directory exists and seed `manifest.json` on first call.
 *
 * Manifest is intentionally minimal — the report.ts command enriches it
 * on finalize. We use `exists` rather than catching `EEXIST` so concurrent
 * `sensei step` invocations for the same runId don't race on the seed.
 */
function ensureRunSeeded(runDir: string, runId: string): void {
  if (existsSync(runDir)) return;
  mkdirSync(runDir, { recursive: true });
  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    finishedAt: null as string | null,
    schemaVersion: 1,
  };
  writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

export async function step(options: StepOptions): Promise<void> {
  if (!options.runId) {
    throw new Error('sensei step: --run-id is required.');
  }
  if (!options.append) {
    throw new Error('sensei step: --append <json|-> is required.');
  }

  const payloadRaw =
    options.append === '-'
      ? await readStdin(options.stdin ?? process.stdin)
      : options.append;
  const line = normalizeStepPayload(payloadRaw);

  const artifactsDir = resolveArtifactsDir(options.artifactsDir);
  const runDir = resolveRunDir(artifactsDir, options.runId);
  const latestPath = resolveLatestPointerPath(artifactsDir);

  // Ensure the runs/ parent exists for latest.txt before either write.
  mkdirSync(join(artifactsDir, 'runs'), { recursive: true });
  ensureRunSeeded(runDir, options.runId);

  appendFileSync(join(runDir, 'steps.ndjson'), line + '\n', 'utf8');
  writeLatestPointer(latestPath, options.runId);
}
