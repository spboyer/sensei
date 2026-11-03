/**
 * Compare token counts between git refs
 */

import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { findMarkdownFiles } from './utils.js';
import {
  estimateTokens,
  normalizePath,
  getErrorMessage,
  MAX_GIT_BUFFER_SIZE,
  GIT_OPERATION_TIMEOUT,
  isMarkdownFile,
  type FileTokens,
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

interface GitBlob {
  readonly oid: string;
  readonly size: number;
  readonly path: string;
}

/**
 * Gets markdown file contents from a git ref with bounded batch reads.
 */
function getFilesFromRef(ref: string): Map<string, FileTokens> {
  try {
    const tree = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', `${ref}^{tree}`], {
      encoding: 'utf-8',
      maxBuffer: MAX_GIT_BUFFER_SIZE,
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const listing = execFileSync('git', ['ls-tree', '-r', '-z', '-l', tree], {
      encoding: 'utf-8',
      maxBuffer: MAX_GIT_BUFFER_SIZE,
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const blobs = listing
      .split('\0')
      .filter(Boolean)
      .map(parseGitBlob)
      .filter((blob): blob is GitBlob => blob !== null && isMarkdownFile(blob.path));

    return readGitBlobs(blobs);
  } catch {
    return new Map();
  }
}

function parseGitBlob(entry: string): GitBlob | null {
  const match = /^\d+\s+blob\s+([0-9a-f]+)\s+(\d+)\t([\s\S]+)$/.exec(entry);
  return match ? { oid: match[1], size: Number(match[2]), path: match[3] } : null;
}

function readGitBlobs(blobs: GitBlob[]): Map<string, FileTokens> {
  const unique = new Map<string, number>();
  for (const blob of blobs) {
    unique.set(blob.oid, blob.size);
  }

  const groups: Array<Array<[string, number]>> = [];
  let group: Array<[string, number]> = [];
  let groupSize = 0;
  for (const entry of unique) {
    if (group.length > 0 && groupSize + entry[1] > MAX_GIT_BUFFER_SIZE) {
      groups.push(group);
      group = [];
      groupSize = 0;
    }
    group.push(entry);
    groupSize += entry[1];
  }
  if (group.length > 0) groups.push(group);

  const contents = new Map<string, FileTokens>();
  for (const batch of groups) {
    const result = spawnSync('git', ['cat-file', '--batch'], {
      input: `${batch.map(([oid]) => oid).join('\n')}\n`,
      maxBuffer: MAX_GIT_BUFFER_SIZE + batch.length * 128,
      timeout: GIT_OPERATION_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result.status !== 0 || result.error) continue;

    let offset = 0;
    for (const [requestedOid] of batch) {
      const headerEnd = result.stdout.indexOf(10, offset);
      if (headerEnd < 0) break;
      const header = result.stdout.subarray(offset, headerEnd).toString('utf8');
      const [oid, type, rawSize] = header.split(' ');
      const size = Number(rawSize);
      if (oid !== requestedOid || type !== 'blob' || !Number.isSafeInteger(size)) break;
      const contentStart = headerEnd + 1;
      const contentEnd = contentStart + size;
      contents.set(oid, measureContent(result.stdout.subarray(contentStart, contentEnd).toString('utf8')));
      offset = contentEnd + 1;
    }
  }

  return new Map(blobs.flatMap(blob => {
    const content = contents.get(blob.oid);
    return content === undefined ? [] : [[blob.path, content] as const];
  }));
}

function measureContent(content: string): FileTokens {
  return {
    tokens: estimateTokens(content),
    characters: content.length,
    lines: content.split('\n').length
  };
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
  const baseFiles = getFilesFromRef(baseRef);
  const headFiles = headRef === 'WORKING'
    ? new Map(findMarkdownFiles(rootDir).map(file => [relative(rootDir, file), measureContent(readFileSync(file, 'utf-8'))]))
    : getFilesFromRef(headRef);
  const allFiles = new Set([...baseFiles.keys(), ...headFiles.keys()]);
  
  const comparisons: FileComparison[] = [];
  
  for (const file of allFiles) {
    const baseSnapshot = baseFiles.get(file);
    const headSnapshot = headFiles.get(file);
    const before = baseSnapshot && baseSnapshot.characters > 0 ? baseSnapshot : null;
    const after = headSnapshot && headSnapshot.characters > 0 ? headSnapshot : null;
    
    const beforeTokens = before?.tokens ?? 0;
    const afterTokens = after?.tokens ?? 0;
    const diff = afterTokens - beforeTokens;
    const percentChange = beforeTokens > 0 ? ((diff / beforeTokens) * 100) : (afterTokens > 0 ? 100 : 0);
    
    let status: FileComparison['status'];
    if (!before && after) {
      status = 'added';
    } else if (before && !after) {
      status = 'removed';
    } else if (diff !== 0) {
      status = 'modified';
    } else {
      status = 'unchanged';
    }
    
    comparisons.push({
      file: normalizePath(file),
      before,
      after,
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
