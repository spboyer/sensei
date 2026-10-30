# MCP Integration Patterns

Best practices for skills that integrate with MCP tools.

## The Hybrid Pattern

Skills orchestrate the **how**. MCP Tools execute the **what**.

```
SKILL orchestrates → MCP executes → SKILL interprets → User output
```

## Authoring Checklist for MCP-Integrated Skills

This is workflow guidance, not a computed CLI sub-score or a portable-spec
requirement. Tool names below are illustrative: discover the actual server
schema and verify permissions before use. Do not install tools, connect services,
or expand access merely because a skill lists them.

When a skill's description includes `INVOKES:` referencing MCP tools, add these sections:

### 1. MCP Tools Used Table

Document every MCP tool invocation:

```markdown
## MCP Tools Used

| Step | Tool | Command | Purpose |
|------|------|---------|---------|
| 1 | `azure-get_azure_bestpractices` | `get_bestpractices` | Load guidance |
| 3 | `azure-deploy` | `plan_get` | Analyze workspace |
| 5 | `azure-azd` | `up` | Execute deployment |
```

### 2. Prerequisites Section

List required tools and permissions:

```markdown
## Prerequisites

- **Required MCP tools:** `azure-xxx`, `azure-yyy`
- **Required permissions:** Contributor role on subscription
- **Setup:** Verify the server is configured and authenticated on the target host
```

### 3. CLI Fallback Pattern

Document what to do when MCP is unavailable:

````markdown
**MCP Server (Preferred):**
Use `azure-keyvault` MCP with command `keyvault_secret_get`.

**CLI Fallback (if MCP unavailable):**
```bash
az keyvault secret show --vault-name $VAULT --name $SECRET
```
````

## Skill-Tool Routing Clarity

### Avoiding Collisions

When skill names match MCP tool names, add explicit routing:

```yaml
# In skill description:
INVOKES: `azure-azd` MCP for deployment commands.
FOR SINGLE OPERATIONS: Use `azure-azd` MCP directly for single azd commands.
```

### Collision Detection

During authoring review, compare skill names with actual installed tool names.
Illustrative overlap candidates include:

| MCP Tool | Potential Skill Collision |
|----------|--------------------------|
| `azure-deploy` | `azure-deploy` skill |
| `azure-functions` | `azure-functions` skill |
| `azure-storage` | `azure-storage` skill |
| `azure-keyvault` | `azure-keyvault` skill |
| `azure-monitor` | `azure-monitor` skill |

**Resolution:** Ensure skill description explicitly states when to use skill vs MCP tool.

## Review Checklist

For skills that invoke tools, review these items manually. The static CLI does
not validate installed MCP servers, compute a 0-4 integration score, or assign
a High grade.

| Check | Impact |
|-------|--------|
| Has MCP Tools Used table | Documents actual dependencies |
| Has Prerequisites section | Recommended |
| Has CLI fallback | Recommended |
| Clear skill/tool routing | Test on the intended host |

## Anti-Patterns

### ❌ Embedding CLI Commands Without MCP Option

```markdown
## Bad: CLI only
Run: az storage account list --subscription $SUB
```

### ✅ MCP First with CLI Fallback

```markdown
## Good: MCP preferred
**Using MCP:**
Invoke `azure-storage` with command `storage_account_list`.

**CLI Fallback:**
az storage account list --subscription $SUB
```

### ❌ Duplicating Patterns in Skill

```markdown
## Bad: Embedding azure.yaml patterns
services:
  web:
    host: staticwebapp
```

### ✅ Invoking MCP for Patterns

```markdown
## Good: Single source of truth
Call `azure-get_azure_bestpractices` with:
- resource: "static-web-app"
- action: "azure-yaml"
```

## Reference

- [MCP Integration Patterns](mcp-integration.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification/latest)
- [Waza Trigger Test Template](test-templates/waza.md)
