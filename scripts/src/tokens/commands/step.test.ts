import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { step } from './step.js';

describe('sensei step', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'sensei-step-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('seeds the run dir and manifest on first call', async () => {
    await step({
      runId: '01TEST',
      append: '{"step":"READ","skill":"foo"}',
      artifactsDir: tmp,
    });
    const runDir = join(tmp, 'runs', '01TEST');
    expect(existsSync(runDir)).toBe(true);
    const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
    expect(manifest.runId).toBe('01TEST');
    expect(typeof manifest.startedAt).toBe('string');
  });

  it('appends one JSON line per call with an auto-stamped timestamp', async () => {
    await step({ runId: '01R', append: '{"step":"READ"}', artifactsDir: tmp });
    await step({ runId: '01R', append: '{"step":"SCORE"}', artifactsDir: tmp });
    const ndjson = readFileSync(join(tmp, 'runs', '01R', 'steps.ndjson'), 'utf8');
    const lines = ndjson.trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.step).toBe('READ');
    expect(typeof first.t).toBe('string');
  });

  it('preserves a caller-provided timestamp', async () => {
    await step({
      runId: '01R',
      append: '{"step":"READ","t":"2026-01-01T00:00:00.000Z"}',
      artifactsDir: tmp,
    });
    const line = readFileSync(join(tmp, 'runs', '01R', 'steps.ndjson'), 'utf8').trim();
    const parsed = JSON.parse(line);
    expect(parsed.t).toBe('2026-01-01T00:00:00.000Z');
  });

  it('updates latest.txt atomically to the active runId', async () => {
    await step({ runId: '01A', append: '{"x":1}', artifactsDir: tmp });
    expect(readFileSync(join(tmp, 'runs', 'latest.txt'), 'utf8')).toBe('01A');
    await step({ runId: '01B', append: '{"x":2}', artifactsDir: tmp });
    expect(readFileSync(join(tmp, 'runs', 'latest.txt'), 'utf8')).toBe('01B');
  });

  it('reads payload from stdin when --append is "-"', async () => {
    const stdin = Readable.from(['{"step":"PIPED"}']);
    await step({ runId: '01P', append: '-', artifactsDir: tmp, stdin });
    const line = readFileSync(join(tmp, 'runs', '01P', 'steps.ndjson'), 'utf8').trim();
    expect(JSON.parse(line).step).toBe('PIPED');
  });

  it('rejects non-JSON payloads', async () => {
    await expect(
      step({ runId: '01R', append: 'not json', artifactsDir: tmp })
    ).rejects.toThrow(/not valid JSON/);
  });

  it('rejects JSON arrays and primitives', async () => {
    await expect(
      step({ runId: '01R', append: '[1,2,3]', artifactsDir: tmp })
    ).rejects.toThrow(/must be a JSON object/);
    await expect(
      step({ runId: '01R', append: '"hi"', artifactsDir: tmp })
    ).rejects.toThrow(/must be a JSON object/);
  });

  it('requires --run-id and --append', async () => {
    await expect(step({ append: '{}', artifactsDir: tmp })).rejects.toThrow(/--run-id/);
    await expect(step({ runId: '01R', artifactsDir: tmp })).rejects.toThrow(/--append/);
  });

  it('does not re-seed manifest on subsequent calls (preserves startedAt)', async () => {
    await step({ runId: '01R', append: '{"x":1}', artifactsDir: tmp });
    const before = readFileSync(join(tmp, 'runs', '01R', 'manifest.json'), 'utf8');
    // Spin enough for ISO ms to differ.
    await new Promise((r) => setTimeout(r, 5));
    await step({ runId: '01R', append: '{"x":2}', artifactsDir: tmp });
    const after = readFileSync(join(tmp, 'runs', '01R', 'manifest.json'), 'utf8');
    expect(after).toBe(before);
  });
});
