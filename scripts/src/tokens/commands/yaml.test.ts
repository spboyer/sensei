import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../../parse.js';
import { scoreSkillContent } from '../../score.js';

const skill = (fields: string) => `---\n${fields}\n---\n# Instructions\n`;
const minimal = 'name: sample-skill\ndescription: Extract PDF text when handling documents.';

describe('published YAML parsing and scoring', () => {
  it('accepts the minimal standard example without optional spec warnings', () => {
    const result = scoreSkillContent(skill(minimal), { path: '/skills/sample-skill' });
    expect(result.specChecks.every(check => check.status === 'ok')).toBe(true);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'license-recommendation', status: 'warning' }),
      expect.objectContaining({ name: 'version-recommendation', status: 'warning' })
    ]));
  });

  it('preserves real nested string metadata and recognizes version', () => {
    const content = skill(`${minimal}\nmetadata:\n  author: example-org\n  version: "1.0"\nlicense: MIT`);
    expect(parseFrontmatter(content)?.fields.metadata).toEqual({ author: 'example-org', version: '1.0' });
    expect(scoreSkillContent(content).checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'version-recommendation', status: 'optimal' })
    ]));
  });

  it.each([
    ['"Extract \\"PDF\\" text." # comment', 'Extract "PDF" text.'],
    ["'Extract PDF: text # literally.'", 'Extract PDF: text # literally.'],
    ['>-\n  Extract PDF text\n  when requested.', 'Extract PDF text when requested.'],
    ['|\n  Extract PDF text.\n  Keep lines.', 'Extract PDF text.\nKeep lines.\n'],
    ['>-2\n  Extract PDF text.', 'Extract PDF text.']
  ])('preserves YAML scalar semantics: %s', (value, expected) => {
    expect(parseFrontmatter(skill(`name: sample-skill\ndescription: ${value}`))?.description).toBe(expected);
  });

  it.each([
    ['name: sample-skill\nname: duplicate\ndescription: text', 'unique'],
    [`${minimal}\nmetadata:\n  version: "1"\n  version: "2"`, 'unique'],
    ['name: [unclosed', 'Flow'],
    ['- name: sample-skill', 'mapping'],
    ['null', 'mapping'],
    ['!!set {name, description}', 'mapping'],
    ['42: value', 'keys must be strings'],
    [`${minimal}\nmetadata:\n  42: value`, 'Metadata keys'],
    [`${minimal}\nlicense: !custom value`, 'Unresolved tag'],
    [`${minimal}\nlicense: *missing`, 'Unresolved alias'],
    [`${minimal}\nlicense: &key version\nmetadata:\n  version: "1"\n  *key : "2"`, 'keys must be unique'],
    [`${minimal}\nlicense: &key 42\nmetadata:\n  *key : "1"`, 'Metadata keys']
  ])('diagnoses invalid delimited YAML without throwing: %s', (fields, message) => {
    const content = skill(fields);
    expect(parseFrontmatter(content)?.errors?.join(' ')).toContain(message);
    const check = scoreSkillContent(content).specChecks[0];
    expect(check.status).toBe('warning');
    expect(check.message).toContain('Cannot validate YAML');
  });

  it('resolves valid scalar aliases without rejecting portable YAML', () => {
    const content = skill(`${minimal}\nmetadata:\n  version: &v "1.0"\n  release: *v\nlicense: &license MIT\ncompatibility: *license`);
    expect(parseFrontmatter(content)?.fields.metadata).toEqual({ version: '1.0', release: '1.0' });
    expect(scoreSkillContent(content).specChecks.every(check => check.status === 'ok')).toBe(true);
  });

  it('resolves string-key aliases without losing metadata types', () => {
    const content = skill(`${minimal}\nlicense: &key version\nmetadata:\n  *key : "1.0"`);
    expect(parseFrontmatter(content)?.fields.metadata).toEqual({ version: '1.0' });
    expect(scoreSkillContent(content).specChecks.every(check => check.status === 'ok')).toBe(true);
  });

  it('reports the finite alias-resolution limit without throwing', () => {
    const content = skill(`${minimal}\nmetadata:\n  version: &v "1.0"\n${Array.from({ length: 101 }, (_, i) => `  release-${i}: *v`).join('\n')}`);
    expect(parseFrontmatter(content)?.errors?.join(' ')).toContain('Excessive alias count');
    expect(scoreSkillContent(content).specChecks[0].status).toBe('warning');
  });

  it.each(['name: true\ndescription: text', 'name: 42\ndescription: text', 'name: sample-skill\ndescription: false'])(
    'diagnoses required non-string fields: %s', fields => {
      expect(scoreSkillContent(skill(fields)).specChecks[0].message).toContain('must be a string');
    }
  );

  it.each(['license: true', 'allowed-tools: [Read, Bash]', 'compatibility: false',
    'metadata: version', 'metadata: null', 'metadata: [value]', 'metadata: !!set {a, b}',
    'metadata: !!timestamp 2001-12-15', 'metadata:\n  version: 1.0',
    'metadata:\n  nested:\n    version: "1"'])('rejects optional field type: %s', field => {
    const result = scoreSkillContent(skill(`${minimal}\n${field}`));
    expect(result.specChecks.find(check => check.name === 'spec-field-types')?.status).toBe('warning');
  });

  it.each(['""', '"   "', `"${'x'.repeat(501)}"`])('rejects empty/oversized compatibility %s', value => {
    const result = scoreSkillContent(skill(`${minimal}\ncompatibility: ${value}`));
    expect(result.specChecks.find(check => check.name === 'spec-compatibility')?.status).toBe('warning');
  });

  it('accepts compatibility boundaries and experimental allowed-tools', () => {
    for (const value of ['x', 'x'.repeat(500)]) {
      const result = scoreSkillContent(skill(`${minimal}\ncompatibility: "${value}"\nallowed-tools: Bash(git:*) Read`));
      expect(result.specChecks.every(check => check.status === 'ok')).toBe(true);
    }
  });

  it.each(['""', 'Uppercase', '-leading', 'trailing-', 'two--hyphens', 'under_score', 'x'.repeat(65)])(
    'rejects invalid names %s', name => {
      expect(scoreSkillContent(skill(`name: ${name}\ndescription: text`)).specChecks.some(check => check.status === 'warning')).toBe(true);
    }
  );

  it.each(['x', 'x'.repeat(64)])('accepts name length boundaries %s', name => {
    expect(scoreSkillContent(skill(`name: ${name}\ndescription: text`)).specChecks.every(check => check.status === 'ok')).toBe(true);
  });

  it('keeps strict host extension warnings separate from portable claims', () => {
    const result = scoreSkillContent(skill(`${minimal}\nmodel: host-specific`));
    expect(result.specChecks.find(check => check.name === 'spec-allowed-fields')?.status).toBe('warning');
  });

  it('anchors delimiters to the start and requires a complete closing line', () => {
    expect(parseFrontmatter(`text\n${skill(minimal)}`)).toBeNull();
    expect(parseFrontmatter(`---\n${minimal}\n---not-a-delimiter`)).toBeNull();
    expect(parseFrontmatter('---\nname: unclosed')).toBeNull();
    expect(parseFrontmatter(skill(minimal).replaceAll('\n', '\r\n'))?.name).toBe('sample-skill');
    expect(parseFrontmatter('---\n---\n')?.errors?.join(' ')).toContain('mapping');
  });
});
