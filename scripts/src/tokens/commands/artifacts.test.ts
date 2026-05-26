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
    expect(encodeExtensionId(SENSEI_EXTENSION_ID)).toBe(
      'skill__github.com_spboyer_sensei__sensei'
    );
  });

  it('replaces colons with double underscores', () => {
    expect(encodeExtensionId('a:b:c')).toBe('a__b__c');
  });

  it('replaces slashes with single underscores', () => {
    expect(encodeExtensionId('a/b/c')).toBe('a_b_c');
  });

  it('lowercases the result', () => {
    expect(encodeExtensionId('Skill:GitHub.com/Foo/Bar:Baz')).toBe(
      'skill__github.com_foo_bar__baz'
    );
  });

  it('produces only filesystem-safe characters', () => {
    const encoded = encodeExtensionId(SENSEI_EXTENSION_ID);
    expect(encoded).toMatch(/^[a-z0-9._-]+$/);
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
      '/tmp/copilot/extensions/skill__github.com_spboyer_sensei__sensei/artifacts'
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
