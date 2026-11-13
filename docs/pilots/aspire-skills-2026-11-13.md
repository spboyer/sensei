# Aspire Skills Evidence-Ladder Pilot

**Corpus:** `microsoft/aspire-skills`
**Commit:** `1117fac`
**Observed:** 2026-11-13

## Purpose

Aspire Skills is the first external corpus for validating Sensei's layered
quality model. The pilot separates deterministic findings from author style and
records repository strengths before proposing changes.

This snapshot is research evidence, not a live certification. Model-backed
Vally trials were not rerun as part of the static corpus review.

## Inventory

| Skill | SKILL.md lines | Bytes | Other files | Eval spec | Stimuli |
|---|---:|---:|---:|---|---:|
| `aspire` | 270 | 20,967 | 4 | yes | 29 |
| `aspire-deployment` | 250 | 18,184 | 11 | yes | 33 |
| `aspire-init` | 161 | 9,935 | 3 | yes | 23 |
| `aspire-monitoring` | 233 | 14,400 | 5 | yes | 31 |
| `aspire-orchestration` | 294 | 22,349 | 7 | yes | 57 |
| `aspire-project-v2-migration` | 258 | 14,185 | 3 | yes | 22 |
| `aspire-terminals` | 165 | 10,194 | 5 | yes | 12 |
| `aspireify` | 370 | 21,846 | 11 | yes | 36 |

The corpus also contains generated OpenCode catalogs, published plugin mirrors,
three host/plugin metadata surfaces, extension code, repository tests, and
shared eval fixtures.

## Existing strengths

Sensei must recognize these as positive lifecycle and behavioral evidence:

- Every shipped source skill has a Vally eval specification.
- PR evaluation scopes model-backed runs to changed skills; a weekly suite runs
  broader repeated trials.
- Evaluation results are integrity-checked and redacted before artifact upload.
- Source/generated OpenCode catalogs use SHA-512 content versions and have a
  drift check.
- Published plugin mirrors and extension mirrors have tests.
- Release workflows pin third-party Actions by commit SHA.
- Mutation-heavy skills include explicit approval and handoff rules.
- Router evals assert actual skill invocation, disallowed sibling skills, and
  unchanged workspaces rather than judging final prose alone.

These are stronger than the static frontmatter score and belong in behavioral,
safety, and lifecycle profiles.

## Findings and disposition

| Candidate finding | State | Disposition |
|---|---|---|
| All source `SKILL.md` files remain below the portable 500-line recommendation | pass | Do not classify these skills as noncompliant based on Sensei's 500-token heuristic |
| Skill bodies are large relative to Matt Pocock's composable set | warning | Treat as a progressive-disclosure hypothesis, not a failure |
| All skills have eval specs | pass | Count as lifecycle evidence |
| Vally uses repeated trials and explicit skill-invocation graders | pass | Map traces and trajectories through an optional adapter |
| Router cases cover required and disallowed siblings | pass | Preserve; add explicit held-out labeling only if maintainers intend p2 as holdout |
| Eval suites use p0/p1 PR gates and p2 weekly coverage | unknown | Priority is not automatically a train/holdout split |
| Several resources are discovered by Vally or publishing tools rather than Markdown links | expected warning | Orphan checks need repository-policy suppression or host discovery metadata |
| Rich handoff, safety, and version rules repeat across skills | review | Deduplicate only where one source remains reliably reachable on every branch |
| `SKILL.md` descriptions use folded YAML and host/package metadata | pass by profile | Validate under the intended host profile; do not call host fields portable |

## Analyzer run

The built `sensei analyze` command ran against all eight skills with the Aspire
repository as the containment root.

| Skill | Manifest resources | Fails | Warnings | Unknown |
|---|---:|---:|---:|---:|
| `aspire` | 5 | 0 | 0 | 0 |
| `aspire-deployment` | 12 | 0 | 0 | 0 |
| `aspire-init` | 4 | 0 | 0 | 0 |
| `aspire-monitoring` | 6 | 0 | 0 | 0 |
| `aspire-orchestration` | 9 | 0 | 0 | 0 |
| `aspire-project-v2-migration` | 4 | 0 | 1 | 0 |
| `aspire-terminals` | 6 | 0 | 0 | 0 |
| `aspireify` | 13 | 0 | 0 | 0 |

The remaining warning is the lexical
`instruction-completion-criteria` advisory for
`aspire-project-v2-migration`. It is not a gate and requires behavioral review
before any content change.

The first analyzer run also proved three false positives:

1. Vally-discovered eval files appeared orphaned.
2. A handoff link to a sibling `SKILL.md` recursively imported the sibling's
   private reference graph and produced depth warnings.
3. A local `node_modules` junction entered the resource manifest.

The analyzer was corrected to exclude host-discovered evals and package-managed
scripts from orphan checks, stop at a linked sibling skill boundary, and omit
dependency/build directories. The table above is from the corrected run.

## False-positive controls

The pilot rejects these as default rules:

- A fixed number of reference modules. Aspire's domain breadth and generated
  assets make module count contextual.
- A mandatory `DO NOT USE FOR` clause. Routing quality belongs in near-miss and
  sibling tests.
- A universal 500-token ceiling. The portable recommendation is under 5,000
  instruction tokens and 500 lines; smaller thresholds are repository policy.
- Mandatory sections copied from Lever. Outputs, stop conditions, and feedback
  loops are useful for long-running workflows, not every reference skill.
- Treating Vally-discovered eval files as orphaned solely because `SKILL.md`
  does not link them.
- Treating p2 priority tags as holdout data without an explicit repository
  declaration.

## Adapter mapping

The mapping is documented in
[`references/adapters.md`](../../references/adapters.md). Vally remains the
runner. The adapter translates completed trial evidence into Sensei activation,
artifact, and trajectory observations; it does not replace Vally graders or
redaction.

## Recommended Aspire experiments

1. Select one large worker skill and move one branch-specific reference block
   behind an explicit conditional pointer.
2. Keep prompts, fixtures, models, and trial counts fixed.
3. Compare routing, task graders, tool trajectory, tokens, and variance against
   the prior version.
4. Keep the refactor only if the held-out result meets a preregistered lift or
   non-regression threshold.
5. Record any analyzer warnings caused by Vally discovery or generated mirrors
   as repository policy before enabling a CI gate.

No Aspire skill content should change from this static review alone.

## Promotion decision

Promote now:

- portable versus host-profile separation;
- contained resource graphs and broken-link failures;
- explicit unknown evidence;
- repeated routing observations and sibling collisions;
- artifact and trajectory assertions;
- lifecycle recognition for evals, mirrors, pinning, and redaction.

Keep advisory pending experiments:

- sprawl thresholds below the portable recommendation;
- completion and stop-section heuristics;
- duplicate-guidance detection;
- reference-module count targets.
