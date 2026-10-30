# Better Skill Frontmatter Starts with Clear Scope

*By Shayne Boyer*

*Updated 2026-10-30 to reflect the merged YAML, distribution, and evaluation work.*

Your agent selects a neighboring skill. Was the description ambiguous? Was the
skill installed on that surface? Did the host expose a trace of what it loaded?
Those are different questions, and a frontmatter score cannot answer all of them.

[Sensei](https://github.com/spboyer/sensei) helps validate portable Agent Skills
frontmatter and refine authoring guidance using the
[Ralph loop](../../references/loop.md). Its optional evaluator can compare
adapter-reported host observations and task assertions against a baseline.

## Specification Is Not Style

The [Agent Skills specification](https://agentskills.io/specification) requires
`name` and `description`. Sensei checks YAML structure, required fields, names,
directory matching, field types, and portable limits. It uses a maintained YAML
parser with explicit diagnostics for malformed documents, duplicate keys, and
invalid or excessive aliases.

Reports distinguish portable `specChecks` from optional authoring `checks`.
License and version suggestions remain advisory. Host-specific fields may work
on their intended host while producing a strict portable-allowlist warning.

The Medium-High target is a human-facing authoring rubric, not a computed CLI
grade. `WHEN:`, type prefixes, a 60-word description target, and roughly 500
tokens in `SKILL.md` are Sensei conventions, not portable format requirements.
There is no reason to pad a useful short description to 150 characters.

## From Vague to Specific

Both of these examples can meet the portable format:

```yaml
---
name: pdf-processor
description: 'Process PDF files for various tasks'
---
```

```yaml
---
name: pdf-processor
description: "Extract PDF text, rotate pages, and merge existing PDFs. WHEN: \"extract PDF text\", \"rotate PDF pages\", \"merge PDFs\"."
---
```

The second description makes the intended work clearer. It does not prove that
every host will select the skill correctly. Default to concise positive scope;
test negative boundaries with realistic near-miss requests rather than requiring
`DO NOT USE FOR:` syntax.

For skills that orchestrate tools, document prerequisites, tool relationships,
and bypass/fallback guidance. That is an
[authoring checklist](../../references/mcp-integration.md), not a computed MCP
sub-score or a permission grant.

## Refine, Review, Repeat

In a host where Sensei is installed, request:

```text
Run sensei on my-skill-name
```

The loop reads the skill, runs static scoring, scaffolds missing tests only after
checking the disk, improves scope, runs tests, and checks token usage. It then
summarizes the diff and asks whether to commit, create an issue, or skip.
Skip does not discard edits; `--fast` skips tests and must report them as not run.

Repo-local `.sensei.json` and `AGENTS.md` guide description style.
`score --emit-proof` can write a static audit for review. Token `check --strict`
enforces configured limits; `suggest` produces optional optimization ideas.
None of these is a security audit or observed activation trace.

## Measure Behavior Separately

[Optional behavioral evaluation](../../references/evaluation.md) uses a trusted
host adapter, repeated positive and near-miss tasks, and a without-skill or
prior-version baseline. It separates activation evidence, routing expectations,
literal output assertions, unavailable evidence, and descriptive baseline deltas.

Adapters execute local code with inherited environment and credentials, not in
a sandbox. They own session isolation, host configuration, authentic complete
traces, and descendant/remote job cancellation. Sensei validates response
structure, not trace authenticity. Missing observations cannot pass.

The bundled fixture emits synthetic traces and fixed output to test the
protocol. It is not a live model benchmark. GEPA optimization is another
optional path, using keyword/proxy fitness rather than observed activation.
Even an evaluator pass does not establish improvement over the baseline.

## Install the Right Surface and Version

```bash
npx skills add spboyer/sensei
```

Check the [host/location matrix](../../references/portability.md): a shared
`SKILL.md` does not standardize installation, account sync, permissions, or
cloud availability.

Newly merged features may not yet be published to npm. From a current checkout:

```bash
npm ci --prefix scripts
npm run tokens -- score /path/to/skills/my-skill
npm run tokens -- eval manifest.json --root=/path/to/project --format=json
```

See the [README release status](../../README.md#distribution-and-release-status)
before substituting release-tag or npm commands. The composite Action invokes
npm, not the CLI from its own checkout.

For pull-based distribution, [commit-pinned bundles](../../references/distribution.md)
contain source, provenance, and checksums, retained as Actions artifacts for 30
days. They exclude installed dependencies/compiled CLI and require authenticated
downloads. Checksums are not signed attestations; downstream dotfiles updates
remain independent, reviewable changes.

## Help Improve the Evidence

Sensei is MIT licensed. Useful contributions include YAML regressions, realistic
near-miss cases, host adapters with auditable traces, and documentation that
clearly separates conventions from requirements.

Refine the instructions. Preserve useful scope. Measure behavior on your host.

→ [github.com/spboyer/sensei](https://github.com/spboyer/sensei)
