# MCP Integration Patterns

Best practices for skills that integrate with MCP tools, based on the [Skills, Tools & MCP Development Guide](https://github.com/spboyer/azure-mcp-v-skills/blob/main/skills-mcp-development-guide.md).

## Core Principle: Teach Domain Knowledge, Not Tool Usage

Skills should provide what the agent *can't* infer from MCP tool descriptions alone:
**gotchas, priority orderings, anti-patterns, and domain context.**

The agent can reason about tool parameters from MCP schemas — step-by-step
tool call recipes duplicate those schemas and break when APIs change.

```
SKILL provides domain knowledge → Agent reasons about tools → MCP executes
```

## Sections for MCP-Integrated Skills

When a skill's description includes `INVOKES:` referencing MCP tools, add these sections:

### 1. Prerequisites Section (Required)

List required tools and permissions:

```markdown
## Prerequisites

- **Required MCP tools:** `azure-xxx`, `azure-yyy`
- **Required permissions:** Contributor role on subscription
- **Enable MCP:** Run `/mcp add azure` if not enabled
```

### 2. MCP Tools Used Table (Optional)

A tools table is **optional**. When included, document dependencies at the
**category level**, not per-parameter recipes. Detailed step-by-step tool call
sequences are fragile — they duplicate what's already in the MCP tool schema
and break when APIs change.

```markdown
## MCP Tools Used

| Tool Category | Purpose |
|---------------|---------|
| `azure-get_azure_bestpractices` | Load Azure guidance before generating code |
| `azure-deploy` | Analyze workspace and plan deployment |
| `azure-azd` | Execute azd deployment commands |
```

> **Avoid:** `Call tool X with command Y, param Z = value` recipes.
> **Prefer:** Domain knowledge the agent can't get from tool descriptions
> (e.g., "Always call best-practices *before* generating IaC").

### 3. CLI Fallback Pattern (Optional)

Document what to do when MCP is unavailable:

```markdown
**CLI Fallback (if MCP unavailable):**
```bash
az keyvault secret show --vault-name $VAULT --name $SECRET
```
```

## Skill-Tool Routing Clarity

### Avoiding Collisions

When skill names match MCP tool names, add explicit routing:

```yaml
# In skill description:
INVOKES: `azure-azd` MCP for deployment commands.
FOR SINGLE OPERATIONS: Use `azure-azd` MCP directly for single azd commands.
```

### Collision Detection

Sensei checks for these known MCP tool names:

| MCP Tool | Potential Skill Collision |
|----------|--------------------------|
| `azure-deploy` | `azure-deploy` skill |
| `azure-functions` | `azure-functions` skill |
| `azure-storage` | `azure-storage` skill |
| `azure-keyvault` | `azure-keyvault` skill |
| `azure-monitor` | `azure-monitor` skill |

**Resolution:** Ensure skill description explicitly states when to use skill vs MCP tool.

## Scoring Impact

Skills with `INVOKES:` in description get additional checks:

| Check | Impact |
|-------|--------|
| Has `INVOKES:` in frontmatter | Required for High score |
| Has Prerequisites section | Required for High score |
| No name collision (or resolved) | Required for High score |
| Has MCP Tools Used table | Recommended (category-level) |
| Has CLI fallback | Optional |

## Anti-Patterns

### ❌ Step-by-Step Tool Call Recipes

```markdown
## Bad: Duplicates MCP schema, breaks when API changes
Step 1: Call `azure-deploy` with command `plan_get`, param `appType=web`.
Step 2: Call `azure-azd` with command `up`, param `env=prod`.
```

### ✅ Domain Knowledge the Agent Can't Infer

```markdown
## Good: Teaches ordering/gotchas, lets agent reason about tool params
Always fetch best-practices BEFORE generating IaC — the guidance
affects which Azure services to select.
Deploy staging before production. Validate with `azd env list` first.
```

### ❌ Embedding Patterns Available via MCP

```markdown
## Bad: Hardcoded patterns that MCP tools already provide
services:
  web:
    host: staticwebapp
```

### ✅ Pointing to the Source of Truth

```markdown
## Good: References tool category, not specific parameters
Use `azure-get_azure_bestpractices` MCP to load current
Azure patterns — don't hardcode them in the skill.
```

## Reference

- [Full MCP Development Guide](https://github.com/spboyer/azure-mcp-v-skills/blob/main/skills-mcp-development-guide.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification/latest)
- [Waza Testing Framework](https://github.com/spboyer/waza)
