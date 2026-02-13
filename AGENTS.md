# AGENTS.md

Instructions for AI coding agents working with this repository.

## Overview

This is **Sensei**, a multi-skill repository for auditing skill frontmatter compliance and MCP server quality. Each skill lives in its own folder under `skills/`, following the [Anthropic skill specification](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills).

## Repository Structure

```
sensei/
├── skills/
│   ├── sensei/               # Skill frontmatter auditor
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── scoring.md
│   │       ├── mcp-integration.md
│   │       ├── loop.md
│   │       ├── examples.md
│   │       ├── configuration.md
│   │       └── test-templates/
│   └── sensei-mcp/           # MCP server quality auditor
│       ├── SKILL.md
│       └── references/
│           ├── mcp-scoring.md
│           ├── mcp-checks-ts.md
│           ├── mcp-checks-python.md
│           ├── mcp-checks-csharp.md
│           ├── mcp-project-structure.md
│           ├── mcp-evaluation-guide.md
│           └── mcp-examples.md
├── anthropic-pr/             # C# guide for Anthropic PR
│   └── csharp_mcp_server.md
├── README.md
├── AGENTS.md
├── LICENSE.txt
├── package.json              # Root package for npm run tokens
├── .token-limits.json
└── scripts/                  # TypeScript token management tools
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    └── src/tokens/
        ├── cli.ts
        └── commands/
            ├── types.ts
            ├── utils.ts
            ├── count.ts
            ├── check.ts
            ├── suggest.ts
            └── compare.ts
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

### MCP Integration (when INVOKES present)

Skills that invoke MCP tools get additional checks:
- **MCP Tools Used table** - Documents tool dependencies
- **Prerequisites section** - Lists required tools
- **CLI fallback pattern** - Fallback when MCP unavailable
- **Name collision detection** - Warns when skill name matches MCP tool

See `skills/sensei/references/mcp-integration.md` for patterns.

## When Modifying This Skill

### DO

- Keep SKILL.md focused on instructions, not documentation
- Use each skill's references/ for detailed explanations
- Run `npm run tokens -- check` after changes to verify limits
- Maintain the frontmatter format with USE FOR / DO NOT USE FOR
- Add routing clarity (INVOKES/FOR SINGLE OPERATIONS) for High score
- Use skill type prefixes when appropriate

### DON'T

- Add README-style content to SKILL.md (use README.md instead)
- Exceed 1024 characters in the description field
- Remove trigger or anti-trigger phrases without replacement
- Omit INVOKES when skill calls MCP tools or other skills
- Embed CLI commands without MCP option when MCP tools exist

## Testing Changes

```bash
# Install dependencies (first time only)
cd scripts && npm install && cd ..

# Check all files against token limits
npm run tokens -- check

# Count tokens in specific files
npm run tokens -- count skills/sensei/SKILL.md skills/sensei/references/*.md

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

1. Create file in the appropriate `skills/{skill-name}/references/` folder
2. Run `npm run tokens -- check` to verify limits
3. Add link in SKILL.md under "Reference Documentation" section

### Updating Token Limits

Edit `.token-limits.json`:
```json
{
  "defaults": {
    "SKILL.md": 5000,
    "references/*.md": 2000,
    "skills/*/references/*.md": 2000,
    "*.md": 4000
  },
  "overrides": {
    "README.md": 4000
  }
}
```

### Adding Test Framework Support

1. Create template in `skills/sensei/references/test-templates/{framework}.md`
2. Document usage in `skills/sensei/references/configuration.md`

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
