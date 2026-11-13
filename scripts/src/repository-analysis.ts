import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync
} from 'node:fs';
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path';
import type { EvidenceFinding, ProfileSummary } from './evidence.js';
import { summarizeProfiles } from './evidence.js';

const MAX_RESOURCES = 512;
const MAX_SKILL_BYTES = 16 * 1024 * 1024;
const MAX_REFERENCE_DEPTH = 2;
const CONVENTIONAL_RESOURCE_DIRS = new Set(['references', 'assets']);
const EXCLUDED_RESOURCE_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.py', '.ps1', '.sh']);

export interface ResourceNode {
  readonly path: string;
  readonly size: number;
  readonly kind: 'skill' | 'reference' | 'script' | 'asset' | 'eval' | 'other';
  readonly linkedFrom: readonly string[];
}

export interface ResourceGraph {
  readonly root: string;
  readonly entrypoint: string;
  readonly resources: readonly ResourceNode[];
}

export interface RepositoryAnalysisOptions {
  readonly repositoryRoot?: string;
}

export interface RepositoryAnalysisReport {
  readonly skillPath: string;
  readonly graph: ResourceGraph;
  readonly findings: readonly EvidenceFinding[];
  readonly profiles: readonly ProfileSummary[];
}

interface MutableResource {
  path: string;
  size: number;
  kind: ResourceNode['kind'];
  linkedFrom: Set<string>;
}

function finding(
  id: string,
  profile: EvidenceFinding['profile'],
  basis: EvidenceFinding['basis'],
  state: EvidenceFinding['state'],
  message: string,
  options: Partial<Omit<EvidenceFinding, 'id' | 'profile' | 'basis' | 'state' | 'message'>> = {}
): EvidenceFinding {
  return {
    id,
    profile,
    basis,
    state,
    severity: state === 'fail' ? 'error' : state === 'warning' || state === 'unknown' ? 'warning' : 'info',
    evidenceLevel: 'statically-verified',
    message,
    ...options
  };
}

export function isContainedPath(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && rel !== '..' && !isAbsolute(rel));
}

function normalizeRelative(root: string, path: string): string {
  return relative(root, path).replace(/\\/g, '/');
}

function classifyResource(path: string, skillDir: string): ResourceNode['kind'] {
  const rel = normalizeRelative(skillDir, path);
  if (rel === 'SKILL.md') return 'skill';
  const first = rel.split('/')[0];
  if (first === 'references') return 'reference';
  if (first === 'scripts') return 'script';
  if (first === 'assets') return 'asset';
  if (first === 'evals') return 'eval';
  return 'other';
}

function listSkillResources(skillDir: string): string[] {
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (EXCLUDED_RESOURCE_DIRS.has(entry.name)) {
        continue;
      }
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        files.push(path);
      } else if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  };
  visit(skillDir);
  return files;
}

