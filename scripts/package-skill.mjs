import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const payloadPaths = [
  'SKILL.md',
  'references',
  'scripts',
  'package.json',
  '.token-limits.json',
  'agent-registry.json',
  'README.md',
  'LICENSE.txt'
];

export function packageSkill(root, outputDirectory) {
  const git = (...args) => execFileSync('git', args, { cwd: root });
  const commit = git('rev-parse', '--verify', 'HEAD^{commit}').toString().trim();
  const skill = git('show', `${commit}:SKILL.md`).toString();
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(skill)?.[1];
  if (!frontmatter || !/^name: sensei\r?$/m.test(frontmatter)) {
    throw new Error('Expected root SKILL.md with name: sensei.');
  }

  const entries = git('ls-tree', '-r', '-z', commit, '--', ...payloadPaths)
    .toString().split('\0').filter(Boolean);
  for (const entry of entries) {
    if (!entry.startsWith('100644 ') && !entry.startsWith('100755 ')) {
      throw new Error(`Skill payload must contain only regular files: ${entry}`);
    }
  }

  const archive = git('archive', '--format=tar.gz', '--prefix=sensei/', commit, '--', ...payloadPaths);
  const digest = createHash('sha256').update(archive).digest('hex');
  const provenance = {
    schemaVersion: 1,
    skill: 'sensei',
    repository: 'https://github.com/spboyer/sensei',
    commit,
    commitUrl: `https://github.com/spboyer/sensei/commit/${commit}`,
    payloadPaths,
    archive: 'sensei.tar.gz',
    sha256: digest
  };

  const output = resolve(outputDirectory);
  mkdirSync(output);
  writeFileSync(resolve(output, 'sensei.tar.gz'), archive);
  writeFileSync(resolve(output, 'source.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  writeFileSync(resolve(output, 'SHA256SUMS'), `${digest}  sensei.tar.gz\n`);
  return provenance;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error('Usage: node scripts/package-skill.mjs <new-output-directory>');
    process.exitCode = 1;
  } else {
    try {
      const provenance = packageSkill(process.cwd(), process.argv[2]);
      console.log(`Packaged Sensei at ${provenance.commit} into ${resolve(process.argv[2])}`);
    } catch (error) {
      console.error(`Packaging Sensei failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
