# Agent Skills standards refresh

Observed: 2026-10-29. Scope: issues [#25](https://github.com/spboyer/sensei/issues/25), [#26](https://github.com/spboyer/sensei/issues/26), [#27](https://github.com/spboyer/sensei/issues/27), [#28](https://github.com/spboyer/sensei/issues/28), and [#29](https://github.com/spboyer/sensei/issues/29).

## Design and boundaries

Keep the published `parseFrontmatter`, scoring, and proof entry points and their
existing result fields. Replace the YAML subset reader with a maintained parser,
preserving nested mappings and scalar types. Invalid YAML, duplicate keys, and
non-mapping roots must produce explicit specification diagnostics rather than
looking like missing frontmatter. Validate required string fields, optional scalar
types, string-valued metadata, and compatibility bounds.

Separate portable-spec checks from Sensei recommendations: optional license and
version suggestions belong in advisory results. Keep repo-local policy and token
budget warnings independent. Static scores are not behavioral observations or a
security audit. The 150-character floor, 60-word target, type prefix, routing labels,
and 500-token target are authoring heuristics, not normative requirements.

Prefer concise positive scope descriptions and test near-miss prompts; do not
mandate negative frontmatter clauses or make universal claims about model internals.
Update the root skill, documentation, scaffolds, contributor guidance, and existing
landing-page components together. Add a sourced portability reference that
distinguishes base fields from host extensions, discovery, permissions, sidecars,
and hosted execution.

Alternatives considered: extending the hand-written parser leaves YAML correctness
gaps; replacing the public result schema would unnecessarily break consumers.
Retaining the schema and using real YAML is the focused approach.

## Delivery sequence

Plan review resolved: use `yaml` with explicit unique-key checking. Preserve the
parser's nullable return and add optional `errors` diagnostics on parsed blocks;
reserve `null` for absent/unclosed delimiters. Validate raw field values before
typed convenience accessors, so wrong types cannot masquerade as absent fields.
Move license/version checks to `checks` (with advisory identifiers), retaining
`specChecks` for portable checks. Remove the stale, unimplemented `spec-security`
documentation row; it is not a base-standard requirement.

1. Rubber-duck this plan before implementation.
2. Implement #25 and #26 together with parser, scoring, CLI/proof regressions.
3. Implement #27 and #29 documentation/site changes and verify official sources.
4. Deliver #28 in separate [PR #30](https://github.com/spboyer/sensei/pull/30): independent command adapters
   or recorded evidence, repeated positive/near-miss cases, assertions, baselines,
   honest unavailable observations, and executable integration fixtures. Its owner
   owns `scripts/src/evals`, `references/evaluation.md`, and the new site component;
   this PR does not introduce another runner.
5. Rubber-duck the final diff, run code review before push, resolve meaningful
   findings, and open a focused PR closing #25, #26, #27, and #29.

Model refresh is already isolated in [PR #24](https://github.com/spboyer/sensei/pull/24).
Do not change squad models, governance, historical decisions, or team/log files.
[PR #5](https://github.com/spboyer/sensei/pull/5) owns Copilot extension-field
implementation; document and cross-link it without duplicating that work.

## Validation and evidence

Exercise actual YAML through public parse/score APIs, CLI JSON, and proof
generation: minimal standard frontmatter, nested metadata, quoted/folded/literal
scalars, comments, boolean/nonstring fields, duplicate keys, malformed YAML,
non-mapping roots, empty/oversized compatibility, and naming boundaries.
Verify optional suggestions never appear as spec failures and preserve local policy.

Run `npm test`, `npm run build`, narrow `npm run tokens -- score` and `check`
commands, and `npm --prefix docs run build`. Install dependencies only after a
manifest change or a missing-dependency failure. Inspect built content and local
links; audit commands in edited docs. Record pre-existing warnings separately from
introduced failures. Compare source constraints with the published specification
and document any unverified reference-validator parity rather than claiming it.

Sources: [specification](https://agentskills.io/specification.md),
[description guidance](https://agentskills.io/skill-creation/optimizing-descriptions.md),
[evaluation guidance](https://agentskills.io/skill-creation/evaluating-skills.md).

## Review resolutions and delivery evidence

The final rubber duck identified a corporate-feed URL in the generated YAML
lock entry. Regenerated it against the public npm registry and verified a clean
`npm ci`. Code review identified that blanket alias rejection would reject valid
YAML. Scalar aliases now resolve under a finite expansion limit; unresolved and
excessive aliases have regression tests and explicit diagnostics.

The root npm manifest declares YAML too: compiled public exports need that runtime
dependency when installed independently of the development scripts package.
A packed npm artifact was installed in a temporary directory and its public
parse/score APIs exercised successfully.

Validation: 175 tests passed, TypeScript build and Astro site build passed,
16 checked documentation files fit configured token limits, and 31 local links
resolved. Landing-page output includes corrected advisory labels and portability
guidance. The original root skill was about 3728 estimated tokens; the refreshed
operational skill is about 626. Its 500-token soft-target advisory and the
worktree directory/name mismatch remain honestly reported; neither is hidden.

Existing install warnings for `inflight` / `glob` came from the unchanged test
dependency tree. Optional GEPA optimization could not be exercised: the available
Python index only supplied versions through 0.1.4, below the existing
`gepa>=0.3.0` requirement. Score-only help and scoring ran independently without GEPA (proxy quality 0.50,
no test observations; not a behavioral pass). No optimization or reference-validator
parity is claimed.
