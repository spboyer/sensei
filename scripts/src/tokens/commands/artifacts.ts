/**
 * Artifact path resolution for the sensei canvas.
 *
 * Sensei writes per-run artifacts (steps NDJSON + final report.md) into a
 * well-known directory that the canvas provider (.canvas/extension.mjs)
 * watches. Layout:
 *
 *   <artifactsDir>/runs/<ULID>/manifest.json
 *   <artifactsDir>/runs/<ULID>/steps.ndjson
 *   <artifactsDir>/runs/<ULID>/report.md
 *   <artifactsDir>/runs/latest.txt           (text file: contains the latest ULID)
 *
 * `<artifactsDir>` resolution, in priority order:
 *   1. `--artifacts-dir <path>` CLI flag (tests, dev).
 *   2. `COPILOT_EXTENSION_ARTIFACTS_DIR` env var. The Copilot CLI runtime
 *      always sets this when it spawns canvas providers, so in
 *      production the writer and the provider always agree on the path.
 *      Providers and the CLI never derive it themselves in production.
 *   3. Computed default (standalone / dev fallback only):
 *        $COPILOT_HOME/extensions/<encoded-id>/artifacts
 *      where `<encoded-id>` is `encodeExtensionId(SENSEI_EXTENSION_ID)`.
 *
 * The encoding used in #3 matches the runtime's scheme — percent-encoding
 * (`encodeURIComponent`). It's RFC-defined, fully reversible, and safe
 * on Windows NTFS, macOS APFS, and Linux ext4 (`%` is legal in path
 * components on all three).
 *
 * Why this matters: a previous iteration used a hand-rolled `:` → `__`,
 * `/` → `_`, lowercase scheme. That scheme isn't reversible in the
 * general case because GitHub repo names allow `_` (e.g. `my_repo`),
 * which would collide with a slash-encoded boundary. Percent-encoding
 * avoids the ambiguity.
 *
 * A near-identical copy of `encodeExtensionId` lives in
 * `.canvas/extension.mjs` (no cross-package import between the CLI and
 * the canvas provider). The two are kept in sync via the unit test in
 * `artifacts.test.ts` pinning the canonical mapping.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/** Canonical extension id for sensei. */
export const SENSEI_EXTENSION_ID = 'skill:github.com/spboyer/sensei:sensei';

/**
 * Encode a canonical extension id into a filesystem-safe directory name.
 *
 * Matches the Copilot CLI runtime's encoding (percent-encoding via
 * `encodeURIComponent`) so dev/test paths line up with what the runtime
 * would compute. In production, providers and the CLI both read
 * `COPILOT_EXTENSION_ARTIFACTS_DIR` and never call this function.
 *
 * Example:
 *   encodeExtensionId('skill:github.com/spboyer/sensei:sensei')
 *     === 'skill%3Agithub.com%2Fspboyer%2Fsensei%3Asensei'
 */
export function encodeExtensionId(id: string): string {
  return encodeURIComponent(id);
}

/** Resolve $COPILOT_HOME (defaults to $HOME/.copilot). */
export function resolveCopilotHome(): string {
  return process.env.COPILOT_HOME ?? join(homedir(), '.copilot');
}

/** Resolve the sensei artifacts directory per the priority order above. */
export function resolveArtifactsDir(override?: string): string {
  if (override) return override;
  if (process.env.COPILOT_EXTENSION_ARTIFACTS_DIR) {
    return process.env.COPILOT_EXTENSION_ARTIFACTS_DIR;
  }
  return join(
    resolveCopilotHome(),
    'extensions',
    encodeExtensionId(SENSEI_EXTENSION_ID),
    'artifacts'
  );
}

/** Path to a specific run's directory under the artifacts root. */
export function resolveRunDir(artifactsDir: string, runId: string): string {
  return join(artifactsDir, 'runs', runId);
}

/** Path to the `latest.txt` pointer (plain text file containing the latest runId). */
export function resolveLatestPointerPath(artifactsDir: string): string {
  return join(artifactsDir, 'runs', 'latest.txt');
}
