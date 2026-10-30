# Sensei Social Posts

Updated campaign copy, 2026-10-30. These are drafts, not a record of publication.
Check the [release status](../../README.md#distribution-and-release-status) before posting.

Platform rules:
- LinkedIn: No markdown, backticks, or code blocks in post text. Links in first comment only.
- X: 280-character limit per tweet; 0-1 hashtags.

## Post 1: Specification versus advice

### LinkedIn

Skill frontmatter can be valid YAML and still describe its job poorly.

I built Sensei to help with both questions, without pretending they are the same.

The current source separates portable specification diagnostics from optional
authoring suggestions. Only name and description are required portable fields.
There is no 150-character minimum to satisfy. A useful short description should
stay short.

Medium-High is an authoring target, not a computed CLI grade or a routing guarantee.
Sensei helps refine scope using an iterative read, score, improve, and verify loop.

Open source. MIT licensed. Link in the first comment.

### X

Sensei separates portable skill frontmatter diagnostics from optional authoring advice. Short useful descriptions need no padding. Medium-High is an authoring target, not a routing guarantee. github.com/spboyer/sensei

## Post 2: Before and after

### LinkedIn

"Process PDF files for various tasks."

That can be valid skill metadata. It still leaves a lot of scope unexplained.

Try: "Extract PDF text, rotate pages, and merge existing PDFs."

The improvement is clearer intent, not extra characters. Sensei helps refine
positive scope and test realistic nearby requests. Negative boundaries belong
in evaluation cases; no mandatory exclusion clause is needed.

Review the diff, preserve useful instructions, and evaluate on your target host.
Static checks alone do not prove which skill a host loaded.

Link in the first comment.

### X

Before: "Process PDF files for various tasks."
After: "Extract PDF text, rotate pages, and merge existing PDFs."

Clearer scope, not mandatory padding or anti-triggers. Validate the format; test the behavior. github.com/spboyer/sensei

## Post 3: Evidence beyond scoring

### LinkedIn

Did the host actually load the skill? Did the output meet the task requirements?

Those are not frontmatter-scoring questions.

Sensei's current source adds optional behavioral evaluation through trusted host
adapters: repeated positive and near-miss tasks, baseline comparisons, explicit
activation evidence, and literal output assertions.

Missing observations cannot pass. Adapters are trusted local code, responsible
for authentic traces and isolated sessions. A synthetic fixture tests the
protocol, not live model performance.

Baseline deltas are descriptive. A pass is not proof of improvement or a security audit.
The evaluator is merged source work, not yet in the published npm release.

Adapter contract in the first comment.

### X

Sensei's current source adds opt-in behavioral evaluation: trusted adapters, repeated tasks, baselines, traces, and output assertions. Missing evidence cannot pass. Synthetic fixtures are not live benchmarks. github.com/spboyer/sensei

## Post 4: Source distribution and contributions

### LinkedIn

A merged skill change is not automatically an installed update.

Sensei now publishes commit-pinned source bundles with provenance and checksums.
They contain source, not installed dependencies or compiled output. Actions
downloads require authentication and expire after 30 days.

Downstream dotfiles updates remain independent, reviewable changes. A shared
SKILL.md also does not guarantee shared host installation paths or permissions.

I'm looking for YAML regressions, realistic evaluation cases, and auditable host
adapters. Better tooling starts with being precise about what we measured.

Repository and distribution contract in the first comment.

### X

Sensei source bundles pin an exact commit with provenance and checksums. They are separate from npm releases and downstream dotfiles updates. Contribute YAML regressions, realistic cases, or host adapters. github.com/spboyer/sensei
