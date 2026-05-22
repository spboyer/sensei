/**
 * Shared utility functions for token commands
 */

import { readFileSync, readdirSync, existsSync, statSync, Dirent } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
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
export function loadConfig(rootDir: string, explicitConfigPath?: string): TokenLimitsConfig {
  const configPath = explicitConfigPath
    ? resolveConfigPath(rootDir, explicitConfigPath)
    : join(rootDir, '.token-limits.json');

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      if (!parsed.defaults || typeof parsed.defaults !== 'object') {
        throw new Error('Missing or invalid "defaults" field');
      }
      
      return parsed as TokenLimitsConfig;
    } catch (error) {
      if (explicitConfigPath) {
        throw new Error(`Invalid token limits config at ${configPath}: ${getErrorMessage(error)}`);
      }
      console.error(`⚠️  Warning: Invalid .token-limits.json (${getErrorMessage(error)}), using defaults`);
      return DEFAULT_LIMITS;
    }
  }

  if (explicitConfigPath) {
    throw new Error(`Token limits config not found: ${configPath}`);
  }
  
  return DEFAULT_LIMITS;
}

function resolveConfigPath(rootDir: string, configPath: string): string {
  return isAbsolute(configPath) ? configPath : resolve(rootDir, configPath);
}

export function resolveRootDir(root?: string): string {
  const rootDir = resolve(process.cwd(), root ?? '.');
  if (!existsSync(rootDir)) {
    throw new Error(`Root path not found: ${rootDir}`);
  }
  if (!statSync(rootDir).isDirectory()) {
    throw new Error(`Root path is not a directory: ${rootDir}`);
  }
  return rootDir;
}

export function resolvePathFromRoot(rootDir: string, inputPath: string): string {
  const fullPath = isAbsolute(inputPath) ? resolve(inputPath) : resolve(rootDir, inputPath);
  const relativePath = relative(rootDir, fullPath);

  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Path is outside the configured root: ${inputPath}`);
  }

  return fullPath;
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