function markdownTargets(content: string): string[] {
  const lines = content.split(/\r?\n/);
  let fence: { character: string; length: number } | null = null;
  const prose = lines.map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      const character = marker[1][0];
      if (fence === null) {
        fence = { character, length: marker[1].length };
        return '';
      }
      if (character === fence.character && marker[1].length >= fence.length) {
        fence = null;
      }
      return '';
    }
    if (fence !== null || /^(?: {4}|\t)/.test(line)) return '';
    return line.replace(/(`+).*?\1/g, '');
  }).join('\n');

  const targets: string[] = [];
  const addTarget = (rawTarget: string): void => {
    let target = rawTarget;
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    if (/^(?:https?:|mailto:|data:|#)/i.test(target)) return;
    target = target.split('#', 1)[0].split('?', 1)[0];
    if (!target) return;
    try {
      targets.push(decodeURIComponent(target));
    } catch {
      targets.push(target);
    }
  };
  const pattern = /!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g;
  for (const match of prose.matchAll(pattern)) {
    addTarget(match[1]);
  }
  const definitions = new Map<string, string>();
  const definitionPattern = /^\s{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gmi;
  for (const match of prose.matchAll(definitionPattern)) {
    definitions.set(match[1].trim().toLowerCase(), match[2]);
  }
  const referencePattern = /!?\[([^\]]+)\]\[([^\]]*)\]/g;
  for (const match of prose.matchAll(referencePattern)) {
    const id = (match[2] || match[1]).trim().toLowerCase();
    const target = definitions.get(id);
    if (target) addTarget(target);
  }
  const fileReference = /#file:(?:"([^"]+)"|'([^']+)'|([^\s)\]}>,]+))/g;
  for (const match of prose.matchAll(fileReference)) {
    const target = match[1] ?? match[2] ?? match[3];
    if (!target) continue;
    addTarget(target);
  }
  return targets;
}

function hasAnyFile(root: string, names: readonly string[]): boolean {
  return names.some(name => existsSync(join(root, name)));
}

function inspectInstructionArchitecture(content: string, lineCount: number): EvidenceFinding[] {
  const findings: EvidenceFinding[] = [];
  const hasWorkflow = /^#{1,3}\s+(?:steps|workflow|process|procedure)\b/im.test(content);
  const hasCompletion = /\b(done when|completion criteria|acceptance criteria|success criteria|stop conditions?|outputs?)\b/i.test(content);
  findings.push(finding(
    'instruction-completion-criteria',
    'information-architecture',
    'empirical',
    !hasWorkflow || hasCompletion ? 'pass' : 'warning',
    !hasWorkflow || hasCompletion
      ? 'Workflow completion or output criteria are present, or the skill is not structured as a workflow'
      : 'Workflow instructions do not identify observable completion, output, or stop criteria',
    {
      remediation: 'Add an observable output, done-when, or stop condition appropriate to the workflow.',
      limitations: ['This is a lexical advisory; behavioral evaluation is required before treating it as a gate.']
    }
  ));
  findings.push(finding(
    'instruction-sprawl',
    'information-architecture',
    'spec',
    lineCount <= 500 ? 'pass' : 'warning',
    lineCount <= 500
      ? `SKILL.md has ${lineCount} lines`
      : `SKILL.md has ${lineCount} lines; review branch-specific material for progressive disclosure`,
    {
      evidence: 'Agent Skills recommends keeping SKILL.md under 500 lines.',
      limitations: ['Length alone does not establish that content is irrelevant or harmful.']
    }
  ));
  return findings;
}

function inspectScripts(skillDir: string, repositoryRoot: string, paths: readonly string[]): EvidenceFinding[] {
  const scripts = paths.filter(path => SCRIPT_EXTENSIONS.has(extname(path).toLowerCase()));
  if (scripts.length === 0) {
    return [finding(
      'script-readiness',
      'safety-supply-chain',
      'security-standard',
      'not-applicable',
      'No executable script resources found'
    )];
  }

  const testCandidates = paths.filter(path => {
    if (!SCRIPT_EXTENSIONS.has(extname(path).toLowerCase())) return false;
    const rel = normalizeRelative(repositoryRoot, path);
    const name = rel.split('/').at(-1) ?? '';
    return /\.(?:test|spec)\.[^.]+$/i.test(name)
      || /^test_.+\.[^.]+$/i.test(name)
      || rel.split('/').some(segment => segment === 'tests' || segment === '__tests__');
  });
  const hasTests = scripts.some(script => {
    const scriptName = (script.split(/[\\/]/).at(-1) ?? '').replace(/\.[^.]+$/, '');
    return testCandidates.some(test => {
      if (test === script) return false;
      const testName = (test.split(/[\\/]/).at(-1) ?? '').replace(/\.[^.]+$/, '');
      return dirname(test) === dirname(script)
        ? testName.includes(scriptName)
        : testName.includes(scriptName) || scriptName.includes(testName.replace(/^test_/, ''));
    });
  });
  let hasHelp = false;
  let mentionsDryRun = false;
  let destructive = false;
  let networkOrSecrets = false;
  for (const path of scripts) {
    const content = readFileSync(path, 'utf8');
    hasHelp ||= /--help\b|argparse|commander|click\.command|param\(\s*\[?Parameter/i.test(content);
    mentionsDryRun ||= /--dry-run\b|\bdry run\b|\bidempoten/i.test(content);
    destructive ||= /\brm\s+-rf\b|Remove-Item\b[^\n]*-Recurse|\bgit\s+reset\s+--hard\b|\bDROP\s+(?:TABLE|DATABASE)\b/i.test(content);
    networkOrSecrets ||= /\b(?:fetch|curl|Invoke-WebRequest|requests\.(?:get|post)|https?:\/\/|TOKEN|PASSWORD|SECRET|credential)\b/i.test(content);
  }
  const lockNames = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'uv.lock', 'poetry.lock']);
  const hasLock = paths.some(path => lockNames.has(path.split(/[\\/]/).at(-1) ?? ''))
    || hasAnyFile(skillDir, [...lockNames])
    || hasAnyFile(repositoryRoot, ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'uv.lock', 'poetry.lock']);

  return [
    finding(
      'script-tests',
      'safety-supply-chain',
      'security-standard',
      hasTests ? 'pass' : 'warning',
      hasTests ? 'Executable resources have colocated test evidence' : 'Executable resources have no discovered tests',
      { remediation: 'Add deterministic tests for script behavior and failure paths.' }
    ),
    finding(
      'script-help',
      'information-architecture',
      'empirical',
      hasHelp ? 'pass' : 'warning',
      hasHelp ? 'Executable resources expose help or argument documentation' : 'Executable resources do not expose a discovered help path',
      { limitations: ['Library-only scripts may not need a command-line help path.'] }
    ),
    finding(
      'script-repeatability',
      'safety-supply-chain',
      'security-standard',
      mentionsDryRun ? 'pass' : 'unknown',
      mentionsDryRun
        ? 'Executable resources declare dry-run or idempotency behavior'
        : 'Dry-run and idempotency behavior could not be established statically',
      { remediation: 'Document repeatability and add dry-run support for scripts with side effects.' }
    ),
    finding(
      'script-destructive-defaults',
      'safety-supply-chain',
      'security-standard',
      destructive ? 'warning' : 'pass',
      destructive
        ? 'Potentially destructive commands require manual review and an explicit approval boundary'
        : 'No common destructive command pattern was detected',
      { limitations: ['Static pattern matching cannot prove whether a destructive operation is safely gated.'] }
    ),
    finding(
      'script-capability-surface',
      'safety-supply-chain',
      'security-standard',
      networkOrSecrets ? 'warning' : 'pass',
      networkOrSecrets
        ? 'Scripts reference network or credential-related capabilities; review least privilege and data flow'
        : 'No common network or credential capability pattern was detected',
      { limitations: ['Static pattern matching cannot enumerate runtime capabilities or transitive dependencies.'] }
    ),
    finding(
      'script-dependency-lock',
      'safety-supply-chain',
      'security-standard',
      hasLock ? 'pass' : 'warning',
      hasLock ? 'A dependency lock file is present' : 'No dependency lock file was discovered for executable resources',
      { remediation: 'Pin executable dependencies with the ecosystem lock format.' }
    )
  ];
}

function inspectLifecycle(skillDir: string, repositoryRoot: string): EvidenceFinding[] {
  const hasOwner = existsSync(join(repositoryRoot, '.github', 'CODEOWNERS'));
  const hasChangelog = hasAnyFile(repositoryRoot, ['CHANGELOG.md', 'CHANGELOG']);
  const evalDir = join(skillDir, 'evals');
  const hasEvals = existsSync(evalDir)
    && statSync(evalDir).isDirectory()
    && readdirSync(evalDir, { recursive: true, withFileTypes: true })
      .some(entry => entry.isFile() && /(?:^eval\.(?:ya?ml|json)$|\.(?:test|spec)\.)/i.test(entry.name));
  return [
    finding(
      'lifecycle-owner',
      'lifecycle-health',
      'repository-policy',
      hasOwner ? 'pass' : 'unknown',
      hasOwner ? 'Repository ownership is declared with CODEOWNERS' : 'A repository owner could not be established from CODEOWNERS'
    ),
    finding(
      'lifecycle-changelog',
      'lifecycle-health',
      'repository-policy',
      hasChangelog ? 'pass' : 'warning',
      hasChangelog ? 'Repository contains a changelog' : 'Repository does not contain a discovered changelog',
      { limitations: ['Release notes may be maintained outside the repository.'] }
    ),
    finding(
      'lifecycle-regression-evals',
      'lifecycle-health',
      'empirical',
      hasEvals ? 'pass' : 'unknown',
      hasEvals ? 'Skill contains an eval directory' : 'Skill-specific regression eval coverage was not discovered'
    )
  ];
}

export function analyzeSkillRepository(
  skillDirInput: string,
  options: RepositoryAnalysisOptions = {}
): RepositoryAnalysisReport {
  const skillDir = realpathSync(resolve(skillDirInput));
  const repositoryRoot = realpathSync(resolve(options.repositoryRoot ?? skillDir));
  if (!isContainedPath(repositoryRoot, skillDir)) {
    throw new Error(`Skill directory escapes repository root: ${skillDir}`);
  }

  const entrypoint = join(skillDir, 'SKILL.md');
  if (!existsSync(entrypoint) || !statSync(entrypoint).isFile()) {
    throw new Error(`No SKILL.md file found in: ${skillDir}`);
  }
  const entrypointReal = realpathSync(entrypoint);
  if (!isContainedPath(repositoryRoot, entrypointReal)) {
    throw new Error(`SKILL.md resolves outside repository root: ${entrypoint}`);
  }

  const findings: EvidenceFinding[] = [];
  const resources = new Map<string, MutableResource>();
  const inventory = listSkillResources(skillDir);

  for (const path of inventory) {
    const stat = lstatSync(path);
    const rel = normalizeRelative(repositoryRoot, path);
    if (stat.isSymbolicLink()) {
      let target: string;
      try {
        target = realpathSync(path);
      } catch (error) {
        findings.push(finding(
          `resource-symlink-${rel}`,
          'safety-supply-chain',
          'security-standard',
          'fail',
          `Symbolic link target cannot be resolved: ${rel}`,
          {
            sourcePaths: [rel],
            limitations: [error instanceof Error ? error.message : String(error)]
          }
        ));
        continue;
      }
      findings.push(finding(
        `resource-symlink-${rel}`,
        'safety-supply-chain',
        'security-standard',
        isContainedPath(repositoryRoot, target) ? 'warning' : 'fail',
        isContainedPath(repositoryRoot, target)
          ? `Symbolic link requires manifest review: ${rel}`
          : `Symbolic link escapes the repository root: ${rel}`,
        { sourcePaths: [rel] }
      ));
      continue;
    }
    resources.set(path, {
      path: rel,
      size: stat.size,
      kind: classifyResource(path, skillDir),
      linkedFrom: new Set<string>()
    });
  }

  const queue: Array<{ path: string; depth: number }> = [{ path: entrypointReal, depth: 0 }];
  const visited = new Set<string>();
  const depthWarnings = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.path)) continue;
    visited.add(current.path);
    if (extname(current.path).toLowerCase() !== '.md') continue;

    const content = readFileSync(current.path, 'utf8');
    for (const target of markdownTargets(content)) {
      const candidate = resolve(dirname(current.path), target);
      const sourceRel = normalizeRelative(repositoryRoot, current.path);
      if (!isContainedPath(repositoryRoot, candidate)) {
        findings.push(finding(
          `resource-escape-${sourceRel}-${target}`,
          'safety-supply-chain',
          'security-standard',
          'fail',
          `Resource link escapes the repository root: ${target}`,
          { sourcePaths: [sourceRel] }
        ));
        continue;
      }
      if (!existsSync(candidate)) {
        findings.push(finding(
          `resource-missing-${sourceRel}-${target}`,
          'information-architecture',
          'spec',
          'fail',
          `Referenced resource does not exist: ${target}`,
          { sourcePaths: [sourceRel], remediation: 'Correct the relative link or add the referenced resource.' }
        ));
        continue;
      }

      const targetReal = realpathSync(candidate);
      if (!isContainedPath(repositoryRoot, targetReal)) {
        findings.push(finding(
          `resource-realpath-escape-${sourceRel}-${target}`,
          'safety-supply-chain',
          'security-standard',
          'fail',
          `Referenced resource resolves outside the repository root: ${target}`,
          { sourcePaths: [sourceRel] }
        ));
        continue;
      }

      const targetStat = statSync(targetReal);
      if (!targetStat.isFile()) continue;
      const targetRel = normalizeRelative(repositoryRoot, targetReal);
      let node = resources.get(targetReal);
      if (!node) {
        node = {
          path: targetRel,
          size: targetStat.size,
          kind: classifyResource(targetReal, skillDir),
          linkedFrom: new Set<string>()
        };
        resources.set(targetReal, node);
      }
      node.linkedFrom.add(sourceRel);
      const nextDepth = current.depth + 1;
      if (extname(targetReal).toLowerCase() === '.md') {
        if (nextDepth > MAX_REFERENCE_DEPTH) {
          if (!depthWarnings.has(targetRel)) {
            depthWarnings.add(targetRel);
            findings.push(finding(
              `resource-depth-${targetRel}`,
              'information-architecture',
              'spec',
              'warning',
              `Reference chain exceeds ${MAX_REFERENCE_DEPTH} levels: ${targetRel}`,
              { sourcePaths: [sourceRel, targetRel] }
            ));
          }
        }
        const linkedSiblingSkill = !isContainedPath(skillDir, targetReal)
          && targetReal.toLowerCase().endsWith(`${process.platform === 'win32' ? '\\' : '/'}skill.md`);
        if (!linkedSiblingSkill) queue.push({ path: targetReal, depth: nextDepth });
      }
    }
  }

  const entrypointContent = readFileSync(entrypointReal, 'utf8');
  findings.push(...inspectInstructionArchitecture(
    entrypointContent,
    entrypointContent.split(/\r?\n/).length
  ));
  const orphaned = inventory.filter(path => {
    const relToSkill = normalizeRelative(skillDir, path);
    const first = relToSkill.split('/')[0];
    return CONVENTIONAL_RESOURCE_DIRS.has(first)
      && !visited.has(path)
      && (resources.get(path)?.linkedFrom.size ?? 0) === 0;
  });
  findings.push(finding(
    'resource-orphans',
    'information-architecture',
    'spec',
    orphaned.length === 0 ? 'pass' : 'warning',
    orphaned.length === 0
      ? 'No orphaned conventional resources were discovered'
      : `${orphaned.length} conventional resource(s) are unreachable from SKILL.md`,
    {
      sourcePaths: orphaned.map(path => normalizeRelative(repositoryRoot, path)),
      limitations: ['Generated files and host-discovered evals may intentionally be unlinked.']
    }
  ));

  const totalBytes = [...resources.values()].reduce((total, resource) => total + resource.size, 0);
  const resourceLimitExceeded = resources.size > MAX_RESOURCES || totalBytes > MAX_SKILL_BYTES;
  findings.push(finding(
    'resource-limits',
    'safety-supply-chain',
    'host',
    resourceLimitExceeded ? 'fail' : 'pass',
    resourceLimitExceeded
      ? `Resource manifest exceeds MCP interoperability limits (${resources.size}/${MAX_RESOURCES} files; ${totalBytes}/${MAX_SKILL_BYTES} bytes)`
      : `Resource manifest is within MCP interoperability limits (${resources.size}/${MAX_RESOURCES} files; ${totalBytes}/${MAX_SKILL_BYTES} bytes)`,
    {
      evidence: 'MCP Skills extension interoperability baseline: 512 resources and 16 MiB total per skill.'
    }
  ));
  const resolvedPaths = [...resources.keys()];
  if (totalBytes <= MAX_SKILL_BYTES) {
    findings.push(...inspectScripts(skillDir, repositoryRoot, resolvedPaths));
  } else if (resolvedPaths.some(path => SCRIPT_EXTENSIONS.has(extname(path).toLowerCase()))) {
    findings.push(finding(
      'script-readiness',
      'safety-supply-chain',
      'security-standard',
      'unknown',
      'Script inspection was skipped because the resource manifest exceeds the safe analysis size limit',
      { limitations: ['Reduce or exclude resources before executing content analysis.'] }
    ));
  }
  findings.push(...inspectLifecycle(skillDir, repositoryRoot));

  const graph: ResourceGraph = {
    root: repositoryRoot,
    entrypoint: normalizeRelative(repositoryRoot, entrypoint),
    resources: [...resources.values()]
      .map(resource => ({
        path: resource.path,
        size: resource.size,
        kind: resource.kind,
        linkedFrom: [...resource.linkedFrom].sort()
      }))
      .sort((a, b) => a.path.localeCompare(b.path))
  };

  return {
    skillPath: skillDir,
    graph,
    findings,
    profiles: summarizeProfiles(findings)
  };
}
