# Changelog

## Unreleased

No unreleased changes.

## 1.6.3 - 2026-11-13

### Workflow completion and role leads

- Recognizes explicit `Handoff Rules` and `Self-Deactivate` headings as workflow
  completion contracts.
- Recognizes bounded terminal handoffs, fully wired/initialized outcomes, and
  explicit `<skill> is done` statements without accepting incidental mentions.
- Accepts a short domain/role label when the immediately following sentence is
  action-led, while keeping long preambles and noun-only descriptions advisory.
- Adds isolated regressions from `aspire-init`, `aspireify`, and the Aspire router.

## 1.6.2 - 2026-11-13

### Calibrated authoring evidence

- Recognizes explicit validate, verify, report, idempotence, and failure
  contracts as workflow completion evidence.
- Treats description length, negative boundaries, reference-module count,
  constraint count, and sub-5000-token complexity as observations rather than
  universal warnings.
- Restricts over-specificity warnings to unmasked absolute paths and private IP
  literals, with exact evidence in the finding.
- Recognizes common domain action verbs, simple inflections, leading adverbs,
  and first-run workflow language.
- Adds regression coverage from the released `microsoft/aspire-skills` audit.

## 1.6.1 - 2026-11-13

### GitHub-first distribution

- The composite Action now runs the source from its pinned GitHub Action ref
  instead of downloading `@spboyer/sensei` from npm.
- GitHub Releases attach an installable compiled package tarball, source bundle,
  source provenance, and SHA-256 checksum manifests.
- `package-version` remains as a deprecated Action input; the Action ref is now
  the version selector.
- npm remains an optional distribution channel until its trusted-publisher
  binding is configured.

## 1.6.0 - 2026-11-13

### Skill quality evidence ladder

- Added six independent profiles for portable specification, host
  compatibility, information architecture, behavioral evidence, safety/supply
  chain, and lifecycle health.
- Added normalized findings with explicit basis, state, severity, evidence
  level, remediation, limitations, and per-profile summaries while preserving
  the legacy `specChecks` and `checks` arrays.
- Added portable and Copilot frontmatter profiles plus a commit-pinned Agent
  Skills validator corpus.

### Repository analysis

- Added `sensei analyze` and the `@spboyer/sensei/analyze` export.
- Added contained Markdown, reference-style, and Copilot `#file:` resource
  analysis with realpath and symlink protection.
- Added aggregate MCP resource limits, script readiness and capability signals,
  dependency-lock checks, and lifecycle evidence.
- Added adversarial coverage for code samples, dangling and escaping symlinks,
  linked scripts, oversized manifests, and false-positive test detection.

### Behavioral evaluation

- Added positive, near-miss, sibling-collision, and held-out case metadata.
- Added precision, recall, false-positive rate, routing variance, and holdout
  summaries.
- Added negative-text, regular expression, bounded JSON shape, artifact,
  trajectory, and trusted command assertions.
- Added shared execution deadlines and explicit positive baseline-lift gates for
  improvement claims.
- Documented Copilot/Vally and Promptfoo adapter mappings without adding either
  framework as a core dependency.

### Aspire pilot and documentation

- Validated the analyzer against all eight `microsoft/aspire-skills` skills,
  recorded false-positive corrections, and kept unproven prose heuristics
  advisory.
- Updated the root README, skill workflow, configuration and evaluation
  references, composite Action, and website for the evidence model.
- Prepared npm trusted publishing with GitHub OIDC; npm remains optional until
  the package publisher binding is enabled.

### Portable validation and evidence

- **YAML validation** ([#31](https://github.com/spboyer/sensei/pull/31)). Maintained YAML parser, duplicate/type/alias diagnostics, and separate portable `specChecks` versus optional `checks`. License/version remain advisory; routing labels and token targets are Sensei conventions.
- **Behavioral evaluation** ([#30](https://github.com/spboyer/sensei/pull/30)). Opt-in `eval` with trusted adapters, repeated positive/near-miss cases, baselines, literal output assertions, and explicit unavailable evidence. See [evaluation](references/evaluation.md); synthetic fixtures do not measure live host performance.
- **Source bundles** ([#32](https://github.com/spboyer/sensei/pull/32)). Commit-pinned `sensei.tar.gz`, provenance, and checksums; 30-day Actions retention. Source only, separate from npm and downstream dotfiles updates. See [distribution](references/distribution.md).
- **Squad maintenance** ([#24](https://github.com/spboyer/sensei/pull/24)). Refreshed role preferences inherit host defaults. The protected-branch guard allows reviewed team/decision/charter files while blocking runtime state; historical decisions remain preserved.

### Repo-local policy and proof

Merged in [#23](https://github.com/spboyer/sensei/pull/23) for [#22](https://github.com/spboyer/sensei/issues/22):

- **Respect repo-local frontmatter policy.** `sensei score` detects `.sensei.json` (or `AGENTS.md` short-description cues) and reports the target's style in output/proof artifacts. This originally waived a description-length floor; the current scorer has no 150-character minimum. Pass `--no-repo-policy` to opt out of detection.
- **Verify tooling before claiming missing.** SKILL.md guardrail directs Sensei to confirm files exist on disk (`ls` / `git ls-files`) before suggesting they be created, eliminating false "missing tooling" recommendations.
- **Emit proof artifact.** New `--emit-proof[=path]` flag writes `sensei-audit.md` summarizing the score result and detected repo policy — gives PR review bots and humans a concrete artifact to link from PR bodies.
- **GEPA opt-in.** `auto_evaluator.py score` / `score-all` accept `--respect-repo-policy` for users running optimization against external repos with short-description policies.
- **Composite action.** Optional `emit-proof` input on the current source action. The action invokes npm (`package-version: latest` by default), not its checkout's CLI; both the Action ref and package version must support the requested flag. Existing workflows are unchanged without it.
