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
 *   1. `--artifacts-dir <path>` CLI flag
 *   2. `COPILOT_EXTENSION_ARTIFACTS_DIR` env var (set by the Copilot CLI
 *      runtime when it spawns canvas providers; sensei honors it so the
 *      writer and the provider always agree on the path).
 *   3. Computed default:
 *        $COPILOT_HOME/extensions/<encoded-id>/artifacts
 *      where:
 *        - $COPILOT_HOME defaults to $HOME/.copilot
 *        - <encoded-id> is `encodeExtensionId(SENSEI_EXTENSION_ID)`
 *
 * The encoding scheme matches the one proposed in plan-sensei-v2.md §D so
 * that paths are valid on Windows NTFS, macOS APFS, and Linux ext4:
 *   ':' → '__'   (double underscore — never appears in a canonical id)
 *   '/' → '_'    (single underscore)
 *   lowercase    (avoids case-collision on case-insensitive filesystems)
 *
 * The mapping is reversible because `_` is not legal in a GitHub
 * host/owner/repo component, so the inverse is unambiguous.
 *
 * A near-identical copy of `encodeExtensionId` lives in
 * `.canvas/extension.mjs` (no cross-package import between the CLI and
 * the canvas provider). The two are kept in sync via the unit test here
 * pinning the canonical mapping.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/** Canonical extension id for sensei. */
export const SENSEI_EXTENSION_ID = 'skill:github.com/spboyer/sensei:sensei';

/**
 * Encode a canonical extension id into a filesystem-safe directory name.
 *
 * Example:
 *   encodeExtensionId('skill:github.com/spboyer/sensei:sensei')
 *     === 'skill__github.com_spboyer_sensei__sensei'
 */
export function encodeExtensionId(id: string): string {
  return id.replace(/:/g, '__').replace(/\//g, '_').toLowerCase();
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
