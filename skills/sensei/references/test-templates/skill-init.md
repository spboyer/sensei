# Skill Init Template

Template for initializing a new skill with proper frontmatter structure.

## SKILL.md Template

### Medium-High Adherence (Minimum Target)

```yaml
---
name: {skill-name}
description: |
  {Brief description of what the skill does - 1-2 sentences}.
  USE FOR: "{trigger-1}", "{trigger-2}", "{trigger-3}", "{trigger-4}", "{trigger-5}".
  DO NOT USE FOR: {anti-trigger-1} (use {other-skill-1}), {anti-trigger-2} (use {other-skill-2}).
---

# {Skill Title}

{Skill instructions go here}
```

### High Adherence (With Routing Clarity)

```yaml
---
name: {skill-name}
description: |
  **{SKILL-TYPE} SKILL** - {Brief description of what the skill does - 1-2 sentences}.
  USE FOR: "{trigger-1}", "{trigger-2}", "{trigger-3}", "{trigger-4}", "{trigger-5}".
  DO NOT USE FOR: {anti-trigger-1} (use {other-skill-1}), {anti-trigger-2} (use {other-skill-2}).
  INVOKES: {mcp-tool-1} ({commands}), {mcp-tool-2} ({commands}).
  FOR SINGLE OPERATIONS: Use {mcp-tool} directly for {single-operation-type}.
---

# {Skill Title}

{Skill instructions go here}
```

## Skill Types

Choose the appropriate prefix:

| Type | Prefix | When to Use |
|------|--------|-------------|
| Workflow | `**WORKFLOW SKILL**` | Multi-step orchestration, decisions, code generation |
| Utility | `**UTILITY SKILL**` | Single-purpose helper, transformation, validation |
| Analysis | `**ANALYSIS SKILL**` | Read-only analysis, reporting, diagnostics |

## Directory Structure

```
skills/{skill-name}/
├── SKILL.md              # Core skill file (required)
└── references/           # Optional detailed docs
    ├── examples.md
    ├── configuration.md
    └── troubleshooting.md

tests/{skill-name}/
├── triggers.test.ts      # or test_triggers.py
├── routing.test.ts       # for High adherence skills
└── prompts.md
```

## Checklist

### Medium-High Adherence
- [ ] Name is lowercase with hyphens only
- [ ] Description > 150 characters
- [ ] Has "USE FOR:" with 5+ trigger phrases
- [ ] Has "DO NOT USE FOR:" with alternatives
- [ ] SKILL.md < 500 tokens (soft limit)
- [ ] Test file created with trigger/anti-trigger prompts

### High Adherence (add to above)
- [ ] Has skill type prefix (`**WORKFLOW SKILL**`, etc.)
- [ ] Has "INVOKES:" listing MCP tools used
- [ ] Has "FOR SINGLE OPERATIONS:" bypass guidance
- [ ] Routing test file created

## Quick Init Commands

### Create skill structure
```bash
mkdir -p skills/{skill-name}/references tests/{skill-name}
touch skills/{skill-name}/SKILL.md
touch tests/{skill-name}/prompts.md
```

### Validate after creation
```bash
npm run tokens -- count skills/{skill-name}/SKILL.md
npm run tokens -- check skills/{skill-name}/
```

## Examples by Type

### Workflow Skill Init

```yaml
---
name: azure-deploy
description: |
  **WORKFLOW SKILL** - Orchestrates deployment through preparation, validation,
  and execution phases for Azure applications.
  USE FOR: "deploy to Azure", "azd up", "push to Azure", "publish to Azure",
  "ship to production", "release to Azure".
  DO NOT USE FOR: preparing new apps (use azure-prepare), validating before
  deploy (use azure-validate), Azure Functions specifically (use azure-functions).
  INVOKES: azure-azd MCP (up, deploy, provision), azure-deploy MCP (plan_get).
  FOR SINGLE OPERATIONS: Use azure-azd MCP directly for single azd commands.
---
```

### Utility Skill Init

```yaml
---
name: token-counter
description: |
  **UTILITY SKILL** - Count tokens in markdown files and validate against limits.
  USE FOR: "count tokens", "check token limit", "token budget", "how many tokens",
  "validate skill size", "check file tokens".
  DO NOT USE FOR: improving skills (use sensei), creating skills (use skill-creator),
  editing markdown content (use markdown-editor).
  INVOKES: tiktoken library, file system operations.
  FOR SINGLE OPERATIONS: Run `npm run tokens count <file>` directly.
---
```

### Analysis Skill Init

```yaml
---
name: cost-analyzer
description: |
  **ANALYSIS SKILL** - Analyze Azure resource costs and identify optimization opportunities.
  USE FOR: "analyze costs", "cost report", "spending analysis", "find expensive resources",
  "optimize Azure costs", "reduce spending".
  DO NOT USE FOR: provisioning resources (use azure-deploy), setting budgets (use azure-portal),
  real-time monitoring (use azure-monitor).
  INVOKES: azure-cost MCP (get_costs), azure-advisor MCP (get_recommendations).
  FOR SINGLE OPERATIONS: Use azure-cost MCP directly for simple cost queries.
---
```

## Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{skill-name}` | Lowercase name with hyphens | `azure-deploy` |
| `{SKILL-TYPE}` | WORKFLOW, UTILITY, or ANALYSIS | `WORKFLOW` |
| `{trigger-N}` | Phrases from USE FOR | `"deploy to Azure"` |
| `{anti-trigger-N}` | Scenarios from DO NOT USE FOR | `preparing new apps` |
| `{other-skill-N}` | Alternative skill to use | `azure-prepare` |
| `{mcp-tool-N}` | MCP tool from INVOKES | `azure-azd` |
| `{commands}` | Tool commands used | `up, deploy, provision` |
