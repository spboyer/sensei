export function isForbiddenTeamChange({ filename, status }) {
  if (status === 'removed') return false;
  if (filename === '.ai-team/team.md' || filename === '.ai-team/decisions.md') {
    return false;
  }

  const charter = /^\.ai-team\/agents\/([^/\\\r\n]+)\/charter\.md$/.exec(filename);
  if (charter && charter[0] === filename && charter[1] !== '.' && charter[1] !== '..') {
    return false;
  }

  return filename === '.ai-team' || filename.startsWith('.ai-team/') ||
    filename === 'team-docs' || filename.startsWith('team-docs/');
}
