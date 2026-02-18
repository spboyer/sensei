/**
 * Score skill directories against SkillsBench-informed advisory criteria
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { estimateTokens } from './types.js';

/** Recursively list all files in a directory (Node 18 compatible) */
function listFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(fullPath));
      } else {
        results.push(entry.name);
      }
    }
  } catch {
    // If directory is unreadable, return empty
  }
  return results;
}

/** Result of a single advisory check */
export interface AdvisoryCheck {
  readonly name: string;
  readonly status: 'ok' | 'warning' | 'optimal';
  readonly message: string;
  readonly evidence?: string;
}

/** Full scoring result for a skill */
export interface ScoringResult {
  readonly skillPath: string;
  readonly checks: AdvisoryCheck[];
  readonly complexity: 'compact' | 'detailed' | 'comprehensive';
  readonly moduleCount: number;
  readonly tokenCount: number;
}

/** Action verbs indicating procedural content */
const ACTION_VERBS = [
  'process', 'extract', 'deploy', 'configure', 'analyze',
  'create', 'build', 'run', 'execute', 'validate',
  'check', 'test', 'install', 'set up', 'implement'
] as const;

/** Keywords indicating procedural structure */
const PROCEDURE_KEYWORDS = [
  'step', 'first', 'then', 'next', 'finally',
  'workflow', 'pipeline', 'procedure', 'when',
  'if.*then', 'after', 'before'
] as const;

/**
 * Check 11: Module Count
 * Counts .md files in the skill's references/ directory.
 * 0-1: ok, 2-3: optimal, 4+: warning
 */
export function checkModuleCount(skillDir: string): AdvisoryCheck {
  const refsDir = join(skillDir, 'references');
  let mdCount = 0;

  if (existsSync(refsDir)) {
    const files = listFilesRecursive(refsDir);
    mdCount = files.filter(f => f.endsWith('.md')).length;
  }

  if (mdCount >= 4) {
    return {
      name: 'module-count',
      status: 'warning',
      message: `Found ${mdCount} reference modules (4+ shows diminishing returns; consider consolidating)`,
      evidence: 'SkillsBench Finding 5 — 4+ modules: +5.9pp vs 2-3 modules: +18.6pp'
    };
  }

  if (mdCount >= 2) {
    return {
      name: 'module-count',
      status: 'optimal',
      message: `Found ${mdCount} reference modules (2-3 is optimal)`,
      evidence: 'SkillsBench Finding 5 — 2-3 modules: +18.6pp improvement'
    };
  }

  return {
    name: 'module-count',
    status: 'ok',
    message: `Found ${mdCount} reference module(s) (compact skill)`
  };
}

/**
 * Check 12: Complexity Classification
 * Based on SKILL.md token count + module count.
 * Compact (<200 tokens, 0-1 refs): ok
 * Detailed (200-500 tokens, 1-3 refs): optimal
 * Comprehensive (>500 tokens OR 4+ refs): warning
 */
export function classifyComplexity(tokenCount: number, moduleCount: number): AdvisoryCheck {
  if (tokenCount > 500 || moduleCount >= 4) {
    return {
      name: 'complexity',
      status: 'warning',
      message: `Comprehensive complexity (${tokenCount} tokens, ${moduleCount} modules) — excessive documentation may hurt performance`,
      evidence: 'SkillsBench Finding 6 — Comprehensive: -2.9pp'
    };
  }

  if (tokenCount >= 200 && moduleCount >= 1 && moduleCount <= 3) {
    return {
      name: 'complexity',
      status: 'optimal',
      message: `Detailed complexity (${tokenCount} tokens, ${moduleCount} modules) — optimal range`,
      evidence: 'SkillsBench Finding 6 — Detailed: +18.8pp'
    };
  }

  return {
    name: 'complexity',
    status: 'ok',
    message: `Compact complexity (${tokenCount} tokens, ${moduleCount} modules)`,
    evidence: 'SkillsBench Finding 6 — Compact: +17.1pp'
  };
}

/**
 * Check 13: Negative Delta Risk
 * Scans skill content for patterns that empirically hurt agent performance.
 */
export function checkNegativeDeltaRisk(content: string): AdvisoryCheck {
  const risks: string[] = [];

  // Multiple conflicting procedure paths
  const conflictPatterns = [
    /but alternatively/gi,
    /however you can also/gi,
    /another approach is/gi,
    /alternatively,?\s+you/gi
  ];
  for (const pattern of conflictPatterns) {
    if (pattern.test(content)) {
      risks.push('conflicting procedure paths');
      break;
    }
  }

  // Multiple "Step 1:" blocks indicating duplicate procedures
  const stepOneMatches = content.match(/step\s*1[:.]/gi);
  if (stepOneMatches && stepOneMatches.length > 1) {
    risks.push(`${stepOneMatches.length} separate "Step 1:" blocks`);
  }

  // Excessive constraints
  const mustNotPatterns = content.match(/\b(must not|never|always|forbidden|prohibited)\b/gi);
  if (mustNotPatterns && mustNotPatterns.length > 5) {
    risks.push(`${mustNotPatterns.length} constraint keywords (may reduce agent flexibility)`);
  }

  if (risks.length > 0) {
    return {
      name: 'negative-delta-risk',
      status: 'warning',
      message: `Negative delta risk detected: ${risks.join('; ')}`,
      evidence: 'SkillsBench — 16/84 tasks showed negative deltas from conflicting guidance'
    };
  }

  return {
    name: 'negative-delta-risk',
    status: 'ok',
    message: 'No negative delta risk patterns detected'
  };
}

