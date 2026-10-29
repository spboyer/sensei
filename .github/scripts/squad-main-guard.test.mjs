import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isForbiddenTeamChange } from './squad-main-guard.mjs';

const curated = [
  '.ai-team/team.md',
  '.ai-team/decisions.md',
  '.ai-team/agents/rusty/charter.md',
  '.ai-team/agents/new-agent/charter.md',
];

const blocked = [
  '.ai-team',
  '.ai-team/',
  '.ai-team/agents/rusty/history.md',
  '.ai-team/agents/rusty/history-archive.md',
  '.ai-team/log/session.md',
  '.ai-team/decisions/inbox/model.md',
  '.ai-team/casting/policy.json',
  '.ai-team/casting/registry.json',
  '.ai-team/routing.md',
  '.ai-team/ceremonies.md',
  '.ai-team/orchestration-log.md',
  '.ai-team/skills/example/SKILL.md',
  '.ai-team/other.md',
  'team-docs',
  'team-docs/',
  'team-docs/policy.md',
];

const lookalikes = [
  '.ai-team/team.md.bak',
  '.ai-team/Team.md',
  '.ai-team/decisions.md/extra',
  '.ai-team/agents/rusty/charter.md.bak',
  '.ai-team/agents/rusty/Charter.md',
  '.ai-team/agents/charter.md',
  '.ai-team/agents//charter.md',
  '.ai-team/agents/nested/rusty/charter.md',
  '.ai-team/agents/./charter.md',
  '.ai-team/agents/../charter.md',
  '.ai-team/agents/rusty\\nested/charter.md',
  '.ai-team/agents/rusty\nnested/charter.md',
  '.ai-team/agents/rusty/charter.md\n',
  '.ai-team/agents/rusty/charter.md\r\n',
];

const unrelated = [
  'README.md',
  '.github/agents/squad.agent.md',
  '.github/scripts/squad-main-guard.mjs',
  '.ai-team-backup/team.md',
  'team-docs-public/guide.md',
  'docs/.ai-team/log/session.md',
  'docs/team-docs/guide.md',
];

for (const status of ['added', 'modified', 'renamed']) {
  for (const [paths, expected] of [
    [curated, false], [blocked, true], [lookalikes, true], [unrelated, false],
  ]) {
    for (const filename of paths) {
      test(`${status}: ${JSON.stringify(filename)} is ${expected ? 'blocked' : 'allowed'}`, () => {
        assert.equal(isForbiddenTeamChange({ filename, status }), expected);
      });
    }
  }
}

for (const filename of [...curated, ...blocked, ...lookalikes, ...unrelated]) {
  test(`removed: ${JSON.stringify(filename)} is allowed`, () => {
    assert.equal(isForbiddenTeamChange({ filename, status: 'removed' }), false);
  });
}

for (const [previous_filename, filename, expected] of [
  ['.ai-team/agents/rusty/charter.md', '.ai-team/agents/rusty/history.md', true],
  ['README.md', '.ai-team/log/session.md', true],
  ['.ai-team/team.md', 'team-docs/team.md', true],
  ['.ai-team/agents/rusty/history.md', '.ai-team/agents/rusty/charter.md', false],
  ['.ai-team/log/session.md', 'docs/session.md', false],
  ['team-docs/team.md', '.ai-team/team.md', false],
]) {
  test(`rename from ${previous_filename} to ${filename} checks the destination`, () => {
    assert.equal(isForbiddenTeamChange({ filename, previous_filename, status: 'renamed' }), expected);
  });
}

test('workflow imports the shared policy and checks every page of PR files', async () => {
  const workflow = await readFile(new URL('../workflows/squad-main-guard.yml', import.meta.url), 'utf8');
  const script = workflow.split('          script: |\n')[1].replace(/^ {12}/gm, '');
  const run = new (Object.getPrototypeOf(async () => {}).constructor)(
    'require', 'process', 'github', 'context', 'core', script,
  );
  const files = Array.from({ length: 100 }, () => ({
    filename: '.ai-team/team.md', status: 'modified',
  }));
  files.push({ filename: '.ai-team/log/session.md', status: 'added' });
  const pages = [];
  let failure;
  await run(
    createRequire(import.meta.url),
    { env: { GITHUB_WORKSPACE: fileURLToPath(new URL('../..', import.meta.url)) } },
    { rest: { pulls: { listFiles: async ({ page, per_page }) => {
      pages.push(page);
      return { data: files.slice((page - 1) * per_page, page * per_page) };
    } } } },
    { repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 24 } } },
    { setFailed: message => { failure = message; }, info: () => assert.fail('must block runtime state') },
  );
  assert.deepEqual(pages, [1, 2]);
  assert.ok(failure.includes('`.ai-team/log/session.md`'));
  assert.ok(!failure.includes('- `.ai-team/team.md`'));
});
