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
# Score a skill
python scripts/score_skill.py skills/my-skill/SKILL.md

# Count tokens
python scripts/count_tokens.py skills/my-skill/SKILL.md

# Scaffold tests
python scripts/scaffold_tests.py my-skill --skills-dir skills/ --tests-dir tests/
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

1. **Python 3.8+** - For running scripts
   ```bash
   python3 --version
   ```

2. **Git** - For commits
   ```bash
   git --version
   ```

### Optional

3. **tiktoken** - For accurate token counting
   ```bash
   pip install tiktoken
   ```

4. **Test Framework** - Jest, pytest, or similar for trigger tests

### Installation

```bash
# Clone the skill
git clone https://github.com/spboyer/sensei.git

# Install optional dependencies
cd sensei/scripts
pip install -r requirements.txt
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
│     python scripts/scaffold_tests.py {skill-name}       │
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
│     python scripts/count_tokens.py {skill}/SKILL.md     │
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
| **High** | Full compliance | Triggers + anti-triggers + compatibility field |

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

5. **Compatibility** (optional for Medium-High)
   - Lists required tools/frameworks
   - Documents prerequisites

### Target: Medium-High

To reach Medium-High, a skill must have:
- ✅ Description > 150 characters
- ✅ Explicit trigger phrases ("USE FOR:" or equivalent)
- ✅ Anti-triggers ("DO NOT USE FOR:" or clear scope limitation)
- ✅ SKILL.md < 500 tokens (soft limit, monitored)

### Token Budget

- **SKILL.md:** < 500 tokens (soft), < 5000 (hard)
- **references/*.md:** < 1000 tokens each
- Check with: `python scripts/count_tokens.py skills/{skill}/SKILL.md`

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

**Symptom:** Tests fail after frontmatter changes

**Solution:**
1. Check that `shouldTriggerPrompts` match the new trigger phrases
2. Check that `shouldNotTriggerPrompts` match the new anti-triggers
3. Run tests manually to see specific failures:
   ```bash
   # Jest
   npm test -- --testPathPattern={skill-name} --verbose
   
   # pytest
   pytest tests/{skill-name}/ -v
   ```

### Skill Not Reaching Target Score

**Symptom:** Ralph loops 5 times without reaching Medium-High

**Possible causes:**
1. Description too long (> 1024 chars) - trim content
2. Anti-triggers not in recognized format - use "DO NOT USE FOR:"
3. Conflicting triggers with other skills - make more specific

### Rolling Back Changes

```bash
# Undo last commit
git reset --soft HEAD~1

# Undo all sensei commits for a skill
git log --oneline | grep "sensei: improve {skill-name}" | head -5
git reset --hard {commit-before-sensei}
```

### Viewing Progress

```bash
# See all sensei improvements
git log --oneline --grep="sensei:"

# See changes to a specific skill
git log --oneline -p skills/{skill-name}/SKILL.md
```

---

## Contributing

### Improving the Sensei Skill

1. Edit `SKILL.md` for instruction changes
2. Edit `references/*.md` for documentation changes
3. Test scripts: `python scripts/score_skill.py SKILL.md`
4. Test on a sample skill before committing

### Adding New Scoring Rules

1. Document the rule in `references/scoring.md`
2. Add examples in `references/examples.md`
3. Update `scripts/score_skill.py` to implement the check

### Adding Test Framework Support

1. Create template in `references/test-templates/{framework}.md`
2. Add generation function in `scripts/scaffold_tests.py`
3. Add to `--framework` choices in argparse

### Reporting Issues

If Sensei produces unexpected results:
1. Note the skill name and starting state
2. Capture the commit history: `git log --oneline -10`
3. Open an issue with reproduction steps

---

## References

- [Ralph Loop Pattern](https://github.com/soderlund/ralph) - Original Ralph loop implementation
- [Anthropic Skills Documentation](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills) - Writing guidance
- [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) - For creating new skills from scratch

---

*Sensei - "The path to compliance begins with a single trigger."* 🥋
