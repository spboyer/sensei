import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyzeSkillRepository, isContainedPath } from './repository-analysis.js';

describe('repository analysis', () => {
  let root: string;
  let skill: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sensei-analysis-'));
    skill = join(root, 'skills', 'sample');
    mkdirSync(join(skill, 'references'), { recursive: true });
    writeFileSync(join(skill, 'SKILL.md'), `---
name: sample
description: Sample skill.
---

# Sample

## Steps

1. Read [the guide](references/guide.md).

## Outputs

A verified result.
`);
    writeFileSync(join(skill, 'references', 'guide.md'), '# Guide\n');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('builds a contained graph and resolves links', () => {
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.graph.entrypoint).toBe('skills/sample/SKILL.md');
    expect(report.graph.resources.map(resource => resource.path)).toContain('skills/sample/references/guide.md');
    expect(report.findings.find(finding => finding.id === 'resource-orphans')?.state).toBe('pass');
  });

  it('recognizes validate-and-report completion contracts', () => {
    writeFileSync(join(skill, 'SKILL.md'), `---
name: sample
description: Sample workflow.
---

# Sample

## Workflow

1. Apply the approved change.

### 6. Validate and report

1. Run the relevant checks.
2. Prove idempotence with a second assessment.

Report migrated, retained, blocked, validated, and manual follow-up work.
Do not claim unavailable checks passed. Preserve user edits if validation fails.
`);
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('pass');
  });

  it('recognizes a numbered completion heading without relying on body keywords', () => {
    writeFileSync(join(skill, 'SKILL.md'), '# Workflow\n\n## Steps\n\n1. Apply the change.\n\n### 6. Validate and report\n');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('pass');
  });

  it('does not treat an ambiguous report mention as a completion contract', () => {
    writeFileSync(join(skill, 'SKILL.md'), '# Workflow\n\n## Steps\n\n1. Read the report for context.\n');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('warning');
  });

  it('does not treat prerequisite headings or fenced examples as completion contracts', () => {
    writeFileSync(join(skill, 'SKILL.md'), [
      '# Workflow',
      '',
      '## Steps',
      '',
      '1. Prepare the input.',
      '',
      '## Validate prerequisites',
      '',
      'Check the tool version before work.',
      '',
      '```markdown',
      '## Verification',
      '```'
    ].join('\n'));
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('warning');
  });

  it.each([
    '# Workflow\n\n## Steps\n\n1. Create the skeleton.\n\n## Handoff Rules\n',
    '# Workflow\n\n## Steps\n\n1. Wire resources.\n\n### 5. Self-Deactivate\n'
  ])('recognizes explicit handoff-owned completion headings', content => {
    writeFileSync(join(skill, 'SKILL.md'), content);
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('pass');
  });

  it.each([
    '# Workflow\n\n## Steps\n\n1. Wire resources.\n\nAppHost fully wired and validated. Handing off to aspire-orchestration for day-to-day start/stop/wait. Aspireify is done.',
    '# Workflow\n\n## Steps\n\n1. Create the skeleton.\n\nHand off to aspireify for subsequent resource wiring.'
  ])('recognizes bounded terminal handoff contracts', content => {
    writeFileSync(join(skill, 'SKILL.md'), content);
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('pass');
  });

  it.each([
    '# Workflow\n\n## Steps\n\n1. Read the handoff notes before continuing.',
    '# Workflow\n\n## Steps\n\n1. Check whether the prior task is done.',
    '# Workflow\n\n## Steps\n\n1. If setup is done, continue to validation.'
  ])('does not treat incidental handoff or done mentions as completion', content => {
    writeFileSync(join(skill, 'SKILL.md'), content);
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'instruction-completion-criteria')?.state).toBe('warning');
  });

  it('fails broken and escaping links without hiding other findings', () => {
    writeFileSync(join(skill, 'SKILL.md'), `---
name: sample
description: Sample skill.
---

[missing](references/missing.md)
[escape](../../../outside.md)
`);
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.filter(finding => finding.state === 'fail')).toHaveLength(2);
    expect(report.findings.some(finding => finding.id === 'lifecycle-regression-evals')).toBe(true);
  });

  it('ignores example links and file references inside Markdown code', () => {
    writeFileSync(join(skill, 'SKILL.md'), [
      '```markdown',
      '[example](references/missing.md)',
      '#file:../../../outside.md',
      '```',
      '',
      '`[inline](references/also-missing.md)`'
    ].join('\n'));
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.some(finding => finding.id.startsWith('resource-missing-'))).toBe(false);
    expect(report.findings.some(finding => finding.id.startsWith('resource-escape-'))).toBe(false);
  });

  it('validates Copilot file references through the same containment boundary', () => {
    writeFileSync(join(skill, 'SKILL.md'), '#file:../../../outside.md');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.some(finding => finding.id.startsWith('resource-escape-') && finding.state === 'fail')).toBe(true);
  });

  it('validates used reference-style Markdown links', () => {
    writeFileSync(join(skill, 'SKILL.md'), [
      'Read [the guide][guide].',
      '',
      '[guide]: ../../../outside.md'
    ].join('\n'));
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.some(finding => finding.id.startsWith('resource-escape-') && finding.state === 'fail')).toBe(true);
  });

  it('reports unreachable conventional resources', () => {
    writeFileSync(join(skill, 'references', 'orphan.md'), '# Orphan\n');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    const finding = report.findings.find(item => item.id === 'resource-orphans');
    expect(finding?.state).toBe('warning');
    expect(finding?.sourcePaths).toContain('skills/sample/references/orphan.md');
  });

  it('does not classify host-discovered evals or dependency directories as orphan resources', () => {
    mkdirSync(join(skill, 'evals'));
    writeFileSync(join(skill, 'evals', 'eval.yaml'), 'name: sample');
    mkdirSync(join(skill, 'node_modules', 'dependency'), { recursive: true });
    writeFileSync(join(skill, 'node_modules', 'dependency', 'index.js'), 'export {};');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(item => item.id === 'resource-orphans')?.state).toBe('pass');
    expect(report.graph.resources.some(resource => resource.path.includes('node_modules'))).toBe(false);
  });

  it('requires an eval artifact rather than an empty eval path', () => {
    const evalDir = join(skill, 'evals');
    mkdirSync(evalDir);
    let report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(item => item.id === 'lifecycle-regression-evals')?.state).toBe('unknown');
    writeFileSync(join(evalDir, 'eval.yaml'), 'name: sample');
    report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(item => item.id === 'lifecycle-regression-evals')?.state).toBe('pass');
  });

  it('does not traverse the private reference graph of a linked sibling skill', () => {
    const sibling = join(root, 'skills', 'sibling');
    mkdirSync(join(sibling, 'references'), { recursive: true });
    writeFileSync(join(sibling, 'SKILL.md'), '[private](references/private.md)');
    writeFileSync(join(sibling, 'references', 'private.md'), '# Private');
    writeFileSync(join(skill, 'SKILL.md'), '[handoff](../sibling/SKILL.md)');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.graph.resources.map(resource => resource.path)).toContain('skills/sibling/SKILL.md');
    expect(report.graph.resources.map(resource => resource.path)).not.toContain('skills/sibling/references/private.md');
  });

  it('identifies script readiness and dangerous patterns', () => {
    mkdirSync(join(skill, 'scripts'));
    writeFileSync(join(skill, 'scripts', 'run.sh'), '#!/bin/sh\nrm -rf \"$TARGET\"\ncurl \"$URL\"\n');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'script-destructive-defaults')?.state).toBe('warning');
    expect(report.findings.find(finding => finding.id === 'script-capability-surface')?.state).toBe('warning');
    expect(report.findings.find(finding => finding.id === 'script-tests')?.state).toBe('warning');
  });

  it('inspects linked scripts elsewhere in the contained repository', () => {
    const tools = join(root, 'tools');
    mkdirSync(tools);
    writeFileSync(join(tools, 'run.sh'), '#!/bin/sh\nrm -rf \"$TARGET\"\n');
    writeFileSync(join(skill, 'SKILL.md'), '[runner](../../tools/run.sh)');
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'script-readiness')).toBeUndefined();
    expect(report.findings.find(finding => finding.id === 'script-destructive-defaults')?.state).toBe('warning');
  });

  it('does not count unrelated test-like paths as script test evidence', () => {
    mkdirSync(join(skill, 'scripts'));
    writeFileSync(join(skill, 'scripts', 'run.sh'), '#!/bin/sh\nexit 0\n');
    mkdirSync(join(skill, 'references', 'tests'), { recursive: true });
    writeFileSync(join(skill, 'references', 'tests', 'other.test.ts'), 'export {};');
    let report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'script-tests')?.state).toBe('warning');
    writeFileSync(join(skill, 'scripts', 'run.test.sh'), '#!/bin/sh\nexit 0\n');
    report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'script-tests')?.state).toBe('pass');
  });

  it('uses platform-safe containment checks', () => {
    expect(isContainedPath(root, join(root, 'skills', 'sample'))).toBe(true);
    expect(isContainedPath(root, resolve(root, '..', 'outside'))).toBe(false);
  });

  it('enforces the MCP aggregate skill size limit before script inspection', () => {
    mkdirSync(join(skill, 'assets'));
    writeFileSync(join(skill, 'assets', 'one.bin'), Buffer.alloc(9 * 1024 * 1024));
    writeFileSync(join(skill, 'assets', 'two.bin'), Buffer.alloc(9 * 1024 * 1024));
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.find(finding => finding.id === 'resource-limits')?.state).toBe('fail');
  });

  it('rejects symlinks that escape the repository when supported', () => {
    const outside = mkdtempSync(join(tmpdir(), 'sensei-outside-'));
    try {
      writeFileSync(join(outside, 'secret.md'), 'secret');
      try {
        symlinkSync(join(outside, 'secret.md'), join(skill, 'references', 'escape.md'), 'file');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EPERM') return;
        throw error;
      }
      const report = analyzeSkillRepository(skill, { repositoryRoot: root });
      expect(report.findings.some(finding => finding.id.includes('resource-symlink') && finding.state === 'fail')).toBe(true);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('reports a dangling symlink without aborting the remaining analysis', () => {
    try {
      symlinkSync(join(root, 'missing-target.md'), join(skill, 'references', 'dangling.md'), 'file');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EPERM') return;
      throw error;
    }
    const report = analyzeSkillRepository(skill, { repositoryRoot: root });
    expect(report.findings.some(finding => finding.id.includes('resource-symlink') && finding.state === 'fail')).toBe(true);
    expect(report.findings.some(finding => finding.id === 'lifecycle-regression-evals')).toBe(true);
  });

  it('never reads an entrypoint symlink that escapes the repository', () => {
    const outside = mkdtempSync(join(tmpdir(), 'sensei-entrypoint-outside-'));
    try {
      writeFileSync(join(outside, 'SKILL.md'), 'outside');
      rmSync(join(skill, 'SKILL.md'));
      try {
        symlinkSync(join(outside, 'SKILL.md'), join(skill, 'SKILL.md'), 'file');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EPERM') return;
        throw error;
      }
      expect(() => analyzeSkillRepository(skill, { repositoryRoot: root })).toThrow(/resolves outside/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
