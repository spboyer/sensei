#!/usr/bin/env node

/**
 * Sensei Token Management CLI
 * 
 * Usage:
 *   npm run tokens count [paths...]     Count tokens in markdown files
 *   npm run tokens check [paths...]     Check files against token limits
 *   npm run tokens suggest [paths...]   Get optimization suggestions
 *   npm run tokens compare [refs...]    Compare tokens between git refs
 */

import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { count, check, suggest, compare, scoreSkill } from './commands/index.js';
import { getErrorMessage } from './commands/types.js';
import { resolvePathFromRoot, resolveRootDir } from './commands/utils.js';

function printHelp(): void {
  console.log(`
Sensei Token Management CLI

Usage:
  npm run tokens <command> [options] [paths...]

Commands:
  count [paths...]     Count tokens in markdown files
  check [paths...]     Check files against token limits
  suggest [paths...]   Get optimization suggestions
  compare [refs...]    Compare tokens between git refs
  score [path]         Score a skill directory against SkillsBench criteria

Options:
  --format=<type>      Output format: json | table (default: table)
  --sort=<field>       Sort by: tokens | name | path (count only)
  --min-tokens=<n>     Filter files with less than n tokens (count only)
  --no-total           Hide total row (count only)
  --strict             Exit with error if limits exceeded (check only)
  --quiet              Suppress output except errors (check only)
  --root=<path>        Resolve paths and default config from this project root
  --config=<path>      Use a specific token limits JSON file
  --min-savings=<n>    Minimum savings to suggest (default: 10)
  --verbose            Show detailed suggestions
  --show-unchanged     Include unchanged files in comparison
  --help, -h           Show this help message

Examples:
  npm run tokens count                    Count all markdown files
  npm run tokens count SKILL.md           Count specific file
  npm run tokens count --format=json      Output as JSON
  npm run tokens check --strict           Fail if limits exceeded
  npm run tokens suggest                  Get optimization tips
  npm run tokens compare HEAD~3           Compare with 3 commits ago
  npm run tokens compare main feature     Compare two branches

Configuration:
  Create .token-limits.json in project root to customize limits:
  {
    "defaults": {
      "SKILL.md": 500,
      "references/**/*.md": 1000,
      "*.md": 2000
    },
    "overrides": {
      "README.md": 3000
    }
  }
`);
}

export function parseArgs(args: string[]): { command: string; paths: string[]; options: Record<string, unknown> } {
  const command = args[0] ?? 'help';
  const paths: string[] = [];
  const options: Record<string, unknown> = {};
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--no-total') {
      options.showTotal = false;
    } else if (arg === '--show-unchanged') {
      options.showUnchanged = true;
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice(9);
    } else if (arg.startsWith('--sort=')) {
      options.sort = arg.slice(7);
    } else if (arg.startsWith('--min-tokens=')) {
      options.minTokens = parseInt(arg.slice(13), 10);
    } else if (arg.startsWith('--min-savings=')) {
      options.minSavings = parseInt(arg.slice(14), 10);
    } else if (arg === '--root') {
      options.root = readOptionValue(args, ++i, '--root');
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice(7);
    } else if (arg === '--config') {
      options.config = readOptionValue(args, ++i, '--config');
    } else if (arg.startsWith('--config=')) {
      options.config = arg.slice(9);
    } else if (!arg.startsWith('-')) {
      paths.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }
  
  return { command, paths, options };
}

function readOptionValue(args: string[], index: number, optionName: string): string {
  const value = args[index];
  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${optionName}`);
  }
  return value;
}

export function main(args = process.argv.slice(2)): void {
  const { command, paths, options } = parseArgs(args);
  
  if (options.help || command === 'help') {
    printHelp();
    return;
  }
  
  switch (command) {
    case 'count':
      count(paths, options);
      break;
    
    case 'check':
      check(paths, options);
      break;
    
    case 'suggest':
      suggest(paths, options);
      break;
    
    case 'compare':
      compare(paths, options);
      break;
    
    case 'score': {
      const rootDir = resolveRootDir(typeof options.root === 'string' ? options.root : undefined);
      const skillDir = paths[0] ? resolvePathFromRoot(rootDir, paths[0]) : rootDir;
      if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
        console.error(`Error: Path does not exist or is not a directory: ${skillDir}`);
        process.exit(1);
      }
      const skillMdPath = join(skillDir, 'SKILL.md');
      if (!existsSync(skillMdPath) || !statSync(skillMdPath).isFile()) {
        console.error(`Error: No SKILL.md file found in: ${skillDir}`);
        process.exit(1);
      }
      const result = scoreSkill(skillDir);
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n📊 Skill Score: ${result.skillPath}`);
        console.log(`   Complexity: ${result.complexity} | Tokens: ${result.tokenCount} | Modules: ${result.moduleCount}\n`);

        if (result.specChecks.length > 0) {
          console.log('  ── Spec Compliance (agentskills.io) ──');
          for (const check of result.specChecks) {
            const icon = check.status === 'ok' ? '✅' : check.status === 'optimal' ? '🌟' : '⚠️';
            console.log(`  ${icon} ${check.name}: ${check.message}`);
            if (check.evidence) {
              console.log(`     📎 ${check.evidence}`);
            }
          }
          console.log('');
        }

        console.log('  ── Advisory Checks (Sensei) ──');
        for (const check of result.checks) {
          const icon = check.status === 'ok' ? '✅' : check.status === 'optimal' ? '🌟' : '⚠️';
          console.log(`  ${icon} ${check.name}: ${check.message}`);
          if (check.evidence) {
            console.log(`     📎 ${check.evidence}`);
          }
        }
        console.log('');
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "npm run tokens help" for usage information.');
      process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}
