/**
 * Suggest optimizations to reduce token count
 */

import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { loadConfig, getLimitForFile, findMarkdownFiles } from './utils.js';
import {
  estimateTokens,
  normalizePath,
  getErrorMessage,
  MAX_DECORATIVE_EMOJIS,
  LARGE_CODE_BLOCK_LINES,
  LARGE_TABLE_ROWS,
  TOKENS_PER_EMOJI,
  TOKENS_PER_CODE_LINE,
  TOKENS_PER_TABLE_ROW,
  type Suggestion,
  type FileAnalysis
} from './types.js';

interface SuggestOptions {
  readonly format?: 'json' | 'text';
  readonly minSavings?: number;
  readonly verbose?: boolean;
}

const DEFAULT_OPTIONS: SuggestOptions = {
  format: 'text',
  minSavings: 10,
  verbose: false
};

/**
 * Analyzes a markdown file for potential token optimizations.
 */
function analyzeFile(filePath: string, rootDir: string, config: ReturnType<typeof loadConfig>): FileAnalysis | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = normalizePath(relative(rootDir, filePath));
    const lines = content.split('\n');
    const tokens = estimateTokens(content);
    const { limit } = getLimitForFile(relativePath, config, rootDir);
    
    const suggestions: Suggestion[] = [];
    
    // Check for excessive decorative emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
    const emojis = content.match(emojiRegex) ?? [];
    
    if (emojis.length > MAX_DECORATIVE_EMOJIS) {
      const excess = emojis.length - MAX_DECORATIVE_EMOJIS;
      suggestions.push({
        line: 1,
        issue: `Found ${emojis.length} emojis (${excess} over recommended ${MAX_DECORATIVE_EMOJIS})`,
        suggestion: 'Remove decorative emojis that don\'t aid comprehension',
        estimatedSavings: excess * TOKENS_PER_EMOJI
      });
    }
    
    // Check for large code blocks
    let inCodeBlock = false;
    let codeBlockStart = 0;
    let codeBlockLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = i + 1;
          codeBlockLines = 0;
        } else {
          inCodeBlock = false;
          if (codeBlockLines > LARGE_CODE_BLOCK_LINES) {
            const excess = codeBlockLines - LARGE_CODE_BLOCK_LINES;
            suggestions.push({
              line: codeBlockStart,
              issue: `Code block with ${codeBlockLines} lines (${excess} over ${LARGE_CODE_BLOCK_LINES})`,
              suggestion: 'Consider truncating example or moving to reference file',
              estimatedSavings: excess * TOKENS_PER_CODE_LINE
            });
          }
        }
      } else if (inCodeBlock) {
        codeBlockLines++;
      }
    }
    
    // Check for large tables
    let tableStart = -1;
    let tableRows = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('|') && line.endsWith('|')) {
        if (tableStart === -1) {
          tableStart = i + 1;
        }
        tableRows++;
      } else if (tableStart !== -1) {
        if (tableRows > LARGE_TABLE_ROWS) {
          const excess = tableRows - LARGE_TABLE_ROWS;
          suggestions.push({
            line: tableStart,
            issue: `Table with ${tableRows} rows (${excess} over ${LARGE_TABLE_ROWS})`,
            suggestion: 'Consider summarizing or moving to reference file',
            estimatedSavings: excess * TOKENS_PER_TABLE_ROW
          });
        }
        tableStart = -1;
        tableRows = 0;
      }
    }
    
    // Check for duplicate content indicators
    const repeatPatterns = content.match(/(.{20,})\1+/g);
    if (repeatPatterns) {
      for (const pattern of repeatPatterns) {
        const savings = estimateTokens(pattern) / 2;
        suggestions.push({
          line: 1,
          issue: 'Potential duplicate content detected',
          suggestion: 'Remove redundant text or use references',
          estimatedSavings: Math.floor(savings)
        });
      }
    }
    
    // Check for excessive horizontal rules
    const hrMatches = content.match(/^-{3,}$|^\*{3,}$|^_{3,}$/gm);
    if (hrMatches && hrMatches.length > 3) {
      suggestions.push({
        line: 1,
        issue: `Found ${hrMatches.length} horizontal rules`,
        suggestion: 'Reduce visual separators, use headings instead',
        estimatedSavings: (hrMatches.length - 3) * 2
      });
    }
    
    // Check if file exceeds limit
    if (tokens > limit) {
      suggestions.push({
        line: 1,
        issue: `File exceeds token limit (${tokens}/${limit})`,
        suggestion: 'Split content into multiple files or use reference documents',
        estimatedSavings: 0
      });
    }
    
    return {
      file: relativePath,
      tokens,
      characters: content.length,
      lines: lines.length,
      suggestions,
      potentialSavings: suggestions.reduce((sum, s) => sum + s.estimatedSavings, 0)
    };
  } catch (error) {
    console.error(`⚠️  Error analyzing ${filePath}: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * Outputs results as formatted text.
 */
function outputText(analyses: FileAnalysis[], minSavings: number, verbose: boolean): void {
  const withSuggestions = analyses.filter(a => a.suggestions.length > 0);
  
  if (withSuggestions.length === 0) {
    console.log('✅ No optimization suggestions found.');
    return;
  }
  
  for (const analysis of withSuggestions) {
    const relevantSuggestions = analysis.suggestions.filter(
      s => s.estimatedSavings >= minSavings || s.estimatedSavings === 0
    );
    
    if (relevantSuggestions.length === 0) continue;
    
    console.log(`\n📄 ${analysis.file} (${analysis.tokens} tokens)`);
    console.log('-'.repeat(60));
    
    for (const suggestion of relevantSuggestions) {
      const savings = suggestion.estimatedSavings > 0 
        ? ` (~${suggestion.estimatedSavings} tokens)`
        : '';
      console.log(`  Line ${suggestion.line}: ${suggestion.issue}`);
      console.log(`    💡 ${suggestion.suggestion}${savings}`);
      if (verbose) {
        console.log('');
      }
    }
    
    if (analysis.potentialSavings > 0) {
      console.log(`\n  Total potential savings: ~${analysis.potentialSavings} tokens`);
    }
  }
  
  const totalSavings = withSuggestions.reduce((sum, a) => sum + a.potentialSavings, 0);
  console.log(`\n📊 Summary: ${withSuggestions.length} files with suggestions, ~${totalSavings} potential token savings`);
}

/**
 * Outputs results as JSON.
 */
function outputJson(analyses: FileAnalysis[]): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    analyses: analyses.filter(a => a.suggestions.length > 0),
    totalPotentialSavings: analyses.reduce((sum, a) => sum + a.potentialSavings, 0)
  }, null, 2));
}

/**
 * Main suggest command.
 */
export function suggest(paths: string[], options: SuggestOptions = {}): void {
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
  
  const analyses = filesToProcess
    .map(file => analyzeFile(file, rootDir, config))
    .filter((a): a is FileAnalysis => a !== null);
  
  if (opts.format === 'json') {
    outputJson(analyses);
  } else {
    outputText(analyses, opts.minSavings ?? 10, opts.verbose ?? false);
  }
}
