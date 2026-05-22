import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from './parse.js';
import { checkNameCompliance } from './checks.js';
import { scoreSkillContent } from './score.js';

describe('public export modules', () => {
  const content = `---
name: sample-skill
description: "Analyze sample skills. WHEN: \\"sample skill\\", \\"skill check\\"."
---

# Sample Skill
`;

  it('exports parsing helpers from @spboyer/sensei/parse', () => {
    expect(parseFrontmatter(content)?.name).toBe('sample-skill');
  });

  it('exports check helpers from @spboyer/sensei/checks', () => {
    expect(checkNameCompliance('sample-skill').status).toBe('ok');
  });

  it('exports scoring helpers from @spboyer/sensei/score', () => {
    expect(scoreSkillContent(content).skillPath).toBe('<memory>');
  });
});
