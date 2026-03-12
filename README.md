# Sensei

> "A true master teaches not by telling, but by refining." - The Skill Sensei

Sensei automates the improvement of [Agent Skills](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills) frontmatter compliance using the [Ralph loop pattern](https://github.com/soderlund/ralph) - iteratively improving skills until they reach Medium-High compliance with all tests passing.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
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
- **No anti-triggers** - Agent doesn't know when NOT to use the skill
- **Brief descriptions** - Not enough context for accurate matching
- **Token bloat** - Oversized skills waste context window

### The Solution

Sensei implements the "Ralph Wiggum" technique:
1. **Read** - Load the skill's current state and token count
2. **Score** - Evaluate frontmatter compliance
3. **Improve** - Add triggers, anti-triggers, compatibility
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

### Using Scripts Directly

```bash
# Count tokens in all markdown files
npm run tokens -- count

# Count tokens in specific files
npm run tokens -- count SKILL.md references/*.md

# Check files against token limits
npm run tokens -- check

# Check with strict mode (exits 1 if limits exceeded)
npm run tokens -- check --strict

# Get optimization suggestions
npm run tokens -- suggest

# Score a skill directory (advisory checks)
npm run tokens -- score .

# Compare with previous commit
npm run tokens -- compare HEAD~1
```

### Flags

| Flag | Description |
|------|-------------|
| `--fast` | Skip tests for faster iteration |
| `--skip-integration` | Skip integration tests (unit + trigger tests only) |

> ⚠️ **Note:** Using `--fast` speeds up the loop significantly but may miss issues. Consider running full tests before final commit.

---

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

### Installation

#### Option 1: Install as Copilot CLI Skill (Recommended)

```bash
# Create the skills folder
mkdir -p "$HOME/.copilot/skills"

# Clone to your skills directory
git clone https://github.com/spboyer/sensei.git "$HOME/.copilot/skills/sensei"

# Install token CLI dependencies
cd ~/.copilot/skills/sensei/scripts && npm install
```

The skill is now available in Copilot CLI. Invoke with:
```
Run sensei on my-skill-name
```

#### Option 2: Install in Project Skills Folder

For project-specific installation:

```bash
# From your project root
mkdir -p .github/skills
git clone https://github.com/spboyer/sensei.git .github/skills/sensei

# Install dependencies
cd .github/skills/sensei/scripts && npm install
```

#### Verify Installation

```bash
# Test the token CLI
cd ~/.copilot/skills/sensei  # or your install path
npm run tokens -- check

# Should output token counts for all markdown files
```

---

## How It Works

### The Ralph Loop

```
┌─────────────────────────────────────────────────────────┐
│  START: User invokes "Run sensei on {skill-name}"       │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  1. READ: Load skills/{skill-name}/SKILL.md             │
│           Load tests/{skill-name}/ (if exists)          │
│           Count tokens (baseline for comparison)        │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  2. SCORE: Run rule-based compliance check              │
│     • Check description length (> 150 chars?)           │
│     • Check for trigger phrases ("USE FOR:")            │
│     • Check for anti-triggers ("DO NOT USE FOR:")       │
│     • Check for compatibility field                     │
└─────────────────────┬───────────────────────────────────┘
                      ▼
              ┌───────────────┐
              │ Score >= M-H  │──YES──▶ COMPLETE ✓
              │ AND tests pass│        (next skill)
              └───────┬───────┘
                      │ NO
                      ▼
┌─────────────────────────────────────────────────────────┐
│  3. SCAFFOLD: If tests/{skill-name}/ missing:           │
│     Create tests from references/test-templates/        │
│     Creates prompts.md and framework-specific tests     │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  4. IMPROVE FRONTMATTER:                                │
│     • Add "USE FOR:" with trigger phrases               │
│     • Add "DO NOT USE FOR:" with anti-triggers          │
│     • Add compatibility if applicable                   │
│     • Keep description under 1024 chars                 │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  5. IMPROVE TESTS:                                      │
│     • Update shouldTriggerPrompts (5+ prompts)          │
│     • Update shouldNotTriggerPrompts (5+ prompts)       │
│     • Match prompts to new frontmatter triggers         │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  6. VERIFY: Run tests for the skill                     │
│     • If tests fail → fix and retry                     │
│     • If tests pass → continue                          │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  7. CHECK TOKENS:                                       │
│     npm run tokens count {skill}/SKILL.md               │
│     Verify under 500 token soft limit                   │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  8. SUMMARY: Display before/after comparison            │
│     • Score change (Low → Medium-High)                  │
│     • Token delta (+/- tokens)                          │
│     • Unimplemented suggestions                         │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  9. PROMPT USER: Choose action                          │
│     [C] Commit changes                                  │
│     [I] Create GitHub issue with suggestions            │
│     [S] Skip (discard changes)                          │
└─────────────────────┬───────────────────────────────────┘
                      ▼
              ┌───────────────┐
              │ Iteration < 5 │──YES──▶ Go to step 2
              └───────┬───────┘
                      │ NO
                      ▼
               TIMEOUT (move to next skill)
```

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
| Target score | Medium-High | Minimum compliance level |
| Token soft limit | 500 | SKILL.md target token count |
| Token hard limit | 5000 | SKILL.md maximum token count |
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

| Level | Description | Criteria |
|-------|-------------|----------|
| **Low** | Basic description | No explicit triggers, no anti-triggers, often < 150 chars |
| **Medium** | Has trigger keywords | Description > 150 chars, implicit or explicit trigger phrases |
| **Medium-High** | Has triggers + anti-triggers | "USE FOR:" present AND "DO NOT USE FOR:" present |
| **High** | Full compliance | Medium-High + routing clarity (INVOKES/FOR SINGLE OPERATIONS) |

### Rule-Based Checks

1. **Name validation**
   - Lowercase + hyphens only
   - Matches directory name
   - ≤ 64 characters

2. **Description length**
   - Minimum: 150 characters (effective)
   - Maximum: 1024 characters (spec limit)

3. **Trigger phrases**
   - Contains "USE FOR:", "TRIGGERS:", or "Use this skill when"
   - Lists specific keywords and phrases

4. **Anti-triggers**
   - Contains "DO NOT USE FOR:" or "NOT FOR:"
   - Lists scenarios that should use other skills

5. **Routing clarity** (for High score)
   - Skill type prefix: `**WORKFLOW SKILL**`, `**UTILITY SKILL**`, or `**ANALYSIS SKILL**`
   - `INVOKES:` lists tools/MCP servers the skill calls
   - `FOR SINGLE OPERATIONS:` guidance for when to bypass skill

### Target: Medium-High

To reach Medium-High, a skill must have:
- ✅ Description > 150 characters
- ✅ Explicit trigger phrases ("USE FOR:" or equivalent)
- ✅ Anti-triggers ("DO NOT USE FOR:" or clear scope limitation)
- ✅ SKILL.md < 500 tokens (soft limit, monitored)

### Target: High (with routing)

To reach High, add routing clarity:
- ✅ All Medium-High criteria
- ✅ Skill type prefix (`**WORKFLOW SKILL**`, etc.)
- ✅ `INVOKES:` listing tools/MCP servers used
- ✅ `FOR SINGLE OPERATIONS:` bypass guidance

### MCP Integration Checks

When a skill's description contains `INVOKES:`, Sensei performs additional checks based on the [Skills, Tools & MCP Development Guide](https://github.com/spboyer/azure-mcp-v-skills/blob/main/skills-mcp-development-guide.md):

| Check | Purpose |
|-------|---------|
| **MCP Tools Used table** | Documents tool dependencies in skill body |
| **Prerequisites section** | Lists required tools and permissions |
| **CLI fallback pattern** | Provides fallback when MCP unavailable |
| **Name collision detection** | Warns when skill name matches MCP tool |

**MCP Integration Score (0-4 points):**
- 4/4 = Excellent MCP integration
- 3/4 = Good (minor gaps)
- 2/4 = Fair (needs improvement)
- 0-1/4 = Poor (missing key patterns)

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
- Only 37 characters
- No trigger phrases
- No anti-triggers
- Agent doesn't know when to activate

### After: Medium-High Adherence

```yaml
---
name: pdf-processor
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs", "split PDF",
  "PDF to text", "combine PDF files".
  DO NOT USE FOR: creating new PDFs (use document-creator), extracting
  images (use image-extractor), or OCR on scanned documents (use ocr-processor).
---
```

**Improvements:**
- ~350 characters (informative but under limit)
- Clear description of purpose
- Explicit trigger phrases
- Anti-triggers prevent collision with related skills

### After: High Adherence (with routing)

```yaml
---
name: azure-deploy
description: |
  **WORKFLOW SKILL** - Orchestrates deployment through preparation, validation,
  and execution phases for Azure applications.
  USE FOR: "deploy to Azure", "azd up", "push to Azure", "publish to Azure".
  DO NOT USE FOR: preparing new apps (use azure-prepare), validating before
  deploy (use azure-validate), Azure Functions specifically (use azure-functions).
  INVOKES: azure-azd MCP (up, deploy, provision), azure-deploy MCP (plan_get).
  FOR SINGLE OPERATIONS: Use azure-azd MCP directly for single azd commands.
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
Ensure `shouldTriggerPrompts` match "USE FOR:" phrases and `shouldNotTriggerPrompts` match "DO NOT USE FOR:" scenarios.

### Skill Not Reaching Target Score
Common causes: description > 1024 chars, anti-triggers not using "DO NOT USE FOR:" format, or conflicting triggers with other skills.

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

Sensei supports [Waza](https://github.com/spboyer/waza) for trigger accuracy testing. See `references/test-templates/waza.md`.

### Reporting Issues

Open an issue with skill name, starting state, and `git log --oneline -10`.

---

## References

- [Ralph Loop Pattern](https://github.com/soderlund/ralph) - Original Ralph loop implementation
- [Anthropic Skills Documentation](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills) - Writing guidance
- [Skills, Tools & MCP Development Guide](https://github.com/spboyer/azure-mcp-v-skills/blob/main/skills-mcp-development-guide.md) - MCP integration best practices
- [Waza Testing Framework](https://github.com/spboyer/waza) - Skill trigger accuracy testing
- [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) - For creating new skills from scratch

---

*Sensei - "The path to compliance begins with a single trigger."* 🥋
