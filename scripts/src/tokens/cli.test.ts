import { describe, expect, it, vi } from 'vitest';
import { main, parseArgs } from './cli.js';

describe('parseArgs', () => {
  it('parses root and config options in equals form', () => {
    const parsed = parseArgs([
      'check',
      '--root=fixtures/project',
      '--config=.sensei-limits.json',
      '--strict',
      'skills/example'
    ]);

    expect(parsed.command).toBe('check');
    expect(parsed.paths).toEqual(['skills/example']);
    expect(parsed.options).toMatchObject({
      root: 'fixtures/project',
      config: '.sensei-limits.json',
      strict: true
    });
  });

  it('parses root and config options in space-separated form', () => {
    const parsed = parseArgs([
      'score',
      '--root',
      'fixtures/project',
      '--config',
      'limits.json'
    ]);

    expect(parsed.command).toBe('score');
    expect(parsed.paths).toEqual([]);
    expect(parsed.options).toMatchObject({
      root: 'fixtures/project',
      config: 'limits.json'
    });
  });

  it('rejects missing option values', () => {
    expect(() => parseArgs(['check', '--root'])).toThrow('Missing value for --root');
    expect(() => parseArgs(['check', '--config', '--strict'])).toThrow('Missing value for --config');
  });
});

describe('main help', () => {
  it('prints published CLI usage for external consumers', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    let help = '';

    try {
      main(['--help']);
      help = log.mock.calls.map(([message]) => String(message)).join('\n');
    } finally {
      log.mockRestore();
    }

    expect(help).toContain('sensei <command> [options] [paths...]');
    expect(help).toContain('npx @spboyer/sensei <command> [options] [paths...]');
    expect(help).toContain('sensei count SKILL.md');
    expect(help).not.toContain('npm run tokens');
  });
});
