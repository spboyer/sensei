import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  SENSEI_EXTENSION_ID,
  encodeExtensionId,
  resolveCopilotHome,
  resolveArtifactsDir,
  resolveRunDir,
  resolveLatestPointerPath,
} from './artifacts.js';

describe('encodeExtensionId', () => {
  it('pins the sensei canonical id mapping', () => {
    // CRITICAL: this exact string is duplicated in .canvas/extension.mjs.
    // If this test fails or you change it, update both places.
    // Matches the Copilot CLI runtime's encoding (percent-encoding).
    expect(encodeExtensionId(SENSEI_EXTENSION_ID)).toBe(
      'skill%3Agithub.com%2Fspboyer%2Fsensei%3Asensei'
    );
  });

  it('is reversible via decodeURIComponent', () => {
    expect(decodeURIComponent(encodeExtensionId(SENSEI_EXTENSION_ID))).toBe(
      SENSEI_EXTENSION_ID
    );
  });

  it('round-trips ids whose components contain underscores (regression)', () => {
    // The previous __/_ scheme collided here because GitHub repo names
    // allow underscores (e.g. `my_repo`). Percent-encoding handles this.
    const id = 'skill:github.com/owner/my_repo:foo';
    expect(decodeURIComponent(encodeExtensionId(id))).toBe(id);
  });

  it('produces only filesystem-safe characters', () => {
    const encoded = encodeExtensionId(SENSEI_EXTENSION_ID);
    // %-encoded results are alphanumeric, dot, dash, underscore, tilde,
    // and percent — all safe on NTFS, APFS, and ext4.
    expect(encoded).toMatch(/^[A-Za-z0-9._\-~%]+$/);
  });
});

describe('resolveCopilotHome', () => {
  const originalHome = process.env.COPILOT_HOME;
  afterEach(() => {
    if (originalHome === undefined) delete process.env.COPILOT_HOME;
    else process.env.COPILOT_HOME = originalHome;
  });

  it('uses COPILOT_HOME when set', () => {
    process.env.COPILOT_HOME = '/tmp/fake-copilot';
    expect(resolveCopilotHome()).toBe('/tmp/fake-copilot');
  });

  it('falls back to $HOME/.copilot', () => {
    delete process.env.COPILOT_HOME;
    expect(resolveCopilotHome()).toBe(join(homedir(), '.copilot'));
  });
});

describe('resolveArtifactsDir', () => {
  const originalEnv = {
    home: process.env.COPILOT_HOME,
    dir: process.env.COPILOT_EXTENSION_ARTIFACTS_DIR,
  };

  beforeEach(() => {
    delete process.env.COPILOT_EXTENSION_ARTIFACTS_DIR;
  });

  afterEach(() => {
    if (originalEnv.home === undefined) delete process.env.COPILOT_HOME;
    else process.env.COPILOT_HOME = originalEnv.home;
    if (originalEnv.dir === undefined) delete process.env.COPILOT_EXTENSION_ARTIFACTS_DIR;
    else process.env.COPILOT_EXTENSION_ARTIFACTS_DIR = originalEnv.dir;
  });

  it('honors explicit override above everything', () => {
    process.env.COPILOT_EXTENSION_ARTIFACTS_DIR = '/env/dir';
    expect(resolveArtifactsDir('/cli/dir')).toBe('/cli/dir');
  });

  it('honors COPILOT_EXTENSION_ARTIFACTS_DIR when no override', () => {
    process.env.COPILOT_EXTENSION_ARTIFACTS_DIR = '/env/dir';
    expect(resolveArtifactsDir()).toBe('/env/dir');
  });

  it('computes default from COPILOT_HOME + encoded id', () => {
    process.env.COPILOT_HOME = '/tmp/copilot';
    expect(resolveArtifactsDir()).toBe(
      '/tmp/copilot/extensions/skill%3Agithub.com%2Fspboyer%2Fsensei%3Asensei/artifacts'
    );
  });
});

describe('resolveRunDir / resolveLatestPointerPath', () => {
  it('places runs under <artifactsDir>/runs/<ULID>', () => {
    expect(resolveRunDir('/a', '01JX')).toBe(join('/a', 'runs', '01JX'));
  });

  it('places latest pointer at <artifactsDir>/runs/latest.txt', () => {
    expect(resolveLatestPointerPath('/a')).toBe(join('/a', 'runs', 'latest.txt'));
  });
});
