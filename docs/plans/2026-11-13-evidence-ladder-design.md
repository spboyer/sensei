# Sensei Evidence Ladder Design

**Status:** Approved
**Date:** 2026-11-13
**Pilot corpus:** `microsoft/aspire-skills`

## Summary

Sensei should evolve from a frontmatter and routing advisor into an evidence
engine for skill quality. The engine will keep deterministic analysis
host-neutral, expose host-specific compatibility profiles, and accept optional
adapters for observed activation and task-quality evaluation.

Quality will remain multidimensional. Sensei will not collapse specification
compliance, authoring quality, runtime effectiveness, security, and maintenance
into one grade. Each finding will identify its basis and evidence level.

Aspire Skills will be the first pilot corpus. A proposed rule becomes a default
Sensei check only when it has a standards basis, a measurable failure mode, or
behavioral evidence from the pilot.

## Goals

1. Separate portable specification checks from host extensions and authoring
   advice.
2. Validate a skill's complete resource graph, not only `SKILL.md`.
3. Measure observed routing and task-quality lift against a baseline.
4. Report safety, provenance, and lifecycle evidence without claiming a
   security certification.
5. Keep the core independent of model vendors, paid APIs, and evaluation
   frameworks.
6. Use Aspire Skills to validate useful checks and reject style-only rules.

## Non-goals

- Define a new skill file format.
- Treat patterns from a popular repository as universal requirements.
- Make `allowed-tools` or prompt text an enforcement boundary.
- Certify that a skill or script is safe.
- Require one model, host, or evaluation framework.
- Replace domain-specific tests in a skill repository.

## Research Inputs

The design compared these repository snapshots:

| Repository | Commit | Relevant pattern |
|---|---|---|
| `spboyer/sensei` | `e128c06` | Portable checks, advisory scoring, token checks, and adapter-based behavioral evaluation |
| `mattpocock/skills` | `5863806` | Context pointers, progressive disclosure, user/model invocation boundaries, completion criteria, and composability |
| `github/lever` | `a0acf31` | Feedback loops, observable outputs, stop conditions, autonomy dials, failure modes, and self-measurement |
| `microsoft/aspire-skills` | `1117fac` | Domain guardrails, multi-host publishing, source/generated integrity, Vally evals, repeated trials, and redacted trajectories |

Industry inputs include the Agent Skills specification and reference validator,
MCP Skills extension, Agent Plugins 1.0, GitHub Copilot, Claude, Gemini, and
Microsoft Agent Framework guidance, plus Promptfoo, Inspect AI, DeepEval,
SkillsBench, OWASP Agentic Applications guidance, NIST AI RMF, and SLSA.

## Quality Profiles

Sensei will report six independent profiles.

### Portable specification

Establish conformance to a commit-pinned Agent Skills specification and
reference-validator corpus. Diagnostics must distinguish:

- a portable specification violation;
- a canonical validator behavior that is not normative;
- a Sensei implementation limitation.

### Host compatibility

Validate explicit profiles for hosts and package formats, including Copilot,
Claude, Gemini, Codex/Agent Plugins, and MCP Skills. A valid host extension must
not be reported as a portable field.

### Information architecture

Evaluate the instruction and resource graph:

- context-pointer clarity;
- router versus worker responsibility;
- progressive disclosure;
- relative-link integrity and containment;
- shallow reference chains;
- orphaned resources;
- duplicated or stale guidance;
- completion, output, and stop criteria;
- placement of deterministic scripts for fragile work.

Heuristic findings remain advisory until validated by behavioral evidence.

### Behavioral evidence

Record observed activation and task behavior:

- positive, near-miss, and sibling-collision routing;
- held-out prompts and repeated trials;
- precision, recall, false-positive rate, and uncertainty;
- executable, schema, artifact, and trajectory assertions;
- duration, token, and tool-use observations;
- candidate versus no-skill or prior-version lift.

Sensei must not infer activation from output wording.

### Safety and supply chain

Report review evidence for:

- requested tools and permissions;
- shell, network, credential, filesystem-write, and destructive surfaces;
- declared versus observed capability needs;
- path containment and symlink escapes;
- dependency and action pinning;
- source origin, ref, tree digest, and resource digests;
- plugin and MCP manifests;
- approval boundaries and invalidation after content changes.

These are risk findings, not a security certification.

### Lifecycle health

Report:

- ownership and compatibility declarations;
- version and source identity;
- changelog and deprecation state;
- regression-eval coverage;
- release reproducibility;
- generated-mirror integrity;
- freshness of dependencies, evals, and compatibility claims.

## Evidence Model

Every check returns one result:

- `pass`
- `fail`
- `warning`
- `unknown`
- `not-applicable`

Every result includes:

- stable check identifier;
- profile;
- basis;
- severity;
- evidence level;
- observed evidence;
- source paths;
- remediation;
- unavailable evidence or limitations.

Valid bases are:

- `spec`
- `host`
- `security-standard`
- `empirical`
- `repository-policy`

Evidence advances through this ladder:

1. `declared`
2. `statically-verified`
3. `executed`
4. `baseline-compared`
5. `independently-reproduced`

