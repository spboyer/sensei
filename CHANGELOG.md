# Changelog

## Unreleased

Changes merged after the published releases. `main` is not an npm dist-tag;
see [release status](README.md#distribution-and-release-status) for current-source usage.

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
