import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packageSkill, payloadPaths } from './package-skill.mjs';

const script = fileURLToPath(new URL('./package-skill.mjs', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'sensei-package-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root });
  git('init', '--quiet');
  git('config', 'user.name', 'Sensei Test');
  git('config', 'user.email', 'test@example.invalid');
  const files = payloadPaths.map(path =>
    ['references', 'scripts'].includes(path) ? `${path}/example.txt` : path);
  for (const path of [...files, '.github/workflows/ignored.yml', '.ai-team/ignored.md']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), path === 'SKILL.md' ? '---\nname: sensei\n---\n' : `${path}\n`);
  }
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  return { root, git, files, output: join(root, 'bundle') };
}

test('packages only committed payload with matching checksum and provenance', t => {
  const { root, git, files, output } = fixture(t);
  writeFileSync(join(root, 'SKILL.md'), 'uncommitted edit');
  mkdirSync(join(root, 'scripts/node_modules'), { recursive: true });
  writeFileSync(join(root, 'scripts/node_modules/ignored.js'), 'untracked dependency');

  const provenance = packageSkill(root, output);
  const archive = readFileSync(join(output, 'sensei.tar.gz'));
  const digest = createHash('sha256').update(archive).digest('hex');
  assert.equal(provenance.commit, git('rev-parse', 'HEAD').toString().trim());
  assert.equal(provenance.commitUrl, `${provenance.repository}/commit/${provenance.commit}`);
  assert.equal(provenance.sha256, digest);
  assert.deepEqual(JSON.parse(readFileSync(join(output, 'source.json'), 'utf8')), provenance);
  assert.equal(readFileSync(join(output, 'SHA256SUMS'), 'utf8'), `${digest}  sensei.tar.gz\n`);
  const listing = execFileSync('tar', ['-tzf', join(output, 'sensei.tar.gz')]).toString().trim().split('\n');
  assert.deepEqual(listing.filter(path => !path.endsWith('/')).sort(),
    files.map(path => `sensei/${path}`).sort());
  const skill = execFileSync('tar', ['-xzOf', join(output, 'sensei.tar.gz'), 'sensei/SKILL.md']).toString();
  assert.equal(skill, '---\nname: sensei\n---\n');
  const second = join(root, 'second-bundle');
  packageSkill(root, second);
  assert.deepEqual(readFileSync(join(second, 'sensei.tar.gz')), archive);
});

test('refuses to overwrite an existing output directory', t => {
  const { root, output } = fixture(t);
  packageSkill(root, output);
  assert.throws(() => packageSkill(root, output), /EEXIST/);
});

test('fails when required payload files are absent', t => {
  const { root, git, output } = fixture(t);
  git('rm', 'LICENSE.txt');
  git('commit', '--quiet', '-m', 'remove license');
  assert.throws(() => packageSkill(root, output), /LICENSE.txt/);
});

for (const skill of [
  '---\nname: not-sensei\n---\n',
  '---\nname: other\n---\nname: sensei\n',
  '---\nname: sensei\n'
]) {
  test(`rejects invalid root frontmatter: ${JSON.stringify(skill)}`, t => {
    const { root, git, output } = fixture(t);
    writeFileSync(join(root, 'SKILL.md'), skill);
    git('add', 'SKILL.md');
    git('commit', '--quiet', '-m', 'invalid frontmatter');
    assert.throws(() => packageSkill(root, output), /name: sensei/);
  });
}

test('rejects committed symbolic links', t => {
  const { root, git, output } = fixture(t);
  symlinkSync('../LICENSE.txt', join(root, 'references/linked.txt'));
  git('add', '.');
  git('commit', '--quiet', '-m', 'add symlink');
  assert.throws(() => packageSkill(root, output), /only regular files/);
});

test('rejects submodules in the payload', t => {
  const { root, git, output } = fixture(t);
  const commit = git('rev-parse', 'HEAD').toString().trim();
  git('update-index', '--add', '--cacheinfo', `160000,${commit},scripts/submodule`);
  git('commit', '--quiet', '-m', 'add submodule');
  assert.throws(() => packageSkill(root, output), /only regular files/);
});

test('CLI packages the current committed tree successfully', t => {
  const { root, output } = fixture(t);
  const result = spawnSync(process.execPath, [script, output], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Packaged Sensei at [0-9a-f]{40}/);
  assert.equal(JSON.parse(readFileSync(join(output, 'source.json'), 'utf8')).skill, 'sensei');
});

test('CLI reports missing arguments and packaging errors as failures', t => {
  const { root } = fixture(t);
  const usage = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /Usage:/);
  const failure = spawnSync(process.execPath, [script, '.'], { cwd: root, encoding: 'utf8' });
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /Packaging Sensei failed:.*EEXIST/);
});
