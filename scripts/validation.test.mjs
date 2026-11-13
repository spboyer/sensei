import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const vitestCli = join(dirname(require.resolve('vitest')), 'vitest.mjs');

test('Vitest fails when no tests are discovered', async () => {
  const emptyRoot = await mkdtemp(join(tmpdir(), 'sensei-empty-vitest-'));

  try {
    const result = spawnSync(
      process.execPath,
      [vitestCli, 'run', '--root', emptyRoot, '--passWithNoTests=false'],
      { cwd: repositoryRoot, encoding: 'utf8' }
    );

    assert.equal(result.error, undefined, result.error?.message);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
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
