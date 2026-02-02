/**
 * Compare token counts between git refs
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { findMarkdownFiles } from './utils.js';
import {
  estimateTokens,
  normalizePath,
  getErrorMessage,
  MAX_GIT_BUFFER_SIZE,
  GIT_OPERATION_TIMEOUT,
  isMarkdownFile,
  type FileComparison,
  type ComparisonSummary,
  type ComparisonReport
} from './types.js';

interface CompareOptions {
  readonly format?: 'json' | 'table';
  readonly showUnchanged?: boolean;
}

const DEFAULT_OPTIONS: CompareOptions = {
  format: 'table',
  showUnchanged: false
};

/**
 * Gets file content from a git ref.
 */
function getFileFromRef(filePath: string, ref: string): string | null {
  try {
    const result = execSync(`git show ${ref}:${filePath}`, {
      encoding: 'utf-8',
      maxBuffer: MAX_GIT_BUFFER_SIZE,
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result;
  } catch {
    return null;
  }
}

/**
 * Gets list of markdown files from a git ref.
 */
function getFilesFromRef(ref: string): string[] {
  try {
    const result = execSync(`git ls-tree -r --name-only ${ref}`, {
      encoding: 'utf-8',
      maxBuffer: MAX_GIT_BUFFER_SIZE,
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.split('\n').filter(f => isMarkdownFile(f));
  } catch {
    return [];
  }
}

/**
 * Gets current HEAD ref name.
 */
function getCurrentRef(): string {
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch {
    return 'HEAD';
  }
}

/**
 * Checks if we're in a git repository.
 */
function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      encoding: 'utf-8',
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compares two refs.
 */
function compareRefs(baseRef: string, headRef: string, rootDir: string): FileComparison[] {
  const baseFiles = new Set(getFilesFromRef(baseRef));
  const headFiles = new Set(headRef === 'WORKING' ? findMarkdownFiles(rootDir).map(f => relative(rootDir, f)) : getFilesFromRef(headRef));
  const allFiles = new Set([...baseFiles, ...headFiles]);
  
  const comparisons: FileComparison[] = [];
  
  for (const file of allFiles) {
    const baseContent = baseFiles.has(file) ? getFileFromRef(file, baseRef) : null;
    const headContent = headFiles.has(file) 
      ? (headRef === 'WORKING' ? readFileSync(resolve(rootDir, file), 'utf-8') : getFileFromRef(file, headRef))
      : null;
    
    const beforeTokens = baseContent ? estimateTokens(baseContent) : 0;
    const afterTokens = headContent ? estimateTokens(headContent) : 0;
    const diff = afterTokens - beforeTokens;
    const percentChange = beforeTokens > 0 ? ((diff / beforeTokens) * 100) : (afterTokens > 0 ? 100 : 0);
    
    let status: FileComparison['status'];
    if (!baseContent && headContent) {
      status = 'added';
    } else if (baseContent && !headContent) {
      status = 'removed';
    } else if (diff !== 0) {
      status = 'modified';
    } else {
      status = 'unchanged';
    }
    
    comparisons.push({
      file: normalizePath(file),
      before: baseContent ? {
        tokens: beforeTokens,
        characters: baseContent.length,
        lines: baseContent.split('\n').length
      } : null,
      after: headContent ? {
        tokens: afterTokens,
        characters: headContent.length,
        lines: headContent.split('\n').length
      } : null,
      diff,
      percentChange,
      status
    });
  }
  
  return comparisons;
}

/**
 * Calculates comparison summary.
 */
function calculateSummary(comparisons: FileComparison[]): ComparisonSummary {
  const totalBefore = comparisons.reduce((sum, c) => sum + (c.before?.tokens ?? 0), 0);
  const totalAfter = comparisons.reduce((sum, c) => sum + (c.after?.tokens ?? 0), 0);
  const totalDiff = totalAfter - totalBefore;
  const percentChange = totalBefore > 0 ? ((totalDiff / totalBefore) * 100) : (totalAfter > 0 ? 100 : 0);
  
  return {
    totalBefore,
    totalAfter,
    totalDiff,
    percentChange,
    filesAdded: comparisons.filter(c => c.status === 'added').length,
    filesRemoved: comparisons.filter(c => c.status === 'removed').length,
    filesModified: comparisons.filter(c => c.status === 'modified').length,
    filesIncreased: comparisons.filter(c => c.diff > 0).length,
    filesDecreased: comparisons.filter(c => c.diff < 0).length
  };
}

/**
 * Outputs results as a formatted table.
 */
function outputTable(comparisons: FileComparison[], summary: ComparisonSummary, baseRef: string, headRef: string, showUnchanged: boolean): void {
  const filtered = showUnchanged ? comparisons : comparisons.filter(c => c.status !== 'unchanged');
  
  if (filtered.length === 0) {
    console.log('No changes detected.');
    return;
  }
  
  console.log(`\n📊 Token Comparison: ${baseRef} → ${headRef}\n`);
  
  const maxPathLen = Math.max(...filtered.map(c => c.file.length), 4);
  const header = `${'File'.padEnd(maxPathLen)}  ${'Before'.padStart(8)}  ${'After'.padStart(8)}  ${'Diff'.padStart(8)}  Status`;
  
  console.log(header);
  console.log('-'.repeat(header.length + 10));
  
  for (const comp of filtered) {
    const before = comp.before?.tokens ?? '-';
    const after = comp.after?.tokens ?? '-';
    const diffStr = comp.diff > 0 ? `+${comp.diff}` : comp.diff.toString();
    
    const statusIcon = {
      added: '🆕',
      removed: '🗑️',
      modified: comp.diff > 0 ? '📈' : '📉',
      unchanged: '➡️'
    }[comp.status];
    
    console.log(
      `${comp.file.padEnd(maxPathLen)}  ${before.toString().padStart(8)}  ${after.toString().padStart(8)}  ${diffStr.padStart(8)}  ${statusIcon}`
    );
  }
  
  console.log('-'.repeat(header.length + 10));
  
  const totalDiffStr = summary.totalDiff > 0 ? `+${summary.totalDiff}` : summary.totalDiff.toString();
  console.log(
    `${'Total'.padEnd(maxPathLen)}  ${summary.totalBefore.toString().padStart(8)}  ${summary.totalAfter.toString().padStart(8)}  ${totalDiffStr.padStart(8)}  ${summary.percentChange.toFixed(1)}%`
  );
  
  console.log(`\n📋 Summary:`);
  console.log(`   Added: ${summary.filesAdded}, Removed: ${summary.filesRemoved}, Modified: ${summary.filesModified}`);
  console.log(`   Increased: ${summary.filesIncreased}, Decreased: ${summary.filesDecreased}`);
}

/**
 * Outputs results as JSON.
 */
function outputJson(comparisons: FileComparison[], summary: ComparisonSummary, baseRef: string, headRef: string): void {
  const report: ComparisonReport = {
    baseRef,
    headRef,
    timestamp: new Date().toISOString(),
    summary,
    files: comparisons
  };
  
  console.log(JSON.stringify(report, null, 2));
}

/**
 * Main compare command.
 */
export function compare(args: string[], options: CompareOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rootDir = process.cwd();
  
  if (!isGitRepo()) {
    console.error('❌ Not a git repository. Compare command requires git.');
    process.exit(1);
  }
  
  let baseRef: string;
  let headRef: string;
  
  if (args.length === 0) {
    // Compare HEAD with working directory
    baseRef = 'HEAD';
    headRef = 'WORKING';
  } else if (args.length === 1) {
    // Compare specified ref with working directory
    baseRef = args[0];
    headRef = 'WORKING';
  } else {
    // Compare two refs
    baseRef = args[0];
    headRef = args[1];
  }
  
  const comparisons = compareRefs(baseRef, headRef, rootDir);
  const summary = calculateSummary(comparisons);
  
  // Sort: changed files first, then alphabetically
  comparisons.sort((a, b) => {
    if (a.status !== 'unchanged' && b.status === 'unchanged') return -1;
    if (a.status === 'unchanged' && b.status !== 'unchanged') return 1;
    return a.file.localeCompare(b.file);
  });
  
  if (opts.format === 'json') {
    outputJson(comparisons, summary, baseRef, headRef);
  } else {
    outputTable(comparisons, summary, baseRef, headRef, opts.showUnchanged ?? false);
  }
}
