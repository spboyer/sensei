# Sensei Demo - Talking Points

Duration: 5 minutes. Use the [interactive guide](INTERACTIVE-GUIDE.md) for setup.

## The problem (30 seconds)

Show `demo-docs/sample-skill/SKILL.md`.

> "Utility for working with files" is valid YAML, but it does not distinguish
> this workflow from nearby tools. Length alone does not establish useful scope.

Do not claim a missing negative clause causes collisions or that a static
checker observes how a model selected a skill.

## The solution (30 seconds)

> Sensei validates portable frontmatter, suggests optional authoring improvements,
> and runs an iterative read-score-improve-verify loop.

The standard requires `name` and `description`. `WHEN:`, type prefixes, and the
Medium-High target are conventions, not specification requirements.
Configured token limits are separate from optimization advice.

## Live demo (3 minutes)

Show actual CLI output:

```bash
npm run tokens -- score demo-docs/sample-skill --format=json
npm run tokens -- count demo-docs/sample-skill/SKILL.md
```

Explain `specChecks` versus `checks`. Then ask Copilot:

```text
Run sensei on sample-skill in demo-docs/sample-skill --fast
```

Describe the edits as clearer positive scope. `--fast` means tests were not run.
Review the diff and choose Skip to avoid a commit, preserving edits.
Compare with `SKILL-after.md`, a fixed fixture rather than a live evaluation.

## Evidence and result (1 minute)

| Evidence | What it establishes |
|----------|---------------------|
| `score` / `--emit-proof` | Static frontmatter diagnostics and advice |
| Token count/check | Estimated size and configured budget status |
| GEPA score | Keyword/proxy fitness, not observed host activation |
| Optional `eval` | Adapter-reported traces, literal assertions, baseline comparison |

The evaluator needs a trusted adapter and realistic repeated positive/near-miss
cases. Missing observations cannot pass; synthetic fixtures test plumbing only.
Passing does not establish improved quality over the baseline or a security audit.

## Closing

> Refine the instructions, preserve useful scope, and evaluate on your target host.

Point to the [README](../README.md), [release status](../README.md#distribution-and-release-status),
[distribution contract](../references/distribution.md), and
[behavioral evaluator](../references/evaluation.md).

## Q&A

**Why Medium-High?** It is a useful human-facing authoring target for concise
scope and distinctive use cases, not a computed CLI grade.

**Does Sensei change code?** The workflow may edit skill instructions and tests.
Review the diff and approve commits explicitly.

**Does a local install reach the cloud?** Not automatically; check the
[host/location matrix](../references/portability.md).
