import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { loadConfig, resolvePathFromRoot, resolveRootDir } from './utils.js';

describe('root and config utilities', () => {
  let tempDir: string;
  const testWorkspace = join(process.cwd(), '.test-workspace');

  beforeEach(() => {
    tempDir = join(testWorkspace, `sensei-utils-${randomUUID()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testWorkspace, { recursive: true, force: true });
  });

  it('resolves an explicit root directory', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    expect(resolveRootDir(projectDir)).toBe(projectDir);
  });

  it('loads an explicit config path relative to root', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    writeFileSync(join(projectDir, 'limits.json'), JSON.stringify({
      defaults: { '*.md': 123 },
      overrides: {}
    }));

    expect(loadConfig(projectDir, 'limits.json').defaults['*.md']).toBe(123);
  });

  it('throws when an explicit config path is missing', () => {
    expect(() => loadConfig(tempDir, 'missing.json')).toThrow('Token limits config not found');
  });

  it('rejects paths outside the configured root', () => {
    expect(() => resolvePathFromRoot(tempDir, '../outside.md')).toThrow('outside the configured root');
  });

  it('rejects symlinked paths that resolve outside the configured root', () => {
    const projectDir = join(tempDir, 'project');
    const outsideDir = join(tempDir, 'outside');
    mkdirSync(projectDir);
    mkdirSync(outsideDir);
    writeFileSync(join(outsideDir, 'secret.md'), '# outside');
    symlinkSync(outsideDir, join(projectDir, 'link'), process.platform === 'win32' ? 'junction' : 'dir');

    expect(() => resolvePathFromRoot(projectDir, 'link/secret.md')).toThrow('outside the configured root');
  });
});
