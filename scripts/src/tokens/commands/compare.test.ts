import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  });

  function git(...args: string[]): void {
    execFileSync('git', args, { cwd: repoDir, stdio: 'pipe' });
  }
});
