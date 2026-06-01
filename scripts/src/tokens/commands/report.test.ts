import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { report, renderReportMarkdown, RunSummary } from './report.js';
import { step } from './step.js';

describe('renderReportMarkdown', () => {
  it('renders the minimal summary with a heading and metadata', () => {
    const md = renderReportMarkdown({ title: 'My Run' }, '01ULID');
    expect(md).toContain('# My Run');
    expect(md).toContain('`01ULID`');
    expect(md).toContain('**Finished:**');
  });

  it('renders the per-skill table when skills are present', () => {
    const md = renderReportMarkdown(
      {
        title: 'T',
        skills: [
          {
            name: 'pdf',
            before: { score: 'Low', tokens: 100 },
            after: { score: 'Medium-High', tokens: 380 },
            decision: 'commit',
          },
        ],
      },
      '01U'
    );
    expect(md).toContain('| Skill | Before | After | Tokens | Decision |');
    expect(md).toContain('| `pdf` | Low | Medium-High | 100 → 380 | commit |');
  });

  it('omits the skills section when there are none', () => {
    const md = renderReportMarkdown({ title: 'T' }, '01U');
    expect(md).not.toContain('## Skills');
  });

  it('shows em-dash placeholders for missing fields', () => {
    const md = renderReportMarkdown(
      { skills: [{ name: 'foo' }] },
      '01U'
    );
    expect(md).toContain('| `foo` | — | — | — | — |');
  });

  it('appends a Notes subsection when any skill has notes', () => {
    const md = renderReportMarkdown(
      { skills: [{ name: 'foo', notes: 'tricky' }] },
      '01U'
    );
    expect(md).toContain('### Notes');
    expect(md).toContain('- **foo** — tricky');
  });

  it('appends a free-form summary section when provided', () => {
    const md = renderReportMarkdown({ notes: 'all good' }, '01U');
    expect(md).toContain('## Summary');
    expect(md).toContain('all good');
  });
});

describe('sensei report --finalize', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'sensei-report-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeInput(payload: RunSummary): string {
    const p = join(tmp, 'input.json');
    writeFileSync(p, JSON.stringify(payload), 'utf8');
    return p;
  }

  it('writes report.md, updates manifest, and points latest.txt at the run', async () => {
    const inputPath = writeInput({ title: 'Hello', skills: [{ name: 'pdf' }] });
    await report({
      runId: '01FIN',
      input: inputPath,
      artifactsDir: tmp,
    });
    const runDir = join(tmp, 'runs', '01FIN');
    expect(readFileSync(join(runDir, 'report.md'), 'utf8')).toContain('# Hello');
    const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
    expect(manifest.finishedAt).toBeTruthy();
    expect(manifest.summary.title).toBe('Hello');
    expect(readFileSync(join(tmp, 'runs', 'latest.txt'), 'utf8')).toBe('01FIN');
  });

  it('preserves startedAt from a manifest seeded by sensei step', async () => {
    await step({ runId: '01M', append: '{"x":1}', artifactsDir: tmp });
    const before = JSON.parse(
      readFileSync(join(tmp, 'runs', '01M', 'manifest.json'), 'utf8')
    );
    await new Promise((r) => setTimeout(r, 5));
    await report({
      runId: '01M',
      input: writeInput({ title: 'After steps' }),
      artifactsDir: tmp,
    });
    const after = JSON.parse(
      readFileSync(join(tmp, 'runs', '01M', 'manifest.json'), 'utf8')
    );
    expect(after.startedAt).toBe(before.startedAt);
    expect(after.finishedAt).toBeTruthy();
    expect(after.finishedAt).not.toBe(after.startedAt);
  });

  it('reads input from stdin when --input is "-"', async () => {
    const stdin = Readable.from([JSON.stringify({ title: 'Piped' })]);
    await report({ runId: '01P', input: '-', artifactsDir: tmp, stdin });
    expect(readFileSync(join(tmp, 'runs', '01P', 'report.md'), 'utf8')).toContain(
      '# Piped'
    );
  });

  it('requires --run-id and --input', async () => {
    await expect(report({ input: 'x', artifactsDir: tmp })).rejects.toThrow(/--run-id/);
    await expect(report({ runId: '01', artifactsDir: tmp })).rejects.toThrow(/--input/);
  });

  it('rejects invalid JSON input', async () => {
    const p = join(tmp, 'bad.json');
    writeFileSync(p, 'not json', 'utf8');
    await expect(
      report({ runId: '01R', input: p, artifactsDir: tmp })
    ).rejects.toThrow(/not valid JSON/);
  });
});
