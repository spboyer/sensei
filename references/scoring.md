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
- Description >= 150 characters and ≤ 60 words
- Has explicit trigger phrases via `WHEN:` (preferred) or `USE FOR:`
- Leads with unique action verb + domain in first sentence

> **Note:** `WHEN:` scores higher than `USE FOR:` because quoted trigger phrases are more distinctive for cross-model pattern matching.

```yaml
# Example: Cross-model optimized (preferred)
description: "Extract, rotate, merge, and split PDF files for document processing. WHEN: \"extract PDF text\", \"rotate PDF pages\", \"merge PDFs\", \"split PDF\"."

# Example: Legacy pattern (still accepted)
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs".
```

> ⚠️ **"DO NOT USE FOR:" is actively discouraged.** Anti-trigger clauses introduce the very keywords that cause wrong-skill activation on Claude Sonnet and other models that use fast pattern matching rather than deep negation reasoning. Use positive routing instead.

### High Adherence

A skill is **High** if:
- All Medium-High criteria
- Has skill type prefix (`**WORKFLOW SKILL**`, etc.)
- Has routing clarity (`INVOKES:` and/or `FOR SINGLE OPERATIONS:`)

```yaml
# Example: Full compliance with routing (cross-model optimized)
description: "**WORKFLOW SKILL** — Extract, rotate, merge, and split PDF files. WHEN: \"extract PDF text\", \"rotate PDF pages\", \"merge PDFs\", \"split PDF\". INVOKES: pdf-tools MCP for extraction, file-system for I/O. FOR SINGLE OPERATIONS: Use pdf-tools MCP directly for simple extractions."
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
| `spec-allowed-fields` | No unknown fields (only `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`) | Field allowlist |
| `spec-name` | Lowercase, ≤64 chars, no leading/trailing `-`, no `--`, alphanumeric + hyphens only | Name constraints |
| `spec-dir-match` | Directory name matches skill `name` field | Directory = name |
| `spec-description` | Non-empty, ≤1024 characters | Description constraints |
| `spec-compatibility` | If present, ≤500 characters | Compatibility constraints |
| `spec-license` | Recommends adding `license` field | Optional but strongly recommended |
| `spec-version` | Recommends adding `metadata.version` | Optional but strongly recommended |
| `spec-security` | No XML angle brackets (`< >`) in frontmatter; name does not use reserved prefixes (`claude-`, `anthropic-`) | Security restrictions ([Anthropic guide](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf), p31) |

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
- `WHEN:` (preferred — scores higher)
- `USE FOR:`
- `USE THIS SKILL`
- `TRIGGERS:`
- `Trigger phrases include`

**Scoring:**
- None → Low
- Implicit keywords → Medium
- Explicit "WHEN:" → Medium-High (preferred)
- Explicit "USE FOR:" → Medium-High (accepted)

### 4. Anti-Trigger Detection

> ⚠️ **Context-dependent risk.** Anti-trigger clauses like "DO NOT USE FOR:" carry different risk levels depending on the skill set size and deployment context.

**Risk assessment by context:**

| Context | Risk Level | Guidance |
|---------|------------|----------|
| Single skill or small set (1-5 skills) with clear domain boundaries | Low | Anti-triggers are low-risk — domain boundaries are obvious |
| Medium skill set (5-15 skills) with some overlap | Moderate | Anti-trigger keywords start competing with other skills' triggers |
| Large skill set (15+ skills) with overlapping domains | **High** | Keyword contamination is measurable — negative keywords become activation keywords on fast-pattern-matching models |

**Why large skill sets are risky:** On Claude Sonnet and similar models that use fast pattern matching (first ~20 words), `DO NOT USE FOR: Function apps` causes Sonnet to key on "Function apps" and **activate** the skill for Functions queries. This was empirically demonstrated across 24 Azure skills ([analysis](https://gist.github.com/kvenkatrajan/52e6e77f5560ca30640490b4cc65d109)). Anthropic's own published skills confirm this pattern — 4 of 5 skills in `anthropics/skills` use positive-only routing (pdf, frontend-design, skill-creator, webapp-testing); only docx uses "Do NOT use for."

> **Note:** Anthropic's [Complete Guide to Building Skills](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) recommends negative triggers for overtriggering (p25). This is reasonable for small, isolated skill sets. For multi-skill production environments, Sensei recommends positive routing with `WHEN:` and distinctive quoted phrases as the cross-model-safe alternative.

**Legacy indicators** (still detected, trigger context-dependent warning):
- `DO NOT USE FOR:`
- `NOT FOR:`
- `Don't use this skill`
- `Instead use`

**Scoring:**
- Present in large skill sets → emits cross-model compatibility warning
- Present in small skill sets → informational note only
- Absent → no penalty (preferred for cross-model compatibility)

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

## Scoring Algorithm

