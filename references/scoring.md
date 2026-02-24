# Scoring Criteria

Detailed scoring criteria for evaluating skill frontmatter compliance.

Structural validation follows the [Agent Skills specification](https://agentskills.io/specification) ([reference library](https://github.com/agentskills/agentskills/tree/main/skills-ref)). Advisory checks are Sensei-original, informed by SkillsBench research.

## Adherence Levels

### Low Adherence

A skill is **Low** if:
- Description < 150 characters
- No explicit trigger phrases
- No anti-triggers

```yaml
# Example: Too brief (45 chars)
description: 'Process PDF files for various tasks'
```

### Medium Adherence

A skill is **Medium** if:
- Description >= 150 characters
- Has implicit or explicit trigger keywords
- Missing anti-triggers

```yaml
# Example: Has triggers, no anti-triggers
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs".
```

### Medium-High Adherence (Target)

A skill is **Medium-High** if:
- Description >= 150 characters
- Has explicit "USE FOR:" trigger phrases
- Has "DO NOT USE FOR:" anti-triggers

```yaml
# Example: Complete triggers and anti-triggers
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs".
  DO NOT USE FOR: creating PDFs (use document-creator).
```

### High Adherence

A skill is **High** if:
- All Medium-High criteria
- Has skill type prefix (`**WORKFLOW SKILL**`, etc.)
- Has routing clarity (`INVOKES:` and/or `FOR SINGLE OPERATIONS:`)

```yaml
# Example: Full compliance with routing
description: |
  **WORKFLOW SKILL** - Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs".
  DO NOT USE FOR: creating PDFs (use document-creator).
  INVOKES: pdf-tools MCP for extraction, file-system for I/O.
  FOR SINGLE OPERATIONS: Use pdf-tools MCP directly for simple extractions.
```

## Skill Type Prefixes

Add a prefix to clarify the skill's purpose:

| Prefix | When to Use | Example |
|--------|-------------|---------|
| `**WORKFLOW SKILL**` | Multi-step orchestration, decisions | Deploy, setup, configure |
| `**UTILITY SKILL**` | Single-purpose helper | Format, convert, validate |
| `**ANALYSIS SKILL**` | Read-only analysis/reporting | Audit, review, diagnose |

## Routing Clarity

### INVOKES

Lists tools, MCP servers, or other skills this skill calls during execution:

```yaml
INVOKES: azure-azd (up, deploy), azure-keyvault (secret_get), git commands.
```

### FOR SINGLE OPERATIONS

Guides when to bypass this skill and use tools directly:

```yaml
FOR SINGLE OPERATIONS: Use azure-keyvault MCP directly for single secret lookups.
```

### Why Routing Matters

When MCP tools and skills have overlapping names (e.g., `azure-deploy` skill vs `azure-deploy` MCP tool), routing clarity prevents:
- **Duplicate invocation** - LLM calling both for the same request
- **Wrong path selection** - Using workflow skill for a simple query
- **Skill collision** - Multiple skills triggering for the same prompt

## Spec Compliance Checks (agentskills.io)

These checks are programmatic and run via `npm run tokens -- score`. They validate structural conformance to the [Agent Skills specification](https://agentskills.io/specification).

| Check | What it validates | Spec rule |
|-------|-------------------|-----------|
| `spec-frontmatter` | YAML frontmatter exists, `name` and `description` present | Required fields |
| `spec-allowed-fields` | No unknown fields (only `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`, `user-invocable`, `disable-model-invocation`) | Field allowlist |
| `spec-name` | Lowercase, ≤64 chars, no leading/trailing `-`, no `--`, alphanumeric + hyphens only | Name constraints |
| `spec-dir-match` | Directory name matches skill `name` field | Directory = name |
| `spec-description` | Non-empty, ≤1024 characters | Description constraints |
| `spec-compatibility` | If present, ≤500 characters | Compatibility constraints |
| `spec-license` | Recommends adding `license` field | Optional but strongly recommended |
| `spec-version` | Recommends adding `metadata.version` | Optional but strongly recommended |
| `spec-user-invocable` | If present, must be boolean (`true`/`false`) | Copilot CLI extension |
| `spec-disable-model-invocation` | If present, must be boolean (`true`/`false`) | Copilot CLI extension |
| `spec-allowed-tools` | If present, must be non-empty comma-separated list | Copilot CLI extension |
| `reference-only-pattern` | Detects `user-invocable=false` + `disable-model-invocation=true` | Advisory (Copilot CLI) |

## Rule-Based Checks

### 1. Name Validation

| Check | Pass | Fail |
|-------|------|------|
| Lowercase only | `pdf-processor` | `PDF-Processor` |
| Hyphens allowed | `my-skill-name` | `my_skill_name` |
| Length ≤ 64 | 20 chars ✓ | 65+ chars ✗ |

### 2. Description Length

| Score Impact | Length |
|--------------|--------|
| Low | < 150 chars |
| Acceptable | 150-500 chars |
| Ideal | 200-400 chars |
| Max | 1024 chars |

### 3. Trigger Detection

**Positive indicators** (case-insensitive):
- `USE FOR:`
- `USE THIS SKILL`
- `TRIGGERS:`
- `Trigger phrases include`

**Scoring:**
- None → Low
- Implicit keywords → Medium
- Explicit "USE FOR:" → Medium-High

### 4. Anti-Trigger Detection

**Positive indicators** (case-insensitive):
- `DO NOT USE FOR:`
- `NOT FOR:`
- `Don't use this skill`
- `Instead use`

**Scoring:**
- None → caps at Medium
- Present → enables Medium-High/High

### 5. Routing Clarity (High score)

**Positive indicators** (case-insensitive):
- `INVOKES:`
- `FOR SINGLE OPERATIONS:`
- `**WORKFLOW SKILL**`
- `**UTILITY SKILL**`
- `**ANALYSIS SKILL**`

**Scoring:**
- Present → enables High (with Medium-High criteria met)

### 6. Compatibility Field (Optional)

Optional field documenting:
- Required tools/libraries
- Supported frameworks
- Prerequisites

### Copilot CLI Extension Fields

These fields are defined in the [Copilot agent runtime](https://github.com/github/copilot-agent-runtime/blob/main/src/skills/types.ts) skill frontmatter schema (not part of the agentskills.io spec) and validated by Sensei when present:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `allowed-tools` | string | — | Comma-separated list of auto-allowed tools while skill is active |
| `user-invocable` | boolean | `true` | Whether users can invoke via `/skill-name` |
| `disable-model-invocation` | boolean | `false` | Prevent the model from invoking this skill |

#### Reference-Only Pattern

When `user-invocable: false` AND `disable-model-invocation: true`, the skill becomes a **reference-only file** — loaded from disk but never invoked by user or model. Useful for shared context, configuration, or conventions.

```yaml
---
name: team-conventions
description: "Shared coding conventions for the team."
user-invocable: false
disable-model-invocation: true
---
```

## Scoring Algorithm

```python
def score_skill(skill):
    if len(skill.description) > 1024:
        return "Invalid"  # exceeds spec hard limit
    if len(skill.description) < 150:
        return "Low"
    
    has_triggers = contains_trigger_phrases(skill.description)
    has_anti_triggers = contains_anti_triggers(skill.description)
    has_routing_clarity = contains_routing_patterns(skill.description)
    
    if not has_triggers:
        return "Low"
    if not has_anti_triggers:
        return "Medium"
    if not has_routing_clarity:
        return "Medium-High"
    return "High"

def contains_routing_patterns(description):
    patterns = ['INVOKES:', 'FOR SINGLE OPERATIONS:', 
                '**WORKFLOW SKILL**', '**UTILITY SKILL**', '**ANALYSIS SKILL**']
    return any(p.lower() in description.lower() for p in patterns)
```

## Token Budgets

| File | Soft Limit | Hard Limit |
|------|------------|------------|
| SKILL.md | 500 | 5000 |
| references/*.md | 1000 | - |
| Description field | - | 1024 chars |

## MCP Integration Checks

When a skill's description contains `INVOKES:`, additional checks apply.

### 7. MCP Tools Used Table

Skills invoking MCP tools should document them:

```markdown
## MCP Tools Used

| Step | Tool | Command | Purpose |
|------|------|---------|---------|
```

**Detection:** Look for markdown table with "Tool" and "Command" headers in skill body.

### 8. Prerequisites Section

Skills should list requirements:

```markdown
## Prerequisites

- **Required MCP tools:** `tool-name`
```

**Detection:** Look for "## Prerequisites" or "Required MCP" in skill body.

### 9. CLI Fallback Pattern

MCP-integrated skills should document fallbacks:

```markdown
**CLI Fallback (if MCP unavailable):**
```

**Detection:** Look for "CLI Fallback" or "if MCP unavailable" in skill body.

### 10. Skill-Tool Name Collision

**Warning triggered when:**
- Skill name matches known MCP tool name
- No `FOR SINGLE OPERATIONS:` in description

**Known MCP tool names:**
```
azure-deploy, azure-prepare, azure-validate, azure-functions,
azure-storage, azure-keyvault, azure-monitor, azure-cosmos,
azure-diagnostics, azure-security, azure-observability
```

### MCP Integration Score

When `INVOKES:` present, calculate sub-score:

| Check | Points |
|-------|--------|
| Has MCP Tools Used table | +1 |
| Has Prerequisites section | +1 |
| Has CLI fallback | +1 |
| No unresolved name collision | +1 |

**Score interpretation:**
- 4/4 → Excellent MCP integration
- 3/4 → Good (minor gaps)
- 2/4 → Fair (needs improvement)
- 0-1/4 → Poor (missing key patterns)

See [mcp-integration.md](mcp-integration.md) for detailed patterns.

## Advisory Checks

**Advisory only** — does not change scoring levels.

### 11. Module Count (F5)

Count `references/**/*.md`. 0–1: OK. **2–3: ✅ optimal**. 4+: ⚠️ diminishing returns, consolidate.

### 12. Complexity (F6)

- **Compact** (< 200 tokens, 0–1 refs): good
- **Detailed** (200–500 tokens, 1–3 refs): **optimal**
- **Comprehensive** (> 500 tokens OR 4+ refs): ⚠️ hurts performance

### 13. Negative Delta Risk

16/84 tasks hurt by skills. Flag: over-specified common tasks, conflicting procedures, overlapping skills, excess constraints.

### 14. Procedural Content

Check for action verbs (deploy, configure, build) and workflow words (step, then, pipeline). Flag if declarative only.

### 15. Over-Specificity

Flag hardcoded paths, IPs/ports, magic numbers, test-specific references. Skills must guide task classes.

### Advisory Summary

| # | Detects | Guidance |
|---|---------|----------|
| 11 | Too many modules | 2–3 optimal; 4+ diminishing returns |
| 12 | Over-documentation | Detailed best; comprehensive hurts |
| 13 | Hurting patterns | ~19% of tasks can be hurt by skills |
| 14 | Declarative-only | Procedural > declarative |
| 15 | Instance-specific | Must guide task classes |
