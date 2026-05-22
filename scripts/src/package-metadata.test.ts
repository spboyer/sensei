import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

interface PackageJson {
  readonly bin?: Record<string, string>;
  readonly exports?: Record<string, unknown>;
  readonly files?: string[];
}

describe('package integration metadata', () => {
  const pkg = JSON.parse(readFileSync('../package.json', 'utf-8')) as PackageJson;

  it('publishes an npx-compatible CLI binary', () => {
    expect(pkg.bin).toEqual({
      sensei: './scripts/dist/tokens/cli.js'
    });
  });

  it('publishes granular public export paths', () => {
    expect(pkg.exports).toHaveProperty('./score');
    expect(pkg.exports).toHaveProperty('./parse');
    expect(pkg.exports).toHaveProperty('./checks');
  });

  it('includes compiled dist and action metadata in the npm package', () => {
    expect(pkg.files).toContain('scripts/dist/**');
    expect(pkg.files).toContain('action.yml');
  });
});