```python
def score_skill(skill):
    if len(skill.description) > 1024:
        return "Invalid"  # exceeds spec hard limit
    if len(skill.description) < 150:
        return "Low"
    
    has_triggers = contains_trigger_phrases(skill.description)
    has_routing_clarity = contains_routing_patterns(skill.description)
    
    if not has_triggers:
        return "Low"
    if word_count(skill.description) > 60:
        return "Medium"  # too dense for cross-model reliability
    # Note: "DO NOT USE FOR:" is no longer required for Medium-High
    if not has_routing_clarity:
        return "Medium-High"
    return "High"

def contains_trigger_phrases(description):
    # WHEN: preferred (scores higher), USE FOR: accepted
    patterns = ['WHEN:', 'USE FOR:', 'USE THIS SKILL', 'TRIGGERS:']
    return any(p.lower() in description.lower() for p in patterns)

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

> **Units note:** Sensei measures in **tokens** (cl100k_base tokenizer), not words. Anthropic's [Complete Guide](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) recommends "under 5,000 words" for SKILL.md, while the [Agent Skills spec](https://agentskills.io/specification) recommends "< 5000 tokens" and "under 500 lines." Sensei uses the spec's token-based limits. As a rough conversion: 5000 tokens ≈ 3,750 words. The spec's token budget is stricter, which aligns with SkillsBench evidence that concise skills outperform comprehensive ones.

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

### 16. Cross-Model Description Density

Checks description for cross-model compatibility issues that cause unreliable invocation on Claude Sonnet and similar models.

**Sub-checks:**
- **Word count** — Descriptions over 60 words dilute attention across skill selection
- **Anti-trigger contamination** — "DO NOT USE FOR:" clauses introduce competing keywords (risk scales with skill set size — see check 4)
- **Lead sentence** — First sentence should start with unique action verb + domain
- **Trigger format** — `WHEN:` with quoted phrases preferred over `USE FOR:` with loose keywords

**Why this matters:**
> Sonnet selects skills by fast pattern matching on the first ~20 words, not by deep reasoning over 100-word descriptions. Front-load the signal, eliminate noise, and make each skill's identity unmistakable in its opening phrase. ([Source](https://gist.github.com/kvenkatrajan/52e6e77f5560ca30640490b4cc65d109))

**Context note:** Anthropic's [Complete Guide](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) recommends negative triggers for overtriggering in general. This works for small, isolated skill sets. For production environments with 10+ overlapping skills, positive routing with `WHEN:` is the safer cross-model approach.

**Recommended template:**
```yaml
description: "[ACTION VERB] [UNIQUE_DOMAIN]. [One clarifying sentence]. WHEN: \"phrase1\", \"phrase2\", \"phrase3\"."
```

### 17. Body Structure Quality

Checks whether the SKILL.md body follows Anthropic's [recommended structure](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) for effective instructions.

**Sub-checks:**
- **Actionable instructions** — Body uses specific commands, code examples, or step-by-step guidance (not just descriptions)
- **Examples section** — Has at least one example or scenario showing input → expected output
- **Error handling** — Documents common failure modes and recovery steps
- **Troubleshooting** — Includes guidance for when things go wrong (MCP connection issues, validation failures, etc.)

**Detection heuristics:**
- Actionable: look for code blocks, `Run ...`, `Call ...`, numbered steps
- Examples: look for `## Example`, `Example:`, `User says:`, `Given:`, `When:`, `Then:`
- Error handling: look for `## Error`, `## Common Issues`, `If ... fails`, `Error:`, `Solution:`
- Troubleshooting: look for `## Troubleshooting`, `## Common Problems`, `Symptom:`, `Fix:`

**Good template (from Anthropic guide):**
```markdown
# Instructions
## Step 1: [First Major Step]
Clear explanation of what happens.
```bash
command --with-params
Expected output: [describe what success looks like]
```

## Examples
Example 1: [common scenario]
User says: "..."
Actions: 1. ... 2. ...
Result: ...

## Troubleshooting
Error: [Common error message]
Cause: [Why it happens]
Solution: [How to fix]
```

### 18. Body Progressive Disclosure

Checks whether the SKILL.md body properly uses progressive disclosure — keeping core instructions in SKILL.md and detailed reference material in `references/`.

**Flag when:**
- SKILL.md body exceeds 500 lines (spec recommends under 500)
- Large code blocks (> 50 lines) that could be moved to `references/` or `scripts/`
- Detailed API reference or configuration docs inline that belong in reference files

**Good pattern:**
```markdown
See [references/api-patterns.md](references/api-patterns.md) for rate limiting and pagination.
```

**Anti-pattern:**
```markdown
## Complete API Reference
[200+ lines of inline API documentation]
```

### Advisory Summary

| # | Detects | Guidance |
|---|---------|----------|
| 11 | Too many modules | 2–3 optimal; 4+ diminishing returns |
| 12 | Over-documentation | Detailed best; comprehensive hurts |
| 13 | Hurting patterns | ~19% of tasks can be hurt by skills |
| 14 | Declarative-only | Procedural > declarative |
| 15 | Instance-specific | Must guide task classes |
| 16 | Cross-model density | ≤60 words, no anti-triggers, WHEN: preferred, action verb lead |
| 17 | Body structure quality | Has examples, error handling, and actionable instructions |
| 18 | Body progressive disclosure | Detailed content should be in references/, not inline |
