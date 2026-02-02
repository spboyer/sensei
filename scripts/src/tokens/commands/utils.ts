/**
 * Shared utility functions for token commands
 */

import { readFileSync, readdirSync, existsSync, Dirent } from 'node:fs';
import { join } from 'node:path';
import type { TokenLimitsConfig } from './types.js';
import {
  DEFAULT_LIMITS,
  EXCLUDED_DIRS,
  isMarkdownFile,
  normalizePath,
  matchesPattern,
  getErrorMessage
} from './types.js';

/**
 * Loads token limits configuration from .token-limits.json or returns defaults.
 */
export function loadConfig(rootDir: string): TokenLimitsConfig {
  const configPath = join(rootDir, '.token-limits.json');
  
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      if (!parsed.defaults || typeof parsed.defaults !== 'object') {
        throw new Error('Missing or invalid "defaults" field');
      }
      
      return parsed as TokenLimitsConfig;
    } catch (error) {
      console.error(`⚠️  Warning: Invalid .token-limits.json (${getErrorMessage(error)}), using defaults`);
      return DEFAULT_LIMITS;
    }
  }
  
  return DEFAULT_LIMITS;
}

/**
 * Calculates specificity score for a glob pattern.
 */
function getPatternSpecificity(pattern: string): number {
  let score = 0;
  
  if (!pattern.includes('*')) {
    score += 10000;
  }
  
  score += (pattern.split('/').length - 1) * 100;
  
  const starCount = (pattern.match(/(?<!\*)\*(?!\*)/g) || []).length;
  const globstarCount = (pattern.match(/\*\*/g) || []).length;
  score += starCount * 10;
  score -= globstarCount * 50;
  score += pattern.length;
  
  return score;
}

/**
 * Determines the token limit and matching pattern for a given file.
 */
export function getLimitForFile(filePath: string, config: TokenLimitsConfig, rootDir: string): { limit: number; pattern: string } {
  const normalizedPath = normalizePath(filePath);
  
  // Check overrides first (exact matches)
  for (const [overridePath, limit] of Object.entries(config.overrides)) {
    if (normalizedPath === overridePath || normalizedPath.endsWith('/' + overridePath)) {
      return { limit, pattern: overridePath };
    }
  }
  
  // Check defaults (sorted by specificity)
  const sortedDefaults = Object.entries(config.defaults)
    .sort(([a], [b]) => getPatternSpecificity(b) - getPatternSpecificity(a));
  
  for (const [pattern, limit] of sortedDefaults) {
    if (matchesPattern(normalizedPath, pattern)) {
      return { limit, pattern };
    }
  }
  
  return { limit: config.defaults['*.md'] ?? 2000, pattern: '*.md' };
}

/**
 * Recursively finds all markdown files in a directory.
 */
export function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  let entries: Dirent[];
  
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (process.env.DEBUG) {
      console.error(`Failed to read directory ${dir}: ${getErrorMessage(error)}`);
    }
    return files;
  }
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const dirName = entry.name;
      const isExcluded = EXCLUDED_DIRS.some(excluded => excluded === dirName);
      if (!isExcluded) {
        findMarkdownFiles(fullPath, files);
      }
    } else if (isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}
