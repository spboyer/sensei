/**
 * `sensei report --finalize` — write the final markdown report for a run
 * and mark the run complete.
 *
 * Inputs:
 *   --run-id <ulid>             ULID of the run to finalize. Required.
 *   --input <path|->            JSON file (or stdin if '-') with the run
 *                               summary. Required.
 *   --artifacts-dir <path>      Override the artifacts directory (tests).
 *
 * The JSON input is the structured summary the agent collected during the
 * Ralph loop. Sensei is the canonical place that knows how to render that
 * into markdown — keeping the templating in TypeScript means tests can
 * pin the output and the iframe doesn't have to ship a templating engine.
 *
 * Side effects:
 *   - Writes `<runDir>/report.md` (overwrites if present).
 *   - Updates `<runDir>/manifest.json` with `finishedAt` + the input
 *     summary embedded under `summary`.
 *   - Updates `runs/latest.txt` to point at this runId so canvases that
 *     open after the fact land on this run by default.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  resolveArtifactsDir,
  resolveLatestPointerPath,
  resolveRunDir,
} from './artifacts.js';

export interface ReportOptions {
  runId?: string;
  /** Path to a JSON file, or '-' to read stdin. */
  input?: string;
  /** Override the artifacts directory (mainly for testing). */
  artifactsDir?: string;
  /** Stdin stream for testing; defaults to process.stdin. */
  stdin?: NodeJS.ReadableStream;
}

/** Shape of the summary JSON the agent passes via --input. */
export interface RunSummary {
  /** Display title for the run, e.g. "sensei run on pdf, xlsx". */
  title?: string;
  /** Optional mode marker (normal/fast/gepa). */
  mode?: string;
  /** Per-skill outcomes. */
  skills?: Array<{
    name: string;
    before?: { score?: string; tokens?: number };
    after?: { score?: string; tokens?: number };
    decision?: 'commit' | 'issue' | 'skip' | string;
    notes?: string;
  }>;
  /** Optional free-form summary text appended after the per-skill section. */
  notes?: string;
}

function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

function writeLatestPointer(latestPath: string, runId: string): void {
  const tmp = `${latestPath}.${process.pid}.tmp`;
  writeFileSync(tmp, runId, 'utf8');
  renameSync(tmp, latestPath);
}

/**
 * Render a run summary as the canonical sensei report.md.
 *
 * Exported so unit tests can pin the format without going through the
 * filesystem, and so other tooling can reuse it.
 */
export function renderReportMarkdown(summary: RunSummary, runId: string): string {
  const lines: string[] = [];
  lines.push(`# ${summary.title ?? 'Sensei Run'}`);
  lines.push('');
  lines.push(`- **Run ID:** \`${runId}\``);
  if (summary.mode) lines.push(`- **Mode:** ${summary.mode}`);
  lines.push(`- **Finished:** ${new Date().toISOString()}`);
  lines.push('');

  const skills = summary.skills ?? [];
  if (skills.length > 0) {
    lines.push('## Skills');
    lines.push('');
    lines.push('| Skill | Before | After | Tokens | Decision |');
    lines.push('|---|---|---|---|---|');
    for (const s of skills) {
      const before = s.before?.score ?? '—';
      const after = s.after?.score ?? '—';
      const tokens =
        s.before?.tokens != null && s.after?.tokens != null
          ? `${s.before.tokens} → ${s.after.tokens}`
          : s.after?.tokens != null
            ? String(s.after.tokens)
            : '—';
      const decision = s.decision ?? '—';
      lines.push(`| \`${s.name}\` | ${before} | ${after} | ${tokens} | ${decision} |`);
    }
    lines.push('');

    const withNotes = skills.filter((s) => s.notes);
    if (withNotes.length > 0) {
      lines.push('### Notes');
      lines.push('');
      for (const s of withNotes) {
        lines.push(`- **${s.name}** — ${s.notes}`);
      }
      lines.push('');
    }
  }

  if (summary.notes) {
    lines.push('## Summary');
    lines.push('');
    lines.push(summary.notes);
    lines.push('');
  }

  return lines.join('\n');
}

export async function report(options: ReportOptions): Promise<void> {
  if (!options.runId) {
    throw new Error('sensei report: --run-id is required.');
  }
  if (!options.input) {
    throw new Error('sensei report: --input <path|-> is required.');
  }

  const raw =
    options.input === '-'
      ? await readStdin(options.stdin ?? process.stdin)
      : readFileSync(options.input, 'utf8');

  let summary: RunSummary;
  try {
    summary = JSON.parse(raw) as RunSummary;
  } catch (err) {
    throw new Error(`Report input is not valid JSON: ${(err as Error).message}`);
  }

  const artifactsDir = resolveArtifactsDir(options.artifactsDir);
  const runDir = resolveRunDir(artifactsDir, options.runId);
  const latestPath = resolveLatestPointerPath(artifactsDir);

  mkdirSync(runDir, { recursive: true });

  // Update or seed manifest. We read the existing one if present so we
  // preserve `startedAt` from `sensei step` (Phase 2). In Phase 1, where
  // only `sensei report` runs, we seed it here.
  const manifestPath = join(runDir, 'manifest.json');
  const existing = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>)
    : { runId: options.runId, startedAt: new Date().toISOString(), schemaVersion: 1 };
  const merged = {
    ...existing,
    runId: options.runId,
    finishedAt: new Date().toISOString(),
    summary,
  };
  writeFileSync(manifestPath, JSON.stringify(merged, null, 2), 'utf8');

  writeFileSync(join(runDir, 'report.md'), renderReportMarkdown(summary, options.runId), 'utf8');

  // Make sure latest.txt points at this run (idempotent if step already did).
  mkdirSync(join(artifactsDir, 'runs'), { recursive: true });
  writeLatestPointer(latestPath, options.runId);
}
