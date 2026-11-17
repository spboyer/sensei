import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const vitestCli = join(dirname(require.resolve('vitest')), 'vitest.mjs');
const packageJson = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8'));
const [node, ...contractArgs] = packageJson.scripts.validate.split(' && ').at(-1).split(' ');
assert.equal(node, 'node');
const contracts = [
  'scripts/validation.test.mjs',
  'scripts/package-skill.test.mjs',
  '.github/scripts/squad-main-guard.test.mjs',
];

for (const scenario of [
  { name: 'registered tests', content: "import { test } from 'node:test'; test('passes', () => {});", status: 0 },
  { name: 'failing tests', content: "import { test } from 'node:test'; test('fails', () => { throw new Error('controlled failure'); });", status: 1 },
  { name: 'skipped tests', content: "import { test } from 'node:test'; test.skip('skipped', () => {});", status: 1 },
  { name: 'empty suites', content: "import { describe } from 'node:test'; describe('empty suite', () => {});", status: 1 },
  { name: 'missing contracts', missing: true, status: 1 },
  ...contracts.map(empty => ({ name: `empty ${empty}`, empty, content: '', status: 1 })),
]) {
  test(`canonical contract command handles ${scenario.name}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'sensei-contracts-'));
    try {
      const fixturePaths = await Promise.all(contracts.map(async (contract, index) => {
        const path = join(root, `contract-${index}.test.mjs`);
        if (!scenario.missing) {
          await writeFile(path, scenario.empty && scenario.empty !== contract
            ? "import { test } from 'node:test'; test('passes', () => {});"
            : scenario.content);
        }
        return path;
      }));
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, contractArgs.map(arg => {
        const index = contracts.indexOf(arg);
        return index === -1 ? arg : fixturePaths[index];
      }), { cwd: repositoryRoot, encoding: 'utf8', env });
      const output = `${result.stdout}\n${result.stderr}`;

      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, scenario.status, output);
      if (scenario.empty) {
        assert.match(output, /No passing tests registered/, output);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('contract runner fails when no contracts are specified', () => {
  const result = spawnSync(
    process.execPath,
    contractArgs.filter(arg => !contracts.includes(arg)),
    { cwd: repositoryRoot, encoding: 'utf8' }
  );
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Specify at least one Node test contract/);
});

test('Vitest fails when no tests are discovered', async () => {
  const emptyRoot = await mkdtemp(join(tmpdir(), 'sensei-empty-vitest-'));

  try {
    const result = spawnSync(
      process.execPath,
      [vitestCli, 'run', '--root', emptyRoot, '--passWithNoTests=false'],
      { cwd: repositoryRoot, encoding: 'utf8' }
    );
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 1, output);
    assert.match(output, /No test files found/i);
  } finally {
    await rm(emptyRoot, { recursive: true, force: true });
  }
});

test('Node test runner fails when an expected test file is missing', async () => {
  const emptyRoot = await mkdtemp(join(tmpdir(), 'sensei-missing-node-test-'));

  try {
    const result = spawnSync(
      process.execPath,
      ['--test', join(emptyRoot, 'expected.test.mjs')],
      { cwd: repositoryRoot, encoding: 'utf8' }
    );

    assert.equal(result.error, undefined, result.error?.message);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(emptyRoot, { recursive: true, force: true });
  }
});
