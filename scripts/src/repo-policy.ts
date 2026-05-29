/**
 * Detect repo-local frontmatter policy that overrides Sensei's built-in
 * length recommendations (e.g. "150-char minimum").
 *
 * Sources, in priority order:
 *   1. `.sensei.json` / `.sensei.yml` with explicit `descriptionStyle` or
 *      `advisoryOverrides.minDescriptionLength: false`
 *   2. Keyword scan of AGENTS.md, README.md, CONTRIBUTING.md,
 *      .github/copilot-instructions.md for short-trigger phrasing
 *
 * Issue: spboyer/sensei#22 (P1)
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RepoPolicy {
  /** True when repo signals descriptions should be short trigger phrases. */
  readonly shortDescriptionsPreferred: boolean;
  /** File the policy was detected from, or null if no policy found. */
  readonly source: string | null;
  /** Short human-readable explanation. */
  readonly evidence: string | null;
}

const POLICY_FILES = ['.sensei.json'];
const SCAN_FILES = [
  'AGENTS.md',
  'README.md',
  'CONTRIBUTING.md',
  '.github/copilot-instructions.md'
];

// Phrasing in repo guidance that signals "keep descriptions short".
// Conservative: matches must appear near "description" within ~120 chars
// to avoid false positives from unrelated prose.
const SHORT_DESC_PATTERNS: readonly RegExp[] = [
  /description[^.\n]{0,120}(short trigger|trigger phrase|not full documentation|keep[^.\n]{0,40}short|brief)/i,
  /(short trigger|trigger phrase|not full documentation)[^.\n]{0,120}description/i
];

export function detectRepoPolicy(repoRoot: string): RepoPolicy {
  const empty: RepoPolicy = { shortDescriptionsPreferred: false, source: null, evidence: null };
  if (!repoRoot || !existsSync(repoRoot)) return empty;

  // 1. Structured config wins.
  for (const file of POLICY_FILES) {
    const p = join(repoRoot, file);
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, 'utf-8');
      const cfg = JSON.parse(raw) as {
        descriptionStyle?: string;
        advisoryOverrides?: { minDescriptionLength?: boolean | number };
      };
      if (cfg.descriptionStyle === 'short-trigger') {
        return { shortDescriptionsPreferred: true, source: file, evidence: 'descriptionStyle: "short-trigger"' };
      }
      const min = cfg.advisoryOverrides?.minDescriptionLength;
      if (min === false || min === 0) {
        return { shortDescriptionsPreferred: true, source: file, evidence: 'advisoryOverrides.minDescriptionLength disabled' };
      }
    } catch {
      // Malformed config: ignore, continue scanning.
    }
  }

  // 2. Prose keyword scan.
  for (const file of SCAN_FILES) {
    const p = join(repoRoot, file);
    if (!existsSync(p)) continue;
    let content: string;
    try {
      content = readFileSync(p, 'utf-8');
    } catch {
      continue;
    }
    for (const pat of SHORT_DESC_PATTERNS) {
      const match = pat.exec(content);
      if (match) {
        return {
          shortDescriptionsPreferred: true,
          source: file,
          evidence: `matched "${match[0].replace(/\s+/g, ' ').slice(0, 80)}"`
        };
      }
    }
  }

  return empty;
}
