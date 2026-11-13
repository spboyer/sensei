import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

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
  const action = readFileSync('../action.yml', 'utf-8');
  const actionMetadata = parseYaml(action) as {
    inputs: Record<string, { default?: string }>;
  };

  it('publishes an npx-compatible CLI binary', () => {
    expect(pkg.bin).toEqual({
      sensei: 'scripts/dist/tokens/cli.js'
    });
  });

  it('publishes granular public export paths', () => {
    expect(pkg.exports).toHaveProperty('./score');
    expect(pkg.exports).toHaveProperty('./parse');
    expect(pkg.exports).toHaveProperty('./checks');
    expect(pkg.exports).toHaveProperty('./analyze');
  });

  it('includes compiled dist and action metadata in the npm package', () => {
    expect(pkg.files).toContain('scripts/dist/**');
    expect(pkg.files).toContain('action.yml');
  });

  it('exposes repository analysis and host profiles through the composite Action', () => {
    expect(action).toContain('check|count|suggest|score|analyze');
    expect(action).toContain('--profile=$SENSEI_PROFILE');
    expect(action).toContain('npm ci --prefix "$GITHUB_ACTION_PATH/scripts" --include=dev');
    expect(action).toContain('$GITHUB_ACTION_PATH/scripts/node_modules/tsx/dist/cli.mjs');
    expect(action).toContain('$GITHUB_ACTION_PATH/scripts/src/tokens/cli.ts');
    expect(action).toContain('npx --yes "@spboyer/sensei@$SENSEI_PACKAGE_VERSION"');
    expect(actionMetadata.inputs['node-version']?.default).toBe('22');
    expect(actionMetadata.inputs.profile?.default).toBe('portable');
    expect(actionMetadata.inputs['package-version']?.default).toBe('');
  });

  it('uses a tsx release compatible with Node 26 loader hooks', () => {
    const tsxRange = scriptsPkg.devDependencies?.tsx;
    expect(tsxRange).toBeDefined();
    expect(versionAtLeast(tsxRange ?? '', '4.21.1')).toBe(true);
  });

  it('uses the remediated Vitest toolchain on its supported Node floor', () => {
    expect(scriptsPkg.engines?.node).toBe('^22.12.0 || ^24.0.0 || >=26.0.0');
    for (const name of ['vitest', '@vitest/coverage-v8']) {
      const range = scriptsPkg.devDependencies?.[name];
      expect(range).toBeDefined();
      expect(versionAtLeast(range ?? '', '5.1.0')).toBe(true);
    }
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

  it('uses GitHub Actions releases with supported Node runtimes', () => {
    const workflows = readdirSync('../.github/workflows')
      .filter((file) => file.endsWith('.yml'))
      .map((file) => readFileSync(`../.github/workflows/${file}`, 'utf-8'))
      .join('\n');

    expect(workflows).not.toMatch(/actions\/checkout@v[1-6]\b/);
    expect(workflows).not.toMatch(/actions\/setup-node@v[1-6]\b/);
    expect(workflows).not.toMatch(/actions\/upload-pages-artifact@v[1-4]\b/);
    expect(workflows).not.toMatch(/actions\/deploy-pages@v[1-4]\b/);
  });

  it('publishes through GitHub OIDC instead of a long-lived npm token', () => {
    const workflow = readFileSync('../.github/workflows/publish.yml', 'utf-8');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('npm install --global npm@latest');
    expect(workflow).not.toContain('NPM_TOKEN');
    expect(workflow).not.toContain('NODE_AUTH_TOKEN');
  });

  it('attaches compiled and source artifacts to GitHub releases', () => {
    const workflow = readFileSync('../.github/workflows/squad-release.yml', 'utf-8');
    expect(workflow).toContain('npm pack --pack-destination');
    expect(workflow).toContain('node scripts/package-skill.mjs');
    expect(workflow).toContain('RELEASE-SHA256SUMS');
    expect(workflow).toContain('"$RUNNER_TEMP/release-assets/"*');
  });
});
