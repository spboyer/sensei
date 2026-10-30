# Sensei

> "A true master teaches not by telling, but by refining." - The Skill Sensei

Sensei validates portable [Agent Skills](https://agentskills.io/specification.md) frontmatter and suggests authoring improvements using the [Ralph loop pattern](references/loop.md). Medium-High is a Sensei advisory target, not a specification compliance level.

**Specification versus advice:** `score` keeps portable diagnostics in `specChecks`
and optional Sensei recommendations in `checks`, including license/version suggestions.
The standard requires only `name` and `description`; 150 characters, 60 words,
`WHEN:`, type prefixes, and the 500-token target are heuristics, not normative rules.
Static scores and proof artifacts are neither observed activation nor security audits.
See [scoring](references/scoring.md) and [host portability](references/portability.md)
for constraints, runtime limitations, and the separately owned Copilot extension work in [#5](https://github.com/spboyer/sensei/pull/5).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Distribution and Release Status](#distribution-and-release-status)
- [Prerequisites](#prerequisites)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Scoring Criteria](#scoring-criteria)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

### The Problem

Skills without proper frontmatter lead to **skill collision** - agents invoking the wrong skill for a given prompt. Common issues include:

- **No triggers** - Agent doesn't know when to activate the skill
- **Ambiguous scope** - Similar skills compete for the same request
- **Vague descriptions** - Length alone does not establish useful context
- **Token bloat** - Oversized skills waste context window

### The Solution

Sensei implements the "Ralph Wiggum" technique:
1. **Read** - Load the skill's current state and token count
2. **Score** - Evaluate frontmatter compliance
3. **Improve** - Clarify positive scope and test close near-misses
4. **Verify** - Run tests to ensure changes work
5. **Check Tokens** - Analyze token usage, gather suggestions
6. **Summary** - Display before/after with suggestions
7. **Prompt** - Ask user: Commit, Create Issue, or Skip?
8. **Repeat** - Until target score reached

---

## Quick Start

### Using with Copilot CLI

#### Single Skill
```
Run sensei on my-skill-name
```

#### Single Skill (Fast Mode)
```
Run sensei on my-skill-name --fast
```

#### Multiple Skills
```
Run sensei on skill-a, skill-b, skill-c
```

#### All Low-Adherence Skills
```
Run sensei on all Low-adherence skills
```

#### All Skills
```
Run sensei on all skills
```

#### GEPA Mode (Deep Optimization)
```
Run sensei on my-skill-name --gepa
Run sensei score my-skill-name
```

Score-only mode runs without LLM calls.

### External Integration Modes

Published packages and Action tags may lag `main`; see [release status](#distribution-and-release-status)
before using newly merged features.

#### CLI / npx

```bash
npx @spboyer/sensei score .
npx @spboyer/sensei check --root . --config .token-limits.json --strict
```

`--root` resolves paths; `--config` selects limits; `--emit-proof` writes `sensei-audit.md`; `.sensei.json` enables repo policy. Install globally via `npm i -g @spboyer/sensei`.

#### GitHub Action

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: spboyer/sensei@v1.5.0
    with:
      command: check
      root: .
      path: .
      config: .token-limits.json
      strict: 'true'
```

#### Library API

```ts
import { scoreSkillContent } from '@spboyer/sensei/score';
import { parseFrontmatter } from '@spboyer/sensei/parse';
import { checkNameCompliance } from '@spboyer/sensei/checks';

const result = scoreSkillContent(renderedSkillMarkdown, { path: 'skills/my-skill', moduleCount: 2 });
const frontmatter = parseFrontmatter(renderedSkillMarkdown);
checkNameCompliance(frontmatter?.name ?? '');
```

`path` is metadata; `moduleCount` defaults to `0`. `parseFrontmatter` returns
`null` for absent/unclosed delimiters, and optional `errors` for invalid delimited
YAML. Nested metadata and scalar types are preserved; inspect diagnostics before
using typed convenience fields.

---

### Optional Behavioral Evaluation

```bash
npm run tokens -- eval manifest.json --root=/path/to/project --format=json
```

Run from a current Sensei checkout with script dependencies installed.
Compare repeated host observations and output assertions against a baseline.
Unavailable evidence cannot pass; GEPA keyword fitness is not observed activation.
No provider or Python dependency is added. See the
[trusted adapter contract, exit codes, and protocol smoke test](references/evaluation.md).

### GEPA Commands

```bash
uv run scripts/src/gepa/auto_evaluator.py score --skill my-skill --skills-dir skills --tests-dir tests
uv run --with-requirements scripts/src/gepa/requirements.txt scripts/src/gepa/auto_evaluator.py optimize --skill my-skill --skills-dir skills --tests-dir tests
```

Score-only mode needs no GEPA installation. Optimization requires the optional
version in `scripts/src/gepa/requirements.txt` and model access; if that version
is unavailable from your package index, optimization cannot run. GEPA uses
keyword/proxy fitness; it does not observe whether a host loaded a skill.

### Workflow prompt flags (not token CLI options)

| Flag | Description |
|------|-------------|
| `--fast` | Skip tests for faster iteration |
| `--gepa` | Use GEPA evolutionary optimization instead of template-based improvements |
| `--skip-integration` | Skip integration tests (unit + trigger tests only) |

> ⚠️ **Note:** Using `--fast` speeds up the loop significantly but may miss issues. Consider running full tests before final commit.

---

## Distribution and Release Status

As of 2026-10-30, npm `latest` is **1.5.0** and the newest GitHub release is
**v1.5.1**. The YAML/spec refresh, proof/policy updates, source bundles, and
behavioral evaluator are on `main`; do not assume those releases contain them.
For current behavior, clone this repository and run `npm ci --prefix scripts`,
then `npm run tokens -- <command>`. Use `npm run build` for the compiled CLI/library.

[Commit-pinned source bundles](references/distribution.md) contain
`sensei.tar.gz`, `source.json`, and `SHA256SUMS`, retained for 30 days.
They exclude installed dependencies and compiled output, require authenticated
artifact downloads, and do not update downstream dotfiles automatically.
Checksums/provenance are not signed attestations.

## Prerequisites

### Required

1. **Node.js 18+** - For running token management scripts
   ```bash
   node --version
   ```

2. **Git** - For commits and comparisons
   ```bash
   git --version
   ```

### Optional

3. **Test Framework** - Jest, pytest, or similar for trigger tests

4. **Python 3.10+**, **uv**, and **GEPA** - Optional proxy-based optimization

### Installation

#### Option 1: [Copilot CLI skill and source bundles](references/distribution.md)

```bash
mkdir -p "$HOME/.copilot/skills"
git clone https://github.com/spboyer/sensei.git "$HOME/.copilot/skills/sensei"
cd ~/.copilot/skills/sensei/scripts && npm install
```

This is the personal Copilot CLI location, not a guarantee of cloud availability.
Check the [surface/location matrix](references/portability.md). Invoke with:
```
Run sensei on my-skill-name
```

#### Option 2: Install in Project Skills Folder

For project-specific installation:

```bash
mkdir -p .github/skills
git clone https://github.com/spboyer/sensei.git .github/skills/sensei
cd .github/skills/sensei/scripts && npm install
```

#### Option 3: Install the CLI from npm

For CLI/library use:

```bash
npm install --global @spboyer/sensei
sensei check .
npx @spboyer/sensei check .
```

#### Verify Installation

```bash
cd ~/.copilot/skills/sensei && npm run tokens -- check
npx @spboyer/sensei check .
```

---

## How It Works

### The Ralph Loop

Read the skill and tests, count baseline tokens, then validate YAML and portable
fields with `npm run tokens -- score <skill-dir>`. Review optional authoring
suggestions separately. Scaffold missing tests, clarify positive scope, and test
realistic prompts plus close near-misses. GEPA mode optionally proposes changes
using proxy fitness, not observed activation.

Run the target project's tests and `npm run tokens -- check <skill-dir>/SKILL.md`.
Configured token warnings are separate from optimization suggestions. Summarize
changes, test evidence, token deltas, and remaining recommendations. Ask whether
to commit, create an issue, or skip without discarding edits unasked. Repeat until
the advisory target and tests pass, or report a timeout after five iterations.
See the [detailed loop](references/loop.md) for framework-specific guidance.

### Batch Processing

When running on multiple skills:
1. Skills are processed sequentially
2. Each skill goes through the full loop
3. User prompted after each skill: Commit, Create Issue, or Skip
4. Summary report at the end shows all results

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Skills directory | `skills/` or `.github/skills/` | Where SKILL.md files live |
| Tests directory | `tests/` | Where test files live |
| Max iterations | 5 | Per-skill iteration limit before moving on |
| Target score | Medium-High | Advisory workflow target |
| Token soft limit | 500 | SKILL.md target token count |
| Token check limit | `.token-limits.json` | Configurable local threshold; spec recommends <5000 |
| User prompt | After each skill | Commit, Create Issue, or Skip |
| Continue on failure | Yes | Process remaining skills if one fails |

### Custom Paths

Override defaults in your prompt:
```
Run sensei on my-skill with skills in src/ai/skills/ and tests in spec/
```

---

## Scoring Criteria

### Adherence Levels

This is the workflow's authoring rubric, not a computed CLI level. The CLI
reports individual static checks. Do not pad descriptions to hit a minimum length.

| Level | Description | Criteria |
|-------|-------------|----------|
| **Low** | Vague description | Purpose or scope unclear |
| **Medium** | Has trigger keywords | Purpose recognizable, routing ambiguous or noisy |
| **Medium-High** | Has WHEN: or USE FOR: | "WHEN:" (preferred) or "USE FOR:" with ≤60 words |
| **High** | Routing clarity | Medium-High + useful routing guidance (INVOKES/FOR SINGLE OPERATIONS) |

### Rule-Based Checks

1. **Name validation**
   - Lowercase ASCII letters, digits, and hyphens; no leading/trailing or consecutive hyphens
   - Matches directory name
   - ≤ 64 characters

2. **Description length**
   - No specification minimum beyond non-empty; do not pad short useful descriptions
   - Maximum: 1024 characters (spec limit)

3. **Trigger phrases**
   - Contains "WHEN:", "USE FOR:", or "Use this skill when"
   - Lists specific keywords and phrases

4. **Scope boundaries** (evaluate on the target host)
   - Prefer concise positive routing by default
   - Test negative boundaries as near-miss prompts; no mandatory exclusion syntax

5. **Routing clarity** (for High score)
   - Skill type prefix: `**WORKFLOW SKILL**`, `**UTILITY SKILL**`, or `**ANALYSIS SKILL**`
   - `INVOKES:` lists tools/MCP servers the skill calls
   - `FOR SINGLE OPERATIONS:` guidance for when to bypass skill

### Target: Medium-High

For this advisory target, aim for:
- ✅ Clear intent and scope without padding
- ✅ Explicit trigger phrases ("WHEN:" preferred, or "USE FOR:")
- ✅ Description ≤ 60 words
- ✅ SKILL.md < 500 tokens (soft limit, monitored)

### Target: High (with routing)

To reach High, add routing clarity:
- ✅ All Medium-High criteria
- ✅ Skill type prefix (`**WORKFLOW SKILL**`, etc.)
- ✅ `INVOKES:` listing tools/MCP servers used
- ✅ `FOR SINGLE OPERATIONS:` bypass guidance

### MCP Integration Checks

For skills that invoke MCP tools, review this authoring checklist from
[MCP Integration Patterns](references/mcp-integration.md). It is not a computed CLI sub-score:

| Check | Purpose |
|-------|---------|
| **MCP Tools Used table** | Documents tool dependencies in skill body |
| **Prerequisites section** | Lists required tools and permissions |
| **CLI fallback pattern** | Provides fallback when MCP unavailable |
| **Name collision review** | Compare skill names with actual installed tool names |

See [references/mcp-integration.md](references/mcp-integration.md) for detailed patterns.

### Token Budget

- **SKILL.md:** < 500 tokens (soft), < 5000 (hard)
- **references/*.md:** < 2000 tokens each
- Score skill: `npm run tokens -- score [dir]`
- Check with: `npm run tokens -- check`
- Get suggestions: `npm run tokens -- suggest`

---

## Examples

### Before: Low Adherence

```yaml
---
name: pdf-processor
description: 'Process PDF files for various tasks'
---
```

**Problems:**
- No trigger phrases
- Scope is not specific enough to distinguish nearby tasks
- Agent doesn't know when to activate

### After: Medium-High Adherence

```yaml
---
name: pdf-processor
description: "Extract, rotate, merge, and split PDF files. WHEN: \"extract PDF text\", \"rotate PDF pages\", \"merge PDFs\", \"split PDF\", \"PDF to text\"."
---
```

**Improvements:**
- ~160 characters (informative but under limit)
- Clear description of purpose
- Explicit WHEN: trigger phrases with distinctive quoted strings

### After: High Adherence (with routing)

```yaml
---
name: azure-deploy
description: "**WORKFLOW SKILL** - Deploy prepared Azure applications. WHEN: \"deploy to Azure\", \"azd up\", \"publish to Azure\". INVOKES: Azure deployment tools. FOR SINGLE OPERATIONS: use the deployment CLI directly."
---
```

**High score achieved with:**
- Skill type prefix (`**WORKFLOW SKILL**`)
- `INVOKES:` lists MCP tools used
- `FOR SINGLE OPERATIONS:` guides when to bypass skill

### Test Updates

**Before (empty):**
```javascript
const shouldTriggerPrompts = [];
const shouldNotTriggerPrompts = [];
```

**After:**
```javascript
const shouldTriggerPrompts = [
  'Extract text from this PDF',
  'Rotate this PDF 90 degrees',
  'Merge these PDF files together',
  'Split this PDF into pages',
  'Convert PDF to text',
];

const shouldNotTriggerPrompts = [
  'Create a new PDF document',
  'Extract images from this PDF',
  'OCR this scanned document',
  'What is the weather today?',
  'Help me with AWS S3',
];
```

---

## Troubleshooting

### Tests Failing After Improvement
Use realistic in-scope prompts and close near-misses derived from intended scope.
Do not merely mirror literal keywords or add negative frontmatter syntax to satisfy tests.

### Skill Not Reaching Target Score
Separate spec failures (such as description >1024 characters) from optional
recommendations. Investigate overlapping scope with real host observations.

### Rolling Back Changes
```bash
git reset --soft HEAD~1  # Undo last commit
```

---

## Contributing

### Improving the Sensei Skill

1. Edit `SKILL.md` for instruction changes
2. Edit `references/*.md` for documentation changes
3. Test tokens: `npm run tokens -- check`
4. Test on a sample skill before committing

### Adding New Scoring Rules

1. Document the rule in `references/scoring.md`
2. Add examples in `references/examples.md`
3. Update scoring criteria in SKILL.md

### Adding Test Framework Support

1. Create template in `references/test-templates/{framework}.md`
2. Document usage in references/configuration.md

### Waza Trigger Tests

Sensei supports Waza-style trigger accuracy testing. See [the Waza test template](references/test-templates/waza.md).

### Reporting Issues

Open an issue with skill name, starting state, and `git log --oneline -10`.

---

## References

- [Ralph Loop Pattern](references/loop.md) - Sensei's iterative improvement workflow
- [Distribution](references/distribution.md) - Commit-pinned source bundles
- [Behavioral Evaluation](references/evaluation.md) - Trusted adapters and observed evidence
- [Host Portability](references/portability.md) - Installation and runtime differences
- [Anthropic Skills Documentation](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills) - Writing guidance
- [MCP Integration Patterns](references/mcp-integration.md) - MCP integration best practices
- [Waza Trigger Test Template](references/test-templates/waza.md) - Skill trigger accuracy testing
- [GEPA](https://gepa-ai.github.io/gepa/) - Evolutionary optimization for skills
- [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) - For creating new skills from scratch

---

*Sensei - "The path to compliance begins with a single trigger."* 🥋
