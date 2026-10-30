# Sensei Demo - Interactive Copilot CLI Guide

## Setup

Use a full checkout; source bundles deliberately exclude demo materials.
From a current Sensei checkout:

```bash
npm ci --prefix scripts
./demo-docs/run-demo.sh --reset
```

Reset overwrites the sample `SKILL.md`. Save edits first. Install Sensei for your
chosen [Copilot surface](../references/portability.md); a local personal clone
does not automatically provision cloud sessions.

## 1. Show the problem

Ask Copilot:

```text
Show me demo-docs/sample-skill/SKILL.md
```

The short description is vague, not invalid just because it is short.
Ask which tasks belong to this skill and which competing workflows are nearby.

## 2. Separate specification and advice

```bash
npm run tokens -- score demo-docs/sample-skill --format=json
npm run tokens -- count demo-docs/sample-skill/SKILL.md
```

Point out `specChecks` versus optional `checks`. The CLI does not compute a
Low-to-High level. Missing license/version are advisory. Token counts are
estimates; `check --strict` enforces configured limits, not the 500-token target.

## 3. Run the authoring loop

```text
Run sensei on sample-skill in demo-docs/sample-skill --fast
```

Expect read, score, improve, token check, summary, then a commit/issue/skip
decision. Tests are skipped with `--fast`; report them as not run.
Clarify positive scope rather than padding to 150 characters or requiring
`DO NOT USE FOR:`. Repo-local `.sensei.json` / `AGENTS.md` guide style.
Choose Skip to avoid committing; it does not discard edits.

## 4. Compare with the fixed fixture

```text
Compare demo-docs/sample-skill/SKILL.md with demo-docs/sample-skill/SKILL-after.md
```

The after fixture uses an inline quoted description and three distinctive
`WHEN:` phrases. It illustrates the Medium-High authoring target; it is not
proof that a host selected the skill or that task quality improved.

## 5. Show evidence options

```bash
npm run tokens -- score demo-docs/sample-skill --emit-proof
```

The generated `demo-docs/sample-skill/sensei-audit.md` is a static audit.
Do not present it as a trace or security review. Remove the generated demo
artifact when finished.

For behavioral evaluation, follow the [adapter contract](../references/evaluation.md)
and supply realistic positive/near-miss tasks, repeated runs, and a without-skill
or prior-version baseline. Only run trusted adapters: they execute local code
with inherited environment/credentials. Missing activation evidence cannot pass.

## Wrap up

Demonstrate batch or GEPA prompt modes only if needed. GEPA optimization is
optional and uses proxy fitness, not observed activation.
Check [release status](../README.md#distribution-and-release-status) before
replacing checkout commands with npm commands for recently merged features.

If the skill does not load, verify installation on the current host/surface.
If source commands fail for missing dependencies, restore with `npm ci --prefix scripts`.
