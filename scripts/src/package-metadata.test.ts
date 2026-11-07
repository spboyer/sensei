import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

interface PackageJson {
  readonly bin?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly engines?: Record<string, string>;
  readonly exports?: Record<string, unknown>;
  readonly files?: string[];
}

function versionAtLeast(range: string, minimum: string): boolean {
  const version = range.match(/\d+\.\d+\.\d+/)?.[0];
  if (!version) return false;

  const actualParts = version.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);
  for (let index = 0; index < minimumParts.length; index += 1) {
    if (actualParts[index] !== minimumParts[index]) {
      return actualParts[index] > minimumParts[index];
    }
  }
  return true;
}

describe('package integration metadata', () => {
  const pkg = JSON.parse(readFileSync('../package.json', 'utf-8')) as PackageJson;
  const scriptsPkg = JSON.parse(readFileSync('package.json', 'utf-8')) as PackageJson;
  const docsPkg = JSON.parse(readFileSync('../docs/package.json', 'utf-8')) as PackageJson;

  it('publishes an npx-compatible CLI binary', () => {
    expect(pkg.bin).toEqual({
      sensei: 'scripts/dist/tokens/cli.js'
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

  it('uses a tsx release compatible with Node 26 loader hooks', () => {
    const tsxRange = scriptsPkg.devDependencies?.tsx;
    expect(tsxRange).toBeDefined();
    expect(versionAtLeast(tsxRange ?? '', '4.21.1')).toBe(true);
  });

  it('uses Tailwind releases compatible with Node 26 loader hooks', () => {
    for (const name of ['tailwindcss', '@tailwindcss/vite']) {
      const range = docsPkg.dependencies?.[name];
      expect(range).toBeDefined();
      expect(versionAtLeast(range ?? '', '4.3.5')).toBe(true);
    }
  });

  it('uses an Astro release without the known docs dependency advisories', () => {
    expect(docsPkg.engines?.node).toBe('>=22.23.4');
    const astroRange = docsPkg.dependencies?.astro;
    expect(astroRange).toBeDefined();
    expect(versionAtLeast(astroRange ?? '', '7.4.7')).toBe(true);
  });
});