/**
 * Check 14: Procedural Content Quality
 * Checks if description contains procedural/how-to content vs purely declarative.
 */
export function checkProceduralContent(description: string): AdvisoryCheck {
  if (!description || description.trim().length === 0) {
    return {
      name: 'procedural-content',
      status: 'warning',
      message: 'Empty description — skills must contain procedural guidance',
      evidence: 'SkillsBench — procedural skills outperform declarative ones'
    };
  }

  const lowerDesc = description.toLowerCase();

  const hasActionVerb = ACTION_VERBS.some(verb => {
    const regex = new RegExp(`\\b${verb.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lowerDesc);
  });

  const hasProcedureKeyword = PROCEDURE_KEYWORDS.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lowerDesc);
  });

  if (!hasActionVerb && !hasProcedureKeyword) {
    return {
      name: 'procedural-content',
      status: 'warning',
      message: 'Description appears declarative-only — no action verbs or procedure keywords found',
      evidence: 'SkillsBench — procedural skills outperform declarative ones'
    };
  }

  return {
    name: 'procedural-content',
    status: 'ok',
    message: 'Description contains procedural content'
  };
}

/**
 * Check 15: Over-Specificity
 * Detects hardcoded paths, specific hostnames, magic numbers, etc.
 */
export function checkOverSpecificity(content: string): AdvisoryCheck {
  const issues: string[] = [];

  // Absolute paths (Unix)
  if (/\/usr\/|\/etc\/|\/home\/|\/var\/|\/opt\//g.test(content)) {
    issues.push('absolute Unix paths');
  }

  // Absolute paths (Windows)
  if (/[A-Z]:\\/g.test(content)) {
    issues.push('absolute Windows paths');
  }

  // IP addresses
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(content)) {
    issues.push('IP addresses');
  }

  // Hardcoded URLs with paths (not just domain references)
  if (/https?:\/\/[^\s"']+\/[^\s"')]+/g.test(content)) {
    // Exclude common documentation/reference URLs
    const urls = content.match(/https?:\/\/[^\s"']+\/[^\s"')]+/g) ?? [];
    const nonDocUrls = urls.filter(url =>
      !url.includes('github.com') &&
      !url.includes('arxiv.org') &&
      !url.includes('docs.') &&
      !url.includes('learn.microsoft.com')
    );
    if (nonDocUrls.length > 0) {
      issues.push('hardcoded URLs with paths');
    }
  }

  // Specific port patterns (e.g., :3000, :8080)
  if (/:\d{4,5}\b/.test(content)) {
    issues.push('specific port numbers');
  }

  if (issues.length > 0) {
    return {
      name: 'over-specificity',
      status: 'warning',
      message: `Over-specific content detected: ${issues.join(', ')}`,
      evidence: 'SkillsBench — instance-specific content prevents generalization'
    };
  }

  return {
    name: 'over-specificity',
    status: 'ok',
    message: 'No over-specificity patterns detected'
  };
}

/**
 * Run all advisory checks on a skill directory.
 */
export function scoreSkill(skillDir: string): ScoringResult {
  // Guard: validate skillDir exists and is a directory
  if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
    return {
      skillPath: skillDir,
      checks: [{
        name: 'path-validation',
        status: 'warning',
        message: `Path does not exist or is not a directory: ${skillDir}`
      }],
      complexity: 'compact',
      moduleCount: 0,
      tokenCount: 0
    };
  }

  const skillMdPath = join(skillDir, 'SKILL.md');

  // Guard: validate SKILL.md exists and is a file
  if (!existsSync(skillMdPath) || !statSync(skillMdPath).isFile()) {
    return {
      skillPath: skillDir,
      checks: [{
        name: 'path-validation',
        status: 'warning',
        message: `No SKILL.md found in: ${skillDir}`
      }],
      complexity: 'compact',
      moduleCount: 0,
      tokenCount: 0
    };
  }

  let content = '';
  let description = '';

  content = readFileSync(skillMdPath, 'utf-8');

  // Extract description from frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const fmContent = frontmatterMatch[1];
    const descMatch = fmContent.match(/description:\s*\|?\s*\n?([\s\S]*?)(?=\n\w+:|$)/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
  }

  const tokenCount = estimateTokens(content);
  const moduleCountCheck = checkModuleCount(skillDir);
  const moduleCount = parseInt(moduleCountCheck.message.match(/(\d+)/)?.[1] ?? '0', 10);

  const complexityCheck = classifyComplexity(tokenCount, moduleCount);
  const complexity = complexityCheck.status === 'warning'
    ? 'comprehensive'
    : complexityCheck.status === 'optimal'
      ? 'detailed'
      : 'compact';

  const checks: AdvisoryCheck[] = [
    moduleCountCheck,
    complexityCheck,
    checkNegativeDeltaRisk(content),
    checkProceduralContent(description),
    checkOverSpecificity(content)
  ];

  return {
    skillPath: skillDir,
    checks,
    complexity,
    moduleCount,
    tokenCount
  };
}
