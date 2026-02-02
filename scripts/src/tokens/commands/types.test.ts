/**
 * Tests for types.ts utilities
 */

import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  isMarkdownFile,
  normalizePath,
  globToRegex,
  matchesPattern,
  getErrorMessage,
  MAX_PATTERN_LENGTH
} from './types.js';

describe('estimateTokens', () => {
  it('estimates tokens at ~4 chars per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('test')).toBe(1);
    expect(estimateTokens('testing')).toBe(2);
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });
});

describe('isMarkdownFile', () => {
  it('identifies markdown files', () => {
    expect(isMarkdownFile('README.md')).toBe(true);
    expect(isMarkdownFile('doc.mdx')).toBe(true);
    expect(isMarkdownFile('SKILL.MD')).toBe(true);
  });

  it('rejects non-markdown files', () => {
    expect(isMarkdownFile('script.ts')).toBe(false);
    expect(isMarkdownFile('config.json')).toBe(false);
    expect(isMarkdownFile('file.txt')).toBe(false);
  });
});

describe('normalizePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('path\\to\\file.md')).toBe('path/to/file.md');
    expect(normalizePath('path/to/file.md')).toBe('path/to/file.md');
  });
});

describe('globToRegex', () => {
  it('converts simple patterns', () => {
    const regex = globToRegex('*.md');
    expect(regex.test('README.md')).toBe(true);
    expect(regex.test('file.txt')).toBe(false);
  });

  it('converts directory patterns', () => {
    const regex = globToRegex('references/**/*.md');
    // **/*.md requires at least one subdirectory level
    expect(regex.test('references/templates/jest.md')).toBe(true);
    expect(regex.test('references/deep/nested/file.md')).toBe(true);
  });

  it('converts simple wildcard patterns', () => {
    const regex = globToRegex('references/*.md');
    expect(regex.test('references/scoring.md')).toBe(true);
    expect(regex.test('references/deep/file.md')).toBe(false);
  });

  it('throws for excessively long patterns', () => {
    const longPattern = 'a'.repeat(MAX_PATTERN_LENGTH + 1);
    expect(() => globToRegex(longPattern)).toThrow();
  });
});

describe('matchesPattern', () => {
  it('matches exact filenames', () => {
    expect(matchesPattern('SKILL.md', 'SKILL.md')).toBe(true);
    expect(matchesPattern('path/to/SKILL.md', 'SKILL.md')).toBe(true);
  });

  it('matches glob patterns', () => {
    expect(matchesPattern('references/sub/scoring.md', 'references/**/*.md')).toBe(true);
    expect(matchesPattern('other/file.md', 'references/**/*.md')).toBe(false);
    expect(matchesPattern('references/scoring.md', 'references/*.md')).toBe(true);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error objects', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('converts non-errors to string', () => {
    expect(getErrorMessage('string error')).toBe('string error');
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage({ foo: 'bar' })).toBe('[object Object]');
  });
});
