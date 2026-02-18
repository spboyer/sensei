/**
 * Tests for score.ts advisory checks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkModuleCount,
  classifyComplexity,
  checkNegativeDeltaRisk,
  checkProceduralContent,
  checkOverSpecificity,
  scoreSkill
} from './score.js';

describe('checkModuleCount', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'score-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns ok with 0 refs (no references/ dir)', () => {
    const result = checkModuleCount(tempDir);
    expect(result.name).toBe('module-count');
    expect(result.status).toBe('ok');
    expect(result.message).toMatch(/0/);
  });

  it('returns ok with 1 ref', () => {
    const refsDir = join(tempDir, 'references');
    mkdirSync(refsDir);
    writeFileSync(join(refsDir, 'one.md'), '# One');

    const result = checkModuleCount(tempDir);
    expect(result.status).toBe('ok');
    expect(result.message).toMatch(/1/);
  });

  it('returns optimal with 2 refs', () => {
    const refsDir = join(tempDir, 'references');
    mkdirSync(refsDir);
    writeFileSync(join(refsDir, 'one.md'), '# One');
    writeFileSync(join(refsDir, 'two.md'), '# Two');

    const result = checkModuleCount(tempDir);
    expect(result.status).toBe('optimal');
    expect(result.message).toMatch(/2/);
  });

  it('returns optimal with 3 refs', () => {
    const refsDir = join(tempDir, 'references');
    mkdirSync(refsDir);
    writeFileSync(join(refsDir, 'one.md'), '# One');
    writeFileSync(join(refsDir, 'two.md'), '# Two');
    writeFileSync(join(refsDir, 'three.md'), '# Three');

    const result = checkModuleCount(tempDir);
    expect(result.status).toBe('optimal');
    expect(result.message).toMatch(/3/);
  });

  it('returns warning with 5 refs', () => {
    const refsDir = join(tempDir, 'references');
    mkdirSync(refsDir);
    for (let i = 1; i <= 5; i++) {
      writeFileSync(join(refsDir, `ref${i}.md`), `# Ref ${i}`);
    }

    const result = checkModuleCount(tempDir);
    expect(result.status).toBe('warning');
    expect(result.message).toMatch(/5/);
    expect(result.evidence).toBeDefined();
  });

  it('ignores non-md files', () => {
    const refsDir = join(tempDir, 'references');
    mkdirSync(refsDir);
    writeFileSync(join(refsDir, 'one.md'), '# One');
    writeFileSync(join(refsDir, 'config.json'), '{}');
    writeFileSync(join(refsDir, 'notes.txt'), 'notes');

    const result = checkModuleCount(tempDir);
    expect(result.status).toBe('ok');
    expect(result.message).toMatch(/1/);
  });
});

describe('classifyComplexity', () => {
  it('classifies compact: 150 tokens, 1 module', () => {
    const result = classifyComplexity(150, 1);
    expect(result.name).toBe('complexity');
    expect(result.status).toBe('ok');
    expect(result.message).toContain('Compact');
  });

  it('classifies detailed: 350 tokens, 2 modules', () => {
    const result = classifyComplexity(350, 2);
    expect(result.status).toBe('optimal');
    expect(result.message).toContain('Detailed');
  });

  it('classifies comprehensive by tokens: 600 tokens, 2 modules', () => {
    const result = classifyComplexity(600, 2);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('Comprehensive');
  });

  it('classifies comprehensive by modules: 300 tokens, 5 modules', () => {
    const result = classifyComplexity(300, 5);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('Comprehensive');
  });

  it('edge: exactly 200 tokens, 1 module → detailed', () => {
    const result = classifyComplexity(200, 1);
    expect(result.status).toBe('optimal');
    expect(result.message).toContain('Detailed');
  });

  it('edge: exactly 500 tokens, 3 modules → detailed', () => {
    const result = classifyComplexity(500, 3);
    expect(result.status).toBe('optimal');
    expect(result.message).toContain('Detailed');
  });

  it('edge: 501 tokens → comprehensive', () => {
    const result = classifyComplexity(501, 1);
    expect(result.status).toBe('warning');
  });

  it('compact: 100 tokens, 0 modules', () => {
    const result = classifyComplexity(100, 0);
    expect(result.status).toBe('ok');
    expect(result.message).toContain('Compact');
  });

  it('199 tokens, 0 modules → compact (below 200, 0 refs)', () => {
    const result = classifyComplexity(199, 0);
    expect(result.status).toBe('ok');
  });
});

describe('checkNegativeDeltaRisk', () => {
  it('returns ok for clean content', () => {
    const content = '# My Skill\n\nDo the thing correctly.\n\n## Steps\n\nStep 1: Do it.\n';
    const result = checkNegativeDeltaRisk(content);
    expect(result.name).toBe('negative-delta-risk');
    expect(result.status).toBe('ok');
  });

  it('warns on "but alternatively" with conflicting steps', () => {
    const content = 'Step 1: Use npm.\n\nBut alternatively, you can use yarn.\n';
    const result = checkNegativeDeltaRisk(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('conflicting');
  });

  it('warns on "however you can also"', () => {
    const content = 'Use git merge. However you can also use git rebase.\n';
    const result = checkNegativeDeltaRisk(content);
    expect(result.status).toBe('warning');
  });

  it('warns on multiple "Step 1:" blocks', () => {
    const content = 'Step 1: Do A.\nStep 2: Do B.\n\n## Alternative\n\nStep 1: Do C.\nStep 2: Do D.\n';
    const result = checkNegativeDeltaRisk(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('Step 1');
  });

  it('returns ok for single-path procedure', () => {
    const content = 'Step 1: Install.\nStep 2: Configure.\nStep 3: Run.\n';
    const result = checkNegativeDeltaRisk(content);
    expect(result.status).toBe('ok');
  });

  it('warns on excessive constraints', () => {
    const content = 'You must not do X. Never do Y. Always use Z. Must not skip Q. Never touch W. Forbidden to change R.\n';
    const result = checkNegativeDeltaRisk(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('constraint');
  });
});

describe('checkProceduralContent', () => {
  it('returns ok for procedural description with action verbs', () => {
    const desc = 'Deploy the application to Azure and configure the environment variables.';
    const result = checkProceduralContent(desc);
    expect(result.name).toBe('procedural-content');
    expect(result.status).toBe('ok');
  });

  it('warns on declarative-only description', () => {
    const desc = 'This is a tool. It handles data. The system is modular.';
    const result = checkProceduralContent(desc);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('declarative');
  });

  it('returns ok for mixed content with some procedural elements', () => {
    const desc = 'A utility for working with files. First, extract the data, then transform it.';
    const result = checkProceduralContent(desc);
    expect(result.status).toBe('ok');
  });

  it('warns on empty description', () => {
    const result = checkProceduralContent('');
    expect(result.status).toBe('warning');
    expect(result.message).toContain('Empty');
  });

  it('warns on whitespace-only description', () => {
    const result = checkProceduralContent('   \n\t  ');
    expect(result.status).toBe('warning');
  });

  it('detects "set up" as action verb', () => {
    const desc = 'Set up the development environment for the project.';
    const result = checkProceduralContent(desc);
    expect(result.status).toBe('ok');
  });

  it('detects procedure keywords like "workflow"', () => {
    const desc = 'The workflow involves several stages of data handling.';
    const result = checkProceduralContent(desc);
    expect(result.status).toBe('ok');
  });
});

describe('checkOverSpecificity', () => {
  it('returns ok for generic content', () => {
    const content = 'Use environment variables for configuration. Run the build command.';
    const result = checkOverSpecificity(content);
    expect(result.name).toBe('over-specificity');
    expect(result.status).toBe('ok');
  });

  it('warns on absolute Unix paths', () => {
    const content = 'Copy the file to /usr/local/bin/mytool.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('absolute Unix paths');
  });

  it('warns on absolute Windows paths', () => {
    const content = 'Install to C:\\Program Files\\MyApp.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('absolute Windows paths');
  });

  it('warns on IP addresses', () => {
    const content = 'Connect to 192.168.1.100 for the database.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('IP addresses');
  });

  it('warns on hardcoded URLs with paths', () => {
    const content = 'Download from https://myserver.example.com/builds/latest/app.zip.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('hardcoded URLs');
  });

  it('allows github.com and docs URLs', () => {
    const content = 'See https://github.com/org/repo for source and https://docs.example.com/guide for docs.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('ok');
  });

  it('returns ok for relative paths', () => {
    const content = 'Edit the file at ./src/config.ts or references/scoring.md.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('ok');
  });

  it('warns on specific port numbers', () => {
    const content = 'The server runs on localhost:3000 and the API is on :8080.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('port');
  });

  it('detects multiple over-specificity issues', () => {
    const content = 'Copy /usr/bin/tool and connect to 10.0.0.1:8080.';
    const result = checkOverSpecificity(content);
    expect(result.status).toBe('warning');
    expect(result.message).toContain('absolute Unix paths');
    expect(result.message).toContain('IP addresses');
  });
});

describe('scoreSkill', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'score-skill-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs all checks and returns correct structure', () => {
    const skillContent = [
      '---',
      'name: test-skill',
      'description: |',
      '  **WORKFLOW SKILL** - Deploy and configure the application.',
      '  USE FOR: deploying apps.',
      '  DO NOT USE FOR: local development.',
      '---',
      '',
      '# Test Skill',
      '',
      'Step 1: Run the build.',
      'Step 2: Deploy.',
      ''
    ].join('\n');

    writeFileSync(join(tempDir, 'SKILL.md'), skillContent);
    const refsDir = join(tempDir, 'references');
    mkdirSync(refsDir);
    writeFileSync(join(refsDir, 'guide.md'), '# Guide');
    writeFileSync(join(refsDir, 'api.md'), '# API');

    const result = scoreSkill(tempDir);

    expect(result.skillPath).toBe(tempDir);
    expect(result.checks).toHaveLength(5);
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.moduleCount).toBe(2);

    const checkNames = result.checks.map(c => c.name);
    expect(checkNames).toContain('module-count');
    expect(checkNames).toContain('complexity');
    expect(checkNames).toContain('negative-delta-risk');
    expect(checkNames).toContain('procedural-content');
    expect(checkNames).toContain('over-specificity');
  });

  it('handles missing SKILL.md with path-validation warning', () => {
    const result = scoreSkill(tempDir);
    expect(result.tokenCount).toBe(0);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe('path-validation');
    expect(result.checks[0].status).toBe('warning');
    expect(result.checks[0].message).toContain('No SKILL.md found');
  });

  it('handles non-existent directory with path-validation warning', () => {
    const result = scoreSkill(join(tempDir, 'does-not-exist'));
    expect(result.tokenCount).toBe(0);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe('path-validation');
    expect(result.checks[0].status).toBe('warning');
    expect(result.checks[0].message).toContain('does not exist');
  });

  it('detects comprehensive complexity for large skill', () => {
    const longContent = '---\nname: big-skill\ndescription: |\n  ' + 'x'.repeat(2500) + '\n---\n';
    writeFileSync(join(tempDir, 'SKILL.md'), longContent);

    const result = scoreSkill(tempDir);
    expect(result.complexity).toBe('comprehensive');
  });
});
