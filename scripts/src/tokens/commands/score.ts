/**
 * Score skill directories against SkillsBench-informed advisory criteria
 * and agentskills.io specification compliance checks.
 *
 * Spec reference: https://agentskills.io/specification
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { estimateTokens } from './types.js';

/** Max skill name length per agentskills.io spec */
const MAX_SKILL_NAME_LENGTH = 64;

/** Max description length per agentskills.io spec */
const MAX_DESCRIPTION_LENGTH = 1024;

/** Max compatibility field length per agentskills.io spec */
const MAX_COMPATIBILITY_LENGTH = 500;

/** Allowed frontmatter fields per agentskills.io spec */
const ALLOWED_FIELDS = new Set([
  'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'
]);

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

// ---------------------------------------------------------------------------
// Spec Compliance Checks (agentskills.io/specification)
// ---------------------------------------------------------------------------

/** Parsed frontmatter fields */
interface ParsedFrontmatter {
  readonly fields: Record<string, unknown>;
  readonly name?: string;
  readonly description?: string;
  readonly compatibility?: string;
}

/**
 * Parse YAML frontmatter from SKILL.md content.
 * Lightweight parser — extracts key-value pairs without a full YAML library.
 */
export function parseFrontmatter(content: string): ParsedFrontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fmContent = match[1];
  const fields: Record<string, unknown> = {};

  // Extract top-level keys (handles single-line and multi-line values)
  const lines = fmContent.split('\n');
  let currentKey: string | null = null;
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (keyMatch) {
      if (currentKey) {
        fields[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1];
      const rawVal = keyMatch[2].trim();
      currentValue = rawVal === '|' || rawVal === '>' ? '' : rawVal;
    } else if (currentKey && (line.startsWith('  ') || line.startsWith('\t'))) {
      currentValue += (currentValue ? '\n' : '') + line.trim();
    }
  }
  if (currentKey) {
    fields[currentKey] = currentValue.trim();
  }

  return {
    fields,
    name: typeof fields['name'] === 'string' ? fields['name'] : undefined,
    description: typeof fields['description'] === 'string' ? fields['description'] : undefined,
    compatibility: typeof fields['compatibility'] === 'string' ? fields['compatibility'] : undefined,
  };
}

/**
 * Spec Check: Validate frontmatter has valid YAML structure with required fields.
 */
export function checkFrontmatterStructure(content: string): AdvisoryCheck {
  if (!content.startsWith('---')) {
    return {
      name: 'spec-frontmatter',
      status: 'warning',
      message: 'SKILL.md must start with YAML frontmatter (---)',
      evidence: 'agentskills.io spec: Frontmatter (required)'
    };
  }

  const fm = parseFrontmatter(content);
  if (!fm) {
    return {
      name: 'spec-frontmatter',
      status: 'warning',
      message: 'SKILL.md frontmatter not properly closed with ---',
      evidence: 'agentskills.io spec: Frontmatter (required)'
    };
  }

  const missing: string[] = [];
  if (!fm.name) missing.push('name');
  if (!fm.description) missing.push('description');

  if (missing.length > 0) {
    return {
      name: 'spec-frontmatter',
      status: 'warning',
      message: `Missing required fields: ${missing.join(', ')}`,
      evidence: 'agentskills.io spec: name and description are required'
    };
  }

  return {
    name: 'spec-frontmatter',
    status: 'ok',
    message: 'Frontmatter structure valid with required fields'
  };
}

/**
 * Spec Check: Validate no unknown fields in frontmatter.
 */
export function checkAllowedFields(fields: Record<string, unknown>): AdvisoryCheck {
  const extra = Object.keys(fields).filter(k => !ALLOWED_FIELDS.has(k));

  if (extra.length > 0) {
    return {
      name: 'spec-allowed-fields',
      status: 'warning',
      message: `Unknown frontmatter fields: ${extra.join(', ')}. Allowed: ${[...ALLOWED_FIELDS].join(', ')}`,
      evidence: 'agentskills.io spec: Only name, description, license, allowed-tools, metadata, compatibility allowed'
    };
  }

  return {
    name: 'spec-allowed-fields',
    status: 'ok',
    message: 'All frontmatter fields are spec-compliant'
  };
}

