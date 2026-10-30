# Sensei Demo - Quick Reference

## 5-Second Pitch

Sensei validates portable skill YAML and helps refine routing guidance.

## Key Commands

From a current checkout after `npm ci --prefix scripts`:

| Command | Description |
|---------|-------------|
| `npm run tokens -- score demo-docs/sample-skill` | Portable diagnostics and optional advice |
| `npm run tokens -- count demo-docs/sample-skill` | Estimated token counts |
| `npm run tokens -- score demo-docs/sample-skill --emit-proof` | Write a static audit artifact |
| `./demo-docs/run-demo.sh` | Display before/after fixtures; not a live agent run |

In Copilot CLI, request:

```text
Run sensei on sample-skill in demo-docs/sample-skill --fast
```

`--fast` is a workflow prompt flag, not a CLI option. It skips tests.

## Authoring Rubric

| Level | Guidance, not a computed CLI score |
|-------|-----------------------------------|
| Low | Vague scope or no distinctive use cases |
| Medium | Recognizable purpose, ambiguous routing |
| Medium-High | Concise scope and distinctive positive use cases |
| High | Useful tool relationships and bypass guidance |

Only `name` and `description` are required portable fields. Description maximum:
1024 characters; no 150-character floor. `WHEN:`, type prefixes, 60 words, and
the 500-token target are Sensei conventions. Do not pad useful descriptions.
Test negative boundaries as near-miss prompts, not mandatory exclusion clauses.

## Before/After

```yaml
# Before: vague, but not invalid just for being short
description: 'Utility for working with files'

# After: clearer positive scope
description: "**UTILITY SKILL** - Read, write, copy, delete, and list local files. WHEN: \"read file contents\", \"copy a file\", \"list a directory\"."
```

## FAQ

**Does it change code?** The loop may update skill instructions and related tests.
Review the diff; commits require approval. Skip does not discard edits.

**What does a pass prove?** Static checks do not prove host activation or security.
The [optional evaluator](../references/evaluation.md) compares repeated observed
runs and literal output assertions against a baseline; it requires a trusted host adapter.

## Pre-Demo Checklist

- [ ] Current source and script dependencies available
- [ ] Skill installed for the chosen [host surface](../references/portability.md)
- [ ] Sample reset with `./demo-docs/run-demo.sh --reset` (overwrites demo edits)
- [ ] Explicit sample path used in the workflow request
- [ ] Terminal readable and notifications off

## Links

- [Repository and release status](../README.md#distribution-and-release-status)
- [Agent Skills specification](https://agentskills.io/specification)
- [Ralph loop](../references/loop.md)
- [Source bundles](../references/distribution.md)
