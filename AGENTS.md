# AGENTS.md

Instructions for AI coding agents working with this repository.

## Overview

This is **Sensei**, a skill for improving SKILL.md frontmatter compliance. It follows the [Anthropic skill specification](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills).

## Repository Structure

```
sensei/
├── SKILL.md              # Core skill (DO NOT add README-style content here)
├── README.md             # Human documentation
├── AGENTS.md             # This file - agent instructions
├── LICENSE.txt           # MIT license
├── references/           # Progressive disclosure docs (loaded on-demand)
│   ├── scoring.md        # Scoring algorithm details
│   ├── loop.md           # Ralph loop workflow
│   ├── examples.md       # Before/after transformations
│   ├── configuration.md  # Project config patterns
│   └── test-templates/   # Framework-specific test templates
└── scripts/              # Standalone Python tools
    ├── count_tokens.py   # Token counting
    ├── score_skill.py    # Compliance scoring
    ├── scaffold_tests.py # Test generation
    └── requirements.txt  # Python dependencies
```

## Key Conventions

### SKILL.md Format

The `SKILL.md` file follows Anthropic's skill specification:

```yaml
---
name: skill-name          # lowercase, hyphens only
description: |            # Max 1024 chars
  What the skill does.
  USE FOR: trigger phrases.
  DO NOT USE FOR: anti-triggers.
---

# Skill Body (Markdown)
Instructions loaded only after skill triggers.
```

### Token Budgets

| File | Soft Limit | Hard Limit |
|------|------------|------------|
| SKILL.md | 500 tokens | 5000 tokens |
| references/*.md | 1000 tokens | — |

### Scoring Levels

- **Low**: No triggers, short description
- **Medium**: Has triggers, missing anti-triggers
- **Medium-High**: Has both triggers AND anti-triggers ← TARGET
- **High**: Medium-High + compatibility field

## When Modifying This Skill

### DO

- Keep SKILL.md focused on instructions, not documentation
- Use references/ for detailed explanations
- Test scripts after changes: `python scripts/score_skill.py SKILL.md`
- Maintain the frontmatter format with USE FOR / DO NOT USE FOR

### DON'T

- Add README-style content to SKILL.md (use README.md instead)
- Exceed 1024 characters in the description field
- Remove trigger or anti-trigger phrases without replacement
- Add dependencies to scripts without updating requirements.txt

## Testing Changes

```bash
# Validate SKILL.md compliance
python scripts/score_skill.py SKILL.md

# Check token counts
python scripts/count_tokens.py SKILL.md references/*.md

# Test scaffolding (creates files in /tmp)
python scripts/scaffold_tests.py test-skill --tests-dir /tmp/test-output
```

## Common Tasks

### Adding a New Reference File

1. Create `references/new-topic.md`
2. Keep under 1000 tokens
3. Add link in SKILL.md under "Reference Documentation" section

### Updating Scoring Criteria

1. Edit `references/scoring.md`
2. Update `scripts/score_skill.py` to match
3. Test: `python scripts/score_skill.py SKILL.md`

### Adding Test Framework Support

1. Create template in `references/test-templates/{framework}.md`
2. Add generation function in `scripts/scaffold_tests.py`
3. Add to `--framework` choices in argparse

## Commit Message Format

```
type: description

Examples:
- feat: add support for vitest test framework
- fix: handle multi-line descriptions in scorer
- docs: clarify token budget in scoring.md
```

## Dependencies

- Python 3.8+ (for scripts)
- Optional: `tiktoken` for accurate token counting
- No runtime dependencies for the skill itself
