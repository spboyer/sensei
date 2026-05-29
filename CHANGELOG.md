# Changelog

## 1.4.0

Minimal, additive fixes for [#22](https://github.com/spboyer/sensei/issues/22). No breaking changes.

- **Respect repo-local frontmatter policy.** `sensei score` detects `.sensei.json` (or `AGENTS.md` short-description cues) and waives the description-length floor when the target repo prefers short trigger phrases. Pass `--no-repo-policy` to opt out.
- **Verify tooling before claiming missing.** SKILL.md guardrail directs Sensei to confirm files exist on disk (`ls` / `git ls-files`) before suggesting they be created, eliminating false "missing tooling" recommendations.
- **Emit proof artifact.** New `--emit-proof[=path]` flag writes `sensei-audit.md` summarizing the score result and detected repo policy — gives PR review bots and humans a concrete artifact to link from PR bodies.
- **GEPA opt-in.** `auto_evaluator.py score` / `score-all` accept `--respect-repo-policy` for users running optimization against external repos with short-description policies.
- **Composite action.** New optional `emit-proof` input on `spboyer/sensei@v1`; existing workflows run identically without it.
