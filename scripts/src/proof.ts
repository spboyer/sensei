/**
 * Emit a `sensei-audit.md` proof artifact for a scored skill, suitable for
 * pasting into a PR body.
 *
 * Issue: spboyer/sensei#22 (P3)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { ScoringResult } from './tokens/commands/score.js';
import type { RepoPolicy } from './repo-policy.js';

export interface ProofOptions {
  readonly skillDir: string;
  readonly result: ScoringResult;
  readonly outputPath?: string;
  readonly policy?: RepoPolicy;
}

/** Extract the YAML frontmatter block (between `---` lines) from SKILL.md. */
function extractFrontmatter(skillMdPath: string): string {
  if (!existsSync(skillMdPath)) return '(SKILL.md not found)';
  const content = readFileSync(skillMdPath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[0] : '(no frontmatter block found)';
}

/** Default proof file location: alongside SKILL.md in the skill directory. */
export function defaultProofPath(skillDir: string): string {
  return join(skillDir, 'sensei-audit.md');
}

/**
 * Render and write the proof artifact. Returns the path written.
 */
export function writeProof(opts: ProofOptions): string {
  const { skillDir, result, policy } = opts;
  const outPath = opts.outputPath ?? defaultProofPath(skillDir);

  const skillMd = join(skillDir, 'SKILL.md');
  const frontmatter = extractFrontmatter(skillMd);
  const skillName = basename(skillDir);

  const lines: string[] = [];
  lines.push(`# Sensei Audit — ${skillName}`);
  lines.push('');
  lines.push(`_Generated ${new Date().toISOString()}_`);
  lines.push('');

  if (policy && policy.shortDescriptionsPreferred) {
    lines.push('## Repo-Local Policy Detected');
    lines.push('');
    lines.push(`- **Source:** \`${policy.source}\``);
    lines.push(`- **Evidence:** ${policy.evidence}`);
    lines.push('- Sensei advisory length recommendations are suppressed accordingly.');
    lines.push('');
  }

  lines.push('## Frontmatter');
  lines.push('');
  lines.push('```yaml');
  lines.push(frontmatter);
  lines.push('```');
  lines.push('');

  lines.push('## Score Summary');
  lines.push('');
  lines.push(`- **Path:** \`${result.skillPath}\``);
  lines.push(`- **Complexity:** ${result.complexity}`);
  lines.push(`- **Tokens:** ${result.tokenCount}`);
  lines.push(`- **Modules:** ${result.moduleCount}`);
  lines.push('');

  if (result.specChecks.length > 0) {
    lines.push('## Spec Compliance (agentskills.io)');
    lines.push('');
    for (const c of result.specChecks) {
      const icon = c.status === 'ok' ? '✅' : c.status === 'optimal' ? '🌟' : '⚠️';
      lines.push(`- ${icon} **${c.name}** — ${c.message}`);
    }
    lines.push('');
  }

  lines.push('## Advisory Checks (Sensei)');
  lines.push('');
  for (const c of result.checks) {
    const icon = c.status === 'ok' ? '✅' : c.status === 'optimal' ? '🌟' : '⚠️';
    lines.push(`- ${icon} **${c.name}** — ${c.message}`);
  }
  lines.push('');

  const body = lines.join('\n');
  writeFileSync(outPath, body, 'utf-8');
  return outPath;
}
