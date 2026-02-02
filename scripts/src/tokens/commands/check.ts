/**
 * Check markdown files against token limits
 */

import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { loadConfig, getLimitForFile, findMarkdownFiles } from './utils.js';
import {
  estimateTokens,
  normalizePath,
  getErrorMessage,
  type ValidationResult,
  type ValidationReport
} from './types.js';

interface CheckOptions {
  readonly format?: 'json' | 'table';
  readonly strict?: boolean;
  readonly quiet?: boolean;
}

const DEFAULT_OPTIONS: CheckOptions = {
  format: 'table',
  strict: false,
  quiet: false
};

/**
 * Checks a single file against its token limit.
 */
function checkFile(filePath: string, rootDir: string, config: ReturnType<typeof loadConfig>): ValidationResult | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = normalizePath(relative(rootDir, filePath));
    const tokens = estimateTokens(content);
    const { limit, pattern } = getLimitForFile(relativePath, config, rootDir);
    
    return {
      file: relativePath,
      tokens,
      limit,
      exceeded: tokens > limit,
      pattern
    };
  } catch (error) {
    console.error(`⚠️  Error reading ${filePath}: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * Outputs results as a formatted table.
 */
function outputTable(results: ValidationResult[], quiet: boolean): void {
  if (results.length === 0) {
    if (!quiet) {
      console.log('No markdown files found.');
    }
    return;
  }
  
  const exceeded = results.filter(r => r.exceeded);
  const passed = results.filter(r => !r.exceeded);
  
  if (!quiet) {
    const maxPathLen = Math.max(...results.map(r => r.file.length), 4);
    const header = `${'File'.padEnd(maxPathLen)}  ${'Tokens'.padStart(8)}  ${'Limit'.padStart(8)}  Status`;
    
    console.log(header);
    console.log('-'.repeat(header.length + 10));
    
    for (const result of results) {
      const status = result.exceeded ? '❌ EXCEEDED' : '✅ OK';
      console.log(
        `${result.file.padEnd(maxPathLen)}  ${result.tokens.toString().padStart(8)}  ${result.limit.toString().padStart(8)}  ${status}`
      );
    }
    
    console.log('-'.repeat(header.length + 10));
    console.log(`\n${passed.length}/${results.length} files within limits`);
  }
  
  if (exceeded.length > 0) {
    if (!quiet) {
      console.log(`\n⚠️  ${exceeded.length} file(s) exceed their token limits:`);
      for (const result of exceeded) {
        const over = result.tokens - result.limit;
        console.log(`   ${result.file}: ${result.tokens} tokens (${over} over limit of ${result.limit})`);
      }
    }
  }
}

/**
 * Outputs results as JSON.
 */
function outputJson(results: ValidationResult[]): void {
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    totalFiles: results.length,
    exceededCount: results.filter(r => r.exceeded).length,
    results
  };
  
  console.log(JSON.stringify(report, null, 2));
}

/**
 * Main check command.
 */
export function check(paths: string[], options: CheckOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rootDir = process.cwd();
  const config = loadConfig(rootDir);
  
  let filesToProcess: string[] = [];
  
  if (paths.length === 0) {
    filesToProcess = findMarkdownFiles(rootDir);
  } else {
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
  
  const results = filesToProcess
    .map(file => checkFile(file, rootDir, config))
    .filter((r): r is ValidationResult => r !== null);
  
  // Sort by exceeded first, then by path
  results.sort((a, b) => {
    if (a.exceeded !== b.exceeded) {
      return a.exceeded ? -1 : 1;
    }
    return a.file.localeCompare(b.file);
  });
  
  if (opts.format === 'json') {
    outputJson(results);
  } else {
    outputTable(results, opts.quiet ?? false);
  }
  
  // Exit with error code if any files exceeded limits and strict mode is enabled
  const exceeded = results.filter(r => r.exceeded);
  if (opts.strict && exceeded.length > 0) {
    process.exit(1);
  }
}
