#!/usr/bin/env node

/**
 * Sensei Token Management CLI
 *
 * Usage:
 *   sensei count [paths...]     Count tokens in markdown files
 *   sensei check [paths...]     Check files against token limits
 *   sensei suggest [paths...]   Get optimization suggestions
 *   sensei compare [refs...]    Compare tokens between git refs
 */

import { existsSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { count, check, suggest, compare, scoreSkill, step, report } from './commands/index.js';
import { getErrorMessage } from './commands/types.js';
import { resolvePathFromRoot, resolveRootDir } from './commands/utils.js';

function printHelp(): void {
  console.log(`
Sensei Token Management CLI

Usage:
  sensei <command> [options] [paths...]
  npx @spboyer/sensei <command> [options] [paths...]

Commands:
  count [paths...]     Count tokens in markdown files
  check [paths...]     Check files against token limits
  suggest [paths...]   Get optimization suggestions
  compare [refs...]    Compare tokens between git refs
  score [path]         Score a skill directory against SkillsBench criteria
  step --run-id <id> --append <json|->
                       Append a Ralph-loop step to the active run's
                       steps.ndjson; updates runs/latest.txt. Feeds the
                       sensei canvas.
  report --finalize --run-id <id> --input <path|->
                       Write the final report.md for a run from a JSON
                       summary; updates manifest.json + latest.txt.

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
  sensei count                    Count all markdown files
  sensei count SKILL.md           Count specific file
  sensei count --format=json      Output as JSON
  sensei check --strict           Fail if limits exceeded
  sensei suggest                  Get optimization tips
  sensei compare HEAD~3           Compare with 3 commits ago
  sensei compare main feature     Compare two branches

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
  const command = args[0] === '--help' || args[0] === '-h' ? 'help' : args[0] ?? 'help';
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
    } else if (arg === '--run-id') {
      options.runId = readOptionValue(args, ++i, '--run-id');
    } else if (arg.startsWith('--run-id=')) {
      options.runId = arg.slice(9);
    } else if (arg === '--append') {
      options.append = readOptionValue(args, ++i, '--append', true);
    } else if (arg.startsWith('--append=')) {
      options.append = arg.slice(9);
    } else if (arg === '--input') {
      options.input = readOptionValue(args, ++i, '--input', true);
    } else if (arg.startsWith('--input=')) {
      options.input = arg.slice(8);
    } else if (arg === '--finalize') {
      options.finalize = true;
    } else if (arg === '--artifacts-dir') {
      options.artifactsDir = readOptionValue(args, ++i, '--artifacts-dir');
    } else if (arg.startsWith('--artifacts-dir=')) {
      options.artifactsDir = arg.slice(16);
    } else if (!arg.startsWith('-')) {
      paths.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return { command, paths, options };
}

function readOptionValue(args: string[], index: number, optionName: string, allowStdin = false): string {
  const value = args[index];
  if (value === undefined) {
    throw new Error(`Missing value for ${optionName}`);
  }
  // Allow the literal `-` only for stdin-backed options (--append, --input).
  if (value === '-' && allowStdin) return value;
  if (value.startsWith('-')) {
    throw new Error(`Missing value for ${optionName}`);
  }
  return value;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
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

    case 'step': {
      await step({
        runId: typeof options.runId === 'string' ? options.runId : undefined,
        append: typeof options.append === 'string' ? options.append : undefined,
        artifactsDir:
          typeof options.artifactsDir === 'string' ? options.artifactsDir : undefined,
      });
      break;
    }

    case 'report': {
      if (!options.finalize) {
        console.error('Error: `sensei report` requires --finalize in v1.');
        process.exit(1);
      }
      await report({
        runId: typeof options.runId === 'string' ? options.runId : undefined,
        input: typeof options.input === 'string' ? options.input : undefined,
        artifactsDir:
          typeof options.artifactsDir === 'string' ? options.artifactsDir : undefined,
      });
      break;
    }

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
      console.error('Run "sensei help" for usage information.');
      process.exit(1);
  }
}

function isEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  return realpathSync.native(fileURLToPath(import.meta.url)) === realpathSync.native(resolve(process.argv[1]));
}

if (isEntrypoint()) {
  main().catch((error) => {
    console.error(`Error: ${getErrorMessage(error)}`);
    process.exit(1);
  });
}
