import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, resolvePathFromRoot, resolveRootDir } from './utils.js';

describe('root and config utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sensei-utils-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
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
});
