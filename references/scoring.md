# Scoring criteria

## Portable specification versus recommendations

Observed 2026-10-29 against the [Agent Skills specification](https://agentskills.io/specification.md).
`npm run tokens -- score <skill-dir>` returns two existing arrays in JSON and
separate sections in readable output and proof artifacts:

| Result | Meaning |
|---|---|
| `specChecks` | Portable frontmatter diagnostics, not a security audit or host certification |
| `checks` | Optional Sensei authoring suggestions, informed in part by [SkillsBench](skillsbench.md) |

`license` and `metadata.version` are optional. Missing values appear only as
`license-recommendation` and `version-recommendation` in `checks`; version is not
a standardized metadata key. An omitted optional field is not a spec failure.

## Implemented specification checks

| Check | Constraint |
|---|---|
| `spec-frontmatter` | Closed YAML mapping; required non-empty string `name` and `description`; rejects malformed YAML and duplicate keys |
| `spec-field-types` | Optional `license`, `compatibility`, `allowed-tools` are strings; `metadata` maps string keys to string values |
| `spec-allowed-fields` | Strict portable field list: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` |
| `spec-name` | 1-64 lowercase ASCII letters/digits/hyphens, no leading/trailing or consecutive hyphens |
| `spec-dir-match` | Name matches parent directory (when path context is supplied) |
| `spec-description` | Non-empty, at most 1024 characters |
| `spec-compatibility` | Optional; 1-500 characters when supplied |

YAML quoted, folded, and literal scalars retain YAML semantics. Quote numeric
metadata such as `version: "1.0"` to keep it a string. `parseFrontmatter` returns
`null` for absent/unclosed delimiters; a delimited invalid document returns
`{ fields: {}, errors: [...] }`. Existing typed convenience accessors remain
optional. YAML aliases are resolved with the parser's finite expansion limit of
100; unresolved or excessive aliases produce explicit diagnostics rather than
an uncaught error. That resource limit is an implementation guard, not an
additional base-spec rule. Unknown YAML tags are diagnosed rather than treated
as valid portable data.

Host extensions are not necessarily invalid on their intended host, but the
strict portable allowlist warns about them. See [portability](portability.md) and
[PR #5](https://github.com/spboyer/sensei/pull/5) for separate Copilot field work.
No generic XML prohibition or reserved `claude-`/`anthropic-` prefix rule is
asserted by these checks.

The published specification ambiguously says "unicode lowercase alphanumeric"
while also naming `a-z` and `0-9`. Sensei retains its existing ASCII name rule.
Reference-validator parity is not claimed; compare using
`skills-ref validate ./my-skill` in an environment where it is installed.

## Sensei authoring rubric

These are human-facing workflow targets, not a computed CLI level or normative
format rules. The CLI emits individual checks and complexity classification.

| Level | Suggested authoring target |
|---|---|
| Low | Vague scope or no distinctive use cases |
| Medium | Recognizable purpose, but noisy or ambiguous routing |
| Medium-High | Concise intent/scope and distinctive positive use cases |
| High | Medium-High plus useful tool relationships and bypass guidance |

Prefer a clear action/domain lead. `WHEN:` with quoted phrases is a convenient
Sensei convention; `USE FOR:` and natural prose also work. Type prefixes,
`INVOKES:`, and `FOR SINGLE OPERATIONS:` are optional routing conventions.
Do not pad a useful short description to 150 characters. The 60-word target is
an editing heuristic; the specification's limit is 1024 characters.

### Negative boundaries

Default scaffolds use concise positive routing. The `cross-model-anti-trigger`
advisory detects negative routing clauses regardless of skill-set size; it does
not measure contamination or model internals. Negative boundaries can help some
deployments. Test actual activation with realistic positives, paraphrases, and
near-miss prompts instead of requiring `DO NOT USE FOR:` syntax.

The `cross-model-*` identifiers are retained for API compatibility; their results
are static hints, not cross-host reliability measurements.

### SkillsBench-informed checks

`module-count`, `complexity`, `negative-delta-risk`, `procedural-content`, and
`over-specificity` are pattern-based suggestions. Dataset-level observations do
not establish that an individual skill will improve or hurt performance.
Domain-specific instructions, constraints, or additional references may be
necessary. Preserve useful content and evaluate outcomes, rather than optimizing
only the static score.

## Token budgets and policy

Sensei's workflow suggests about 500 tokens in `SKILL.md` and references near
2000 tokens. These are local authoring targets. The specification recommends
under 5000 tokens and 500 lines, not a mandatory 500-token maximum.
The CLI uses a character-based token estimate, not an exact tokenizer.

`check` enforces configured `.token-limits.json` thresholds; `--strict` makes
exceeded configured limits fail. `suggest` emits optional optimization ideas.
Keep those warnings separate from optional `score` recommendations.
Repo-local `.sensei.json` / AGENTS.md policy remains authoritative for local
description style; use `--no-repo-policy` only intentionally. When running from
a Sensei checkout against a separate target repository, add
`--root <target-repo>` and pass positional paths relative to that root.

## Evidence limits

Static scoring and proof artifacts establish neither observed activation,
task-quality improvement, nor a security audit. GEPA's keyword matching is proxy
fitness, not observed host invocation. Evaluate repeated realistic requests and
compare outputs with no-skill or prior-version baselines, preserving concrete
assertion evidence and reporting unavailable observations honestly.
