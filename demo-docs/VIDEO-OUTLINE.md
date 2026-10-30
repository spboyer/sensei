# Sensei Demo - Video Recording Outline

Duration: 5 minutes. Record at 1920x1080 with readable terminal text and captions.

## Before recording

- Restore checkout dependencies: `npm ci --prefix scripts`
- Save demo edits, then reset: `./demo-docs/run-demo.sh --reset`
- Verify Sensei is installed on the current host/surface
- Close notifications and check audio levels

## 0:00-0:40 - The problem

Show `demo-docs/sample-skill/SKILL.md`.

> "Utility for working with files" is vague. It can meet the portable format
> without distinguishing this skill from nearby workflows.

Do not present short descriptions as automatically invalid.

## 0:40-1:10 - Introduce Sensei

Show the README and explain read, score, improve, verify, check tokens, summary.
Medium-High is an authoring target, not a computed CLI grade.

## 1:10-3:30 - Live demo

```bash
npm run tokens -- score demo-docs/sample-skill --format=json
npm run tokens -- count demo-docs/sample-skill/SKILL.md
```

Highlight portable `specChecks` separately from optional `checks`.
Then request in Copilot:

```text
Run sensei on sample-skill in demo-docs/sample-skill --fast
```

Describe positive scope and near-miss tests, not mandatory anti-triggers.
State that `--fast` skips tests. Show the diff and the commit/issue/skip decision;
Skip preserves edits. Do not manufacture a passing-test segment.

## 3:30-4:30 - Evidence and comparison

Compare the live result with the fixed `SKILL-after.md` fixture.
Show actual token counts rather than scripted description-length claims.
An audit from `--emit-proof` is static evidence, not observed host activation.

Explain that [optional evaluation](../references/evaluation.md) runs trusted
adapters with repeated positive/near-miss cases, output assertions, and baselines.
Its bundled smoke test emits synthetic evidence, not live model results.
GEPA keyword fitness is a separate proxy measure.

## 4:30-5:00 - Closing

End on the [repository](https://github.com/spboyer/sensei) and
[release status](../README.md#distribution-and-release-status).
Current-source features may not yet be published to npm. Point viewers to
[installation/host guidance](../references/portability.md) and
[commit-pinned bundles](../references/distribution.md).

> Refine skill frontmatter, then measure behavior on your target host.