/**
 * Spec Check: Validate skill name format.
 * - Max 64 characters
 * - Lowercase alphanumeric and hyphens only
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 */
export function checkNameCompliance(name: string): AdvisoryCheck {
  const errors: string[] = [];

  if (name.length > MAX_SKILL_NAME_LENGTH) {
    errors.push(`exceeds ${MAX_SKILL_NAME_LENGTH} char limit (${name.length})`);
  }
  if (name !== name.toLowerCase()) {
    errors.push('must be lowercase');
  }
  if (name.startsWith('-') || name.endsWith('-')) {
    errors.push('cannot start or end with hyphen');
  }
  if (name.includes('--')) {
    errors.push('cannot contain consecutive hyphens');
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push('only lowercase letters, digits, and hyphens allowed');
  }

  if (errors.length > 0) {
    return {
      name: 'spec-name',
      status: 'warning',
      message: `Name "${name}": ${errors.join('; ')}`,
      evidence: 'agentskills.io spec: name field constraints'
    };
  }

  return {
    name: 'spec-name',
    status: 'ok',
    message: `Name "${name}" is spec-compliant`
  };
}

/**
 * Spec Check: Validate directory name matches skill name.
 */
export function checkDirectoryNameMatch(skillDir: string, name: string): AdvisoryCheck {
  const dirName = basename(skillDir);
  if (dirName !== name) {
    return {
      name: 'spec-dir-match',
      status: 'warning',
      message: `Directory "${dirName}" does not match skill name "${name}"`,
      evidence: 'agentskills.io spec: directory name must match skill name'
    };
  }

  return {
    name: 'spec-dir-match',
    status: 'ok',
    message: `Directory name matches skill name "${name}"`
  };
}

/**
 * Spec Check: Validate description constraints.
 */
export function checkDescriptionCompliance(description: string): AdvisoryCheck {
  if (!description.trim()) {
    return {
      name: 'spec-description',
      status: 'warning',
      message: 'Description must be non-empty',
      evidence: 'agentskills.io spec: description is required and non-empty'
    };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      name: 'spec-description',
      status: 'warning',
      message: `Description exceeds ${MAX_DESCRIPTION_LENGTH} char limit (${description.length})`,
      evidence: 'agentskills.io spec: description max 1024 characters'
    };
  }

  return {
    name: 'spec-description',
    status: 'ok',
    message: `Description length OK (${description.length}/${MAX_DESCRIPTION_LENGTH})`
  };
}

/**
 * Spec Check: Validate compatibility field if present.
 */
export function checkCompatibilityCompliance(compatibility: string | undefined): AdvisoryCheck {
  if (compatibility === undefined) {
    return {
      name: 'spec-compatibility',
      status: 'ok',
      message: 'Compatibility field not present (optional)'
    };
  }

  if (compatibility.length > MAX_COMPATIBILITY_LENGTH) {
    return {
      name: 'spec-compatibility',
      status: 'warning',
      message: `Compatibility exceeds ${MAX_COMPATIBILITY_LENGTH} char limit (${compatibility.length})`,
      evidence: 'agentskills.io spec: compatibility max 500 characters'
    };
  }

  return {
    name: 'spec-compatibility',
    status: 'ok',
    message: `Compatibility field OK (${compatibility.length}/${MAX_COMPATIBILITY_LENGTH})`
  };
}

/**
 * Spec Recommendation: Suggest adding a license field.
 * Not required by spec, but strongly recommended for discoverability and trust.
 */
export function checkLicenseRecommendation(fields: Record<string, unknown>): AdvisoryCheck {
  if ('license' in fields && typeof fields['license'] === 'string' && fields['license'].trim()) {
    return {
      name: 'spec-license',
      status: 'optimal',
      message: `License specified: ${fields['license']}`,
    };
  }

  return {
    name: 'spec-license',
    status: 'warning',
    message: 'No license field — strongly recommended for discoverability and trust',
    evidence: 'agentskills.io spec: optional license field'
  };
}

/**
 * Spec Recommendation: Suggest adding version metadata.
 * Not required by spec, but strongly recommended for tracking and compatibility.
 */
