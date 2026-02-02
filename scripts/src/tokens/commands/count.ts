/**
 * Count tokens in markdown files
 */

import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { findMarkdownFiles } from './utils.js';
import {
  estimateTokens,
  normalizePath,
  getErrorMessage,
  type TokenMetadata
} from './types.js';

interface CountOptions {
  readonly format?: 'json' | 'table';
  readonly sort?: 'tokens' | 'name' | 'path';
  readonly minTokens?: number;
  readonly showTotal?: boolean;
}

const DEFAULT_OPTIONS: CountOptions = {
  format: 'table',
  sort: 'path',
  minTokens: 0,
  showTotal: true
};

interface FileResult {
  readonly path: string;
  readonly tokens: number;
  readonly characters: number;
  readonly lines: number;
}

/**
 * Counts tokens in a single file.
 */
function countFile(filePath: string, rootDir: string): FileResult | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = normalizePath(relative(rootDir, filePath));
    
    return {
      path: relativePath,
      tokens: estimateTokens(content),
      characters: content.length,
      lines: content.split('\n').length
    };
  } catch (error) {
    console.error(`⚠️  Error reading ${filePath}: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * Sorts results based on sort option.
 */
function sortResults(results: FileResult[], sort: string): FileResult[] {
  return [...results].sort((a, b) => {
    switch (sort) {
      case 'tokens':
        return b.tokens - a.tokens;
      case 'name':
        const nameA = a.path.split('/').pop() ?? a.path;
        const nameB = b.path.split('/').pop() ?? b.path;
        return nameA.localeCompare(nameB);
      default:
        return a.path.localeCompare(b.path);
    }
  });
}

/**
 * Outputs results as a formatted table.
 */
function outputTable(results: FileResult[], showTotal: boolean): void {
  if (results.length === 0) {
    console.log('No markdown files found.');
    return;
  }
  
  const maxPathLen = Math.max(...results.map(r => r.path.length), 4);
  const header = `${'File'.padEnd(maxPathLen)}  ${'Tokens'.padStart(8)}  ${'Chars'.padStart(8)}  ${'Lines'.padStart(6)}`;
  
  console.log(header);
  console.log('-'.repeat(header.length));
  
  for (const result of results) {
    console.log(
      `${result.path.padEnd(maxPathLen)}  ${result.tokens.toString().padStart(8)}  ${result.characters.toString().padStart(8)}  ${result.lines.toString().padStart(6)}`
    );
  }
  
  if (showTotal) {
    console.log('-'.repeat(header.length));
    const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
    const totalChars = results.reduce((sum, r) => sum + r.characters, 0);
    const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
    console.log(
      `${'Total'.padEnd(maxPathLen)}  ${totalTokens.toString().padStart(8)}  ${totalChars.toString().padStart(8)}  ${totalLines.toString().padStart(6)}`
    );
    console.log(`\n${results.length} file(s) scanned`);
  }
}

/**
 * Outputs results as JSON.
 */
function outputJson(results: FileResult[], rootDir: string): void {
  const metadata: TokenMetadata = {
    generatedAt: new Date().toISOString(),
    totalTokens: results.reduce((sum, r) => sum + r.tokens, 0),
    totalFiles: results.length,
    files: Object.fromEntries(
      results.map(r => [
        r.path,
        {
          tokens: r.tokens,
          characters: r.characters,
          lines: r.lines,
          lastUpdated: new Date().toISOString()
        }
      ])
    )
  };
  
  console.log(JSON.stringify(metadata, null, 2));
}

/**
 * Main count command.
 */
export function count(paths: string[], options: CountOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rootDir = process.cwd();
  
  let filesToProcess: string[] = [];
  
  if (paths.length === 0) {
    // Scan current directory
    filesToProcess = findMarkdownFiles(rootDir);
  } else {
    // Process specified paths
    for (const p of paths) {
      const fullPath = resolve(rootDir, p);
      
      if (!existsSync(fullPath)) {
        console.error(`⚠️  Path not found: ${p}`);
        continue;
      }
      
      const stats = require('fs').statSync(fullPath);
      if (stats.isDirectory()) {
        filesToProcess.push(...findMarkdownFiles(fullPath));
      } else {
        filesToProcess.push(fullPath);
      }
    }
  }
  
  // Count tokens in each file
  const results = filesToProcess
    .map(file => countFile(file, rootDir))
    .filter((r): r is FileResult => r !== null)
    .filter(r => r.tokens >= (opts.minTokens ?? 0));
  
  // Sort results
  const sorted = sortResults(results, opts.sort ?? 'path');
  
  // Output results
  if (opts.format === 'json') {
    outputJson(sorted, rootDir);
  } else {
    outputTable(sorted, opts.showTotal ?? true);
  }
}