Missing evidence remains `unknown`; it never becomes a success-shaped default.

## Architecture

### Neutral core

The core will own:

- skill and repository discovery;
- frontmatter and host-profile parsing;
- resource-graph construction;
- deterministic analyzers;
- policy loading;
- normalized findings;
- report and proof schemas;
- adapter protocol validation.

The core will not require a provider SDK, model credential, or paid runtime.

### Optional adapters

Adapters will configure a host, run an isolated trial, and return normalized
observations. Initial targets are:

- the existing generic process adapter;
- a Copilot/Vally adapter used by Aspire Skills;
- documented mappings for Promptfoo and other frameworks without making them
  core dependencies.

Adapters are untrusted executable code. Sensei must preserve inherited
credential warnings, bounded execution, raw evidence, and explicit unavailable
states.

### Policy

Repository policy may enable profiles, select hosts, set thresholds, record
accepted risks, and promote selected warnings to failures. Policy cannot
reclassify a host convention as a portable specification requirement.

## Initial Check Families

1. `spec-parity`: commit-pinned validator compatibility fixtures.
2. `host-profile`: portable and host-specific frontmatter/package validation.
3. `resource-graph`: links, containment, depth, orphans, size, and MIME.
4. `instruction-architecture`: pointer, disclosure, responsibility, completion,
   output, stop, duplication, and sprawl advisories.
5. `routing-eval`: realistic datasets, sibling collisions, holdouts, repeated
   trials, and routing metrics.
6. `behavioral-quality`: executable and trajectory assertions, variance, and
   baseline lift.
7. `script-readiness`: entry points, locks, tests, help, output, exit codes,
   idempotency, dry-run support, destructive defaults, and capability use.
8. `trust-and-release`: origin, digests, pinning, permissions, ownership,
   versions, eval coverage, mirrors, and reproducible releases.

## Aspire Pilot

Aspire Skills is a useful pilot because it combines large domain-rich skill
bodies with mature test, evaluation, release, and multi-host distribution
infrastructure.

The pilot will:

1. Inventory source skills, references, evals, scripts, generated catalogs, and
   plugin mirrors.
2. Run the existing Sensei baseline and preserve raw findings.
3. Apply deterministic profile checks.
4. Map existing Vally specs into the behavioral adapter protocol without
   replacing Vally.
5. Add sibling-routing and held-out cases where current coverage is missing.
6. Compare skill variants only where a proposed refactor has a measurable
   hypothesis.
7. Promote a heuristic to a default rule only when the pilot demonstrates a
   useful signal with an acceptable false-positive rate.

Likely pilot hypotheses include:

- large `SKILL.md` bodies hide branch-specific references that can be disclosed;
- router and worker boundaries can be made more explicit;
- existing Vally trajectories can provide stronger evidence than substring
  assertions;
- source/generated mirror and release checks belong in lifecycle health;
- approval-first mutation and handoff rules should remain domain guidance, not
  generic syntax requirements.

## Delivery Slices

### 1. Evidence model and report schema

Add profile, basis, state, evidence-level, and limitation types while preserving
the current `specChecks` and `checks` compatibility surface.

### 2. Deterministic analyzers

Add specification parity, host profiles, resource graph, instruction
architecture, script readiness, and trust/lifecycle checks in small reviewable
increments.

### 3. Behavioral adapters

Extend the manifest and adapter protocol for held-out routing, sibling
collisions, executable assertions, artifacts, trajectories, uncertainty, and
required baseline lift. Preserve the current v1 manifest.

### 4. Aspire pilot

Run the new profiles against Aspire Skills, integrate its Vally evidence, record
false positives, and propose only behavior-backed skill changes.

One tracking issue will link these four staged implementation issues.

## Error Handling

- Invalid configuration, malformed evidence, escaped paths, and adapter protocol
  violations fail explicitly.
- Missing host observations return `unknown`, not `pass`.
- Partial adapter runs retain evidence but cannot satisfy a gate.
- Host-profile conflicts identify both profiles and the conflicting field.
- Analyzer crashes identify the check and skill; batch runs continue only when
  configured to do so.
- Accepted risks are scoped, attributed, and expiring rather than silently
  suppressed.

## Testing

- Golden fixtures for portable and host-profile validation.
- Cross-platform resource-graph tests, including traversal and symlink cases.
- Property and malformed-input tests for normalized findings.
- Unit tests for every deterministic analyzer.
- Protocol fixtures for adapter success, unavailable evidence, timeout,
  malformed output, and partial runs.
- Compatibility tests for existing JSON and CLI output.
- Corpus snapshots for Sensei examples, Matt's skills, Lever, and Aspire Skills.
- Aspire Vally integration tests and repeated pilot runs before promoting
  empirical thresholds.

## Success Criteria

- Users can tell portable failures from host, policy, and empirical advice.
- Every finding explains its basis and evidence limit.
- Broken or unsafe resource graphs fail deterministically.
- Behavioral claims include observed activation and baseline comparison.
- Existing Sensei consumers retain a migration path.
- The Aspire pilot produces actionable findings with reviewed false positives.
- No repository style becomes a universal rule without supporting evidence.
