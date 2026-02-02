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
├── package.json          # Root package for npm run tokens
├── .token-limits.json    # Custom token limits configuration
├── references/           # Progressive disclosure docs (loaded on-demand)
│   ├── scoring.md        # Scoring algorithm details
│   ├── loop.md           # Ralph loop workflow
│   ├── examples.md       # Before/after transformations
│   ├── configuration.md  # Project config patterns
│   └── test-templates/   # Framework-specific test templates
└── scripts/              # TypeScript token management tools
    ├── package.json      # Dependencies (tsx, vitest, typescript)
    ├── tsconfig.json
    ├── vitest.config.ts
    └── src/tokens/
        ├── cli.ts        # CLI entry point
        └── commands/
            ├── types.ts  # Interfaces, constants, utilities
            ├── utils.ts  # Config loading, file discovery
            ├── count.ts  # Token counting
            ├── check.ts  # Limit validation
            ├── suggest.ts # Optimization suggestions
            └── compare.ts # Git-based comparison
```

## Key Conventions

### SKILL.md Format

The `SKILL.md` file follows Anthropic's skill specification:

```yaml
---
name: skill-name          # lowercase, hyphens only
description: |            # Max 1024 chars
  **WORKFLOW SKILL** - What the skill does.
  USE FOR: trigger phrases.
  DO NOT USE FOR: anti-triggers.
  INVOKES: tools/MCP servers used.
  FOR SINGLE OPERATIONS: when to bypass.
---

# Skill Body (Markdown)
Instructions loaded only after skill triggers.
```

### Skill Type Prefixes

| Prefix | When to Use |
|--------|-------------|
| `**WORKFLOW SKILL**` | Multi-step orchestration, decisions |
| `**UTILITY SKILL**` | Single-purpose helper |
| `**ANALYSIS SKILL**` | Read-only analysis/reporting |

### Token Budgets

| File | Soft Limit | Hard Limit |
|------|------------|------------|
| SKILL.md | 500 tokens | 5000 tokens |
| references/*.md | 2000 tokens | — |

### Scoring Levels

- **Low**: No triggers, short description
- **Medium**: Has triggers, missing anti-triggers
- **Medium-High**: Has both triggers AND anti-triggers ← TARGET
- **High**: Medium-High + routing clarity (INVOKES/FOR SINGLE OPERATIONS)

## When Modifying This Skill

### DO

- Keep SKILL.md focused on instructions, not documentation
- Use references/ for detailed explanations
- Run `npm run tokens -- check` after changes to verify limits
- Maintain the frontmatter format with USE FOR / DO NOT USE FOR
- Add routing clarity (INVOKES/FOR SINGLE OPERATIONS) for High score
- Use skill type prefixes when appropriate

### DON'T

- Add README-style content to SKILL.md (use README.md instead)
- Exceed 1024 characters in the description field
- Remove trigger or anti-trigger phrases without replacement
- Omit INVOKES when skill calls MCP tools or other skills

## Testing Changes

```bash
# Install dependencies (first time only)
cd scripts && npm install && cd ..

# Check all files against token limits
npm run tokens -- check

# Count tokens in specific files
npm run tokens -- count SKILL.md references/*.md

# Get optimization suggestions
npm run tokens -- suggest

# Compare with previous commit
npm run tokens -- compare HEAD~1

# Run unit tests
cd scripts && npm test
```

## Token CLI Reference

```bash
npm run tokens -- count [paths...]     # Count tokens in markdown files
npm run tokens -- check [paths...]     # Check files against token limits
npm run tokens -- suggest [paths...]   # Get optimization suggestions
npm run tokens -- compare [refs...]    # Compare tokens between git refs

# Options
--format=json       # Output as JSON instead of table
--strict            # Exit with error if limits exceeded (check only)
--sort=tokens       # Sort by token count (count only)
--min-tokens=100    # Filter files below threshold (count only)
```

## Common Tasks

### Adding a New Reference File

1. Create `references/new-topic.md`
2. Run `npm run tokens -- check references/new-topic.md` to verify limits
3. Add link in SKILL.md under "Reference Documentation" section

### Updating Token Limits

Edit `.token-limits.json`:
```json
{
  "defaults": {
    "SKILL.md": 5000,
    "references/*.md": 2000,
    "*.md": 4000
  },
  "overrides": {
    "README.md": 4000
  }
}
```

### Adding Test Framework Support

1. Create template in `references/test-templates/{framework}.md`
2. Document usage in `references/configuration.md`

## Commit Message Format

```
type: description

Examples:
- feat: add support for vitest test framework
- fix: handle multi-line descriptions in scorer
- docs: clarify token budget in scoring.md
```

## Dependencies

- Node.js 18+ (for token management scripts)
- npm (for running scripts)
- No runtime dependencies for the skill itself