export function checkVersionRecommendation(fields: Record<string, unknown>): AdvisoryCheck {
  const metadata = fields['metadata'];
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const metaRecord = metadata as Record<string, unknown>;
    if ('version' in metaRecord && typeof metaRecord['version'] === 'string' && metaRecord['version'].trim()) {
      return {
        name: 'spec-version',
        status: 'optimal',
        message: `Version specified: ${metaRecord['version']}`,
      };
    }
  }

  return {
    name: 'spec-version',
    status: 'warning',
    message: 'No metadata.version field — strongly recommended for tracking and compatibility',
    evidence: 'agentskills.io spec: optional metadata key-value pairs'
  };
}

// ---------------------------------------------------------------------------
// Advisory Checks (Sensei-original, SkillsBench-informed)
// ---------------------------------------------------------------------------

/** Full scoring result for a skill */
export interface ScoringResult {
  readonly skillPath: string;
  readonly checks: AdvisoryCheck[];
  readonly specChecks: AdvisoryCheck[];
  readonly complexity: 'compact' | 'detailed' | 'comprehensive';
  readonly moduleCount: number;
  readonly tokenCount: number;
}

/** Action verbs indicating procedural content */
const ACTION_VERBS = [
  'process', 'extract', 'deploy', 'configure', 'analyze',
  'create', 'build', 'run', 'execute', 'validate',
  'check', 'test', 'install', 'set up', 'implement',
  'manage', 'integrate', 'authenticate', 'troubleshoot',
  'orchestrate', 'scaffold', 'generate', 'publish'
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

/** Max recommended word count for cross-model description density */
const MAX_DESCRIPTION_WORDS = 60;

/**
 * Check 16: Cross-Model Description Density
 * Checks description for patterns that cause unreliable invocation on
 * Claude Sonnet and similar models that use fast pattern matching.
 *
 * Sub-checks:
 * - Word count (>60 words = warning)
 * - Anti-trigger contamination ("DO NOT USE FOR:" = warning)
 * - Lead sentence (should start with action verb)
 * - Trigger format (WHEN: preferred over USE FOR:)
 */
export function checkCrossModelDensity(description: string): AdvisoryCheck[] {
  const checks: AdvisoryCheck[] = [];

  if (!description || description.trim().length === 0) {
    checks.push({
      name: 'cross-model-density',
      status: 'warning',
      message: 'Empty description — cannot assess cross-model density'
    });
    return checks;
  }

  // Word count check
  const words = description.trim().split(/\s+/);
  const wordCount = words.length;
  if (wordCount > MAX_DESCRIPTION_WORDS) {
    checks.push({
      name: 'cross-model-word-count',
      status: 'warning',
      message: `Description is ${wordCount} words (max ${MAX_DESCRIPTION_WORDS}). Dense descriptions dilute attention on Claude Sonnet — trim to ≤${MAX_DESCRIPTION_WORDS} words`,
      evidence: 'Cross-model analysis: Sonnet selects by fast pattern matching on the first ~20 words'
    });
  } else {
    checks.push({
      name: 'cross-model-word-count',
      status: 'ok',
      message: `Description is ${wordCount} words (≤${MAX_DESCRIPTION_WORDS} ✓)`
    });
  }

  // Anti-trigger contamination check
  const antiTriggerPatterns = [
    /DO NOT USE FOR:/i,
    /NOT FOR:/i,
    /don'?t use this skill/i
  ];
  const hasAntiTrigger = antiTriggerPatterns.some(p => p.test(description));
  if (hasAntiTrigger) {
    checks.push({
      name: 'cross-model-anti-trigger',
      status: 'warning',
      message: 'Anti-trigger clauses ("DO NOT USE FOR:") cause keyword contamination on Claude Sonnet — they introduce the very keywords that trigger wrong-skill activation. Remove and use positive routing with WHEN: instead',
      evidence: 'Cross-model analysis: negation reasoning is weak on Sonnet; anti-triggers introduce competing keywords'
    });
  } else {
    checks.push({
      name: 'cross-model-anti-trigger',
      status: 'ok',
      message: 'No anti-trigger contamination detected'
    });
  }

  // Lead sentence action verb check
  const firstSentence = description.split(/[.!?\n]/)[0]?.trim() ?? '';
  const firstWord = firstSentence.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  const startsWithActionVerb = ACTION_VERBS.some(verb => {
    const verbFirst = verb.split(/\s+/)[0];
    return firstWord === verbFirst;
  });
  if (!startsWithActionVerb && firstSentence.length > 0) {
    // Skip check if starts with skill type prefix
    const startsWithPrefix = /^\*\*(?:WORKFLOW|UTILITY|ANALYSIS) SKILL\*\*/.test(firstSentence);
    if (!startsWithPrefix) {
      checks.push({
        name: 'cross-model-lead-verb',
        status: 'warning',
        message: `Lead sentence should start with unique action verb for fast pattern matching. Found: "${firstWord}"`,
        evidence: 'Cross-model analysis: front-load the signal in the first ~20 words'
      });
    } else {
      // Check the word after the prefix dash
      const afterPrefix = firstSentence.replace(/^\*\*(?:WORKFLOW|UTILITY|ANALYSIS) SKILL\*\*\s*[-—–]\s*/, '');
      const prefixFirstWord = afterPrefix.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
      const prefixHasActionVerb = ACTION_VERBS.some(verb => {
        const verbFirst = verb.split(/\s+/)[0];
        return prefixFirstWord === verbFirst;
      });
      if (!prefixHasActionVerb) {
        checks.push({
          name: 'cross-model-lead-verb',
          status: 'warning',
          message: `After skill type prefix, lead with action verb. Found: "${prefixFirstWord}"`,
          evidence: 'Cross-model analysis: front-load the signal in the first ~20 words'
        });
      } else {
        checks.push({
          name: 'cross-model-lead-verb',
          status: 'ok',
          message: 'Description leads with action verb after skill type prefix'
        });
      }
    }
  } else {
    checks.push({
      name: 'cross-model-lead-verb',
      status: 'ok',
      message: 'Description leads with action verb'
    });
  }

  // Trigger format preference check (WHEN: > USE FOR:)
  const hasWhen = /\bWHEN:/i.test(description);
  const hasUseFor = /\bUSE FOR:/i.test(description);
  if (hasWhen) {
    checks.push({
      name: 'cross-model-trigger-format',
      status: 'optimal',
      message: 'Uses WHEN: trigger format (preferred for cross-model compatibility)'
    });
  } else if (hasUseFor) {
    checks.push({
      name: 'cross-model-trigger-format',
      status: 'ok',
      message: 'Uses USE FOR: trigger format (accepted, but WHEN: with quoted phrases is preferred for cross-model reliability)'
    });
  } else {
    checks.push({
      name: 'cross-model-trigger-format',
      status: 'warning',
      message: 'No explicit trigger format (WHEN: or USE FOR:) found — add WHEN: with 3-5 distinctive quoted trigger phrases'
    });
  }

  return checks;
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
      specChecks: [],
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
      specChecks: [],
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
    const descMatch = fmContent.match(/description:\s*(?:[|>]-?)\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (descMatch) {
      description = descMatch[1].replace(/^\s+/gm, '').trim();
    } else {
      // Try inline description (quoted string)
      const inlineMatch = fmContent.match(/description:\s*["']?(.*?)["']?\s*$/m);
      if (inlineMatch) {
        description = inlineMatch[1].trim();
      }
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

  // Advisory checks (Sensei-original)
  const checks: AdvisoryCheck[] = [
    moduleCountCheck,
    complexityCheck,
    checkNegativeDeltaRisk(content),
    checkProceduralContent(description),
    checkOverSpecificity(content),
    ...checkCrossModelDensity(description)
  ];

  // Spec compliance checks (agentskills.io)
  const specChecks: AdvisoryCheck[] = [checkFrontmatterStructure(content)];
  const fm = parseFrontmatter(content);
  if (fm) {
    specChecks.push(checkAllowedFields(fm.fields));
    if (fm.name) {
      specChecks.push(checkNameCompliance(fm.name));
      specChecks.push(checkDirectoryNameMatch(skillDir, fm.name));
    }
    if (fm.description !== undefined) {
      specChecks.push(checkDescriptionCompliance(fm.description));
    }
    specChecks.push(checkCompatibilityCompliance(fm.compatibility));
    specChecks.push(checkLicenseRecommendation(fm.fields));
    specChecks.push(checkVersionRecommendation(fm.fields));
  }

  return {
    skillPath: skillDir,
    checks,
    specChecks,
    complexity,
    moduleCount,
    tokenCount
  };
}
