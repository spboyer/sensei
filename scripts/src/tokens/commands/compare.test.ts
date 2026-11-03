import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComparisonReport } from './types.js';

describe('compare command', () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'sensei-compare-'));
    git('init', '-q');
    git('config', 'user.email', 'tests@example.com');
    git('config', 'user.name', 'Sensei Tests');
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('preserves comparison details across batched revision reads', () => {
    mkdirSync(join(repoDir, 'docs'));
    writeFileSync(join(repoDir, 'unchanged.md'), 'same\n');
    writeFileSync(join(repoDir, 'modified.md'), 'before\n');
    writeFileSync(join(repoDir, 'removed.md'), 'removed\n');
    writeFileSync(join(repoDir, 'docs/space name.md'), 'safe path\n');
    git('add', '.');
    git('commit', '-qm', 'base');
    git('branch', 'base');

    writeFileSync(join(repoDir, 'modified.md'), 'after with more content\n');
    rmSync(join(repoDir, 'removed.md'));
    writeFileSync(join(repoDir, 'added.md'), 'added\n');
    git('add', '-A');
    git('commit', '-qm', 'head');

    const commandsDir = dirname(fileURLToPath(import.meta.url));
    const cli = join(commandsDir, '..', 'cli.ts');
    const loader = join(commandsDir, '..', '..', '..', 'node_modules', 'tsx', 'dist', 'loader.mjs');
    const result = spawnSync(process.execPath, ['--import', loader, cli, 'compare', 'base', 'HEAD', '--format=json'], {
      cwd: repoDir,
      encoding: 'utf8'
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);

    expect(report.summary).toMatchObject({
      filesAdded: 1,
      filesRemoved: 1,
      filesModified: 1
    });
    expect(report.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'added.md', status: 'added' }),
      expect.objectContaining({ file: 'modified.md', status: 'modified' }),
      expect.objectContaining({ file: 'removed.md', status: 'removed' }),
      expect.objectContaining({ file: 'unchanged.md', status: 'unchanged' }),
      expect.objectContaining({ file: 'docs/space name.md', status: 'unchanged' })
    ]));

    const nestedResult = spawnSync(process.execPath, ['--import', loader, cli, 'compare', 'HEAD', 'WORKING', '--format=json'], {
      cwd: join(repoDir, 'docs'),
      encoding: 'utf8'
    });
    expect(nestedResult.stderr).toBe('');
    expect(nestedResult.status).toBe(0);
    const nestedReport = JSON.parse(nestedResult.stdout);

    expect(nestedReport.summary).toMatchObject({
      filesAdded: 0,
      filesRemoved: 0,
      filesModified: 0
    });
    expect(nestedReport.files).toEqual([
      expect.objectContaining({ file: 'space name.md', status: 'unchanged' })
    ]);
  });

  it('handles tree listings whose metadata exceeds the Git buffer limit', () => {
    const blob = gitOutput(['hash-object', '-w', '--stdin'], { input: 'content\n' });
    const entries = Array.from({ length: 35_000 }, (_, index) => {
      const suffix = index.toString().padStart(5, '0');
      const extension = index === 0 ? '.md' : '.txt';
      const name = `${'x'.repeat(230 - suffix.length - extension.length)}${suffix}${extension}`;
      return `100644 blob ${blob}\t${name}\0`;
    }).join('');
    const tree = gitOutput(['mktree', '-z'], { input: entries, maxBuffer: 20 * 1024 * 1024 });
    const commit = gitOutput(['commit-tree', tree], { input: 'large tree\n' });
    git('branch', 'large-tree', commit);

    const report = runCompare('large-tree', 'large-tree');

    expect(report.files).toEqual([
      expect.objectContaining({ status: 'unchanged' })
    ]);
  });

  it('retains paths when an oversized blob cannot be read in one batch', () => {
    const blob = gitOutput(['hash-object', '-w', '--stdin'], {
      input: 'x'.repeat(11 * 1024 * 1024),
      maxBuffer: 12 * 1024 * 1024
    });
    const tree = gitOutput(['mktree'], { input: `100644 blob ${blob}\tlarge.md\n` });
    const commit = gitOutput(['commit-tree', tree], { input: 'large blob\n' });
    git('branch', 'large-blob', commit);

    const report = runCompare('large-blob', 'large-blob');

    expect(report.files).toEqual([
      expect.objectContaining({
        file: 'large.md',
        before: null,
        after: null,
        status: 'unchanged'
      })
    ]);
  });

  function runCompare(baseRef: string, headRef: string): ComparisonReport {
    const commandsDir = dirname(fileURLToPath(import.meta.url));
    const cli = join(commandsDir, '..', 'cli.ts');
    const loader = join(commandsDir, '..', '..', '..', 'node_modules', 'tsx', 'dist', 'loader.mjs');
    const result = spawnSync(process.execPath, ['--import', loader, cli, 'compare', baseRef, headRef, '--format=json'], {
      cwd: repoDir,
      encoding: 'utf8'
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    return JSON.parse(result.stdout) as ComparisonReport;
  }

  function git(...args: string[]): void {
    execFileSync('git', args, { cwd: repoDir, stdio: 'pipe' });
  }

  function gitOutput(
    args: string[],
    options: { input?: string; maxBuffer?: number } = {}
  ): string {
    return execFileSync('git', args, {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    }).trim();
  }
});
