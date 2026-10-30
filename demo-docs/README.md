# Demo Materials

Source-checkout demos of portable YAML validation and the Sensei authoring loop.
Medium-High is an advisory target, not a computed CLI level or a routing guarantee.

## Quick Start

```bash
# From the repository root
npm ci --prefix scripts
./demo-docs/run-demo.sh --reset
./demo-docs/run-demo.sh
```

The script displays fixed before/after fixtures and actual token counts; it does
not run a live host or observe skill activation. `--reset` overwrites only the
sample `SKILL.md`; save any demo edits first. See the [root README](../README.md)
for skill installation and [release status](../README.md#distribution-and-release-status).

## Contents

| File | Description |
|------|-------------|
| [TALKING-POINTS.md](TALKING-POINTS.md) | Presenter script with notes (5 min) |
| [VIDEO-OUTLINE.md](VIDEO-OUTLINE.md) | Screen recording guide with timestamps |
| [INTERACTIVE-GUIDE.md](INTERACTIVE-GUIDE.md) | Live Copilot CLI walkthrough |
| [QUICK-REFERENCE.md](QUICK-REFERENCE.md) | One-page prep sheet |
| [run-demo.sh](run-demo.sh) | Executable demo script |
| [sample-skill/](sample-skill/) | Before/after skill examples |

## Sample Skill

- `sample-skill/SKILL.md` - Vague but portable-valid baseline
- `sample-skill/SKILL-after.md` - Clear positive scope, inline quoted description

Both use `name: sample-skill` to match their directory. The after file is a
comparison fixture; install a skill under `SKILL.md`, not `SKILL-after.md`.
No minimum description length or negative frontmatter clause is required.

## What evidence means

`score` separates portable `specChecks` from optional `checks`.
`score --emit-proof` writes a static audit, not a host trace or security audit.
Repo-local `.sensei.json` / `AGENTS.md` guide description style.
For repeated host observations and baseline/output comparisons, use the
[optional evaluator](../references/evaluation.md) with a trusted adapter.
GEPA keyword fitness and the bundled synthetic smoke test are not live routing evidence.

## Choose Your Format

| Scenario | Use This |
|----------|----------|
| Live presentation | TALKING-POINTS.md |
| Recording a video | VIDEO-OUTLINE.md |
| Hands-on workshop | INTERACTIVE-GUIDE.md |
| Quick refresher | QUICK-REFERENCE.md |
| Automated show | run-demo.sh |
