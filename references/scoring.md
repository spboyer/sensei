# Scoring Criteria

Detailed scoring criteria for evaluating skill frontmatter compliance.

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
# Example: Complete
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs".
  DO NOT USE FOR: creating PDFs (use document-creator).
```

### High Adherence

A skill is **High** if:
- All Medium-High criteria
- Has `compatibility` field

```yaml
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs".
  DO NOT USE FOR: creating PDFs (use document-creator).
compatibility: Requires Python 3.8+, pdfplumber library.
```

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

### 5. Compatibility Field

Optional field documenting:
- Required tools/libraries
- Supported frameworks
- Prerequisites

## Scoring Algorithm

```python
def score_skill(skill):
    if len(skill.description) < 150:
        return "Low"
    
    has_triggers = contains_trigger_phrases(skill.description)
    has_anti_triggers = contains_anti_triggers(skill.description)
    has_compatibility = skill.compatibility is not None
    
    if not has_triggers:
        return "Low"
    if not has_anti_triggers:
        return "Medium"
    if not has_compatibility:
        return "Medium-High"
    return "High"
```

## Token Budgets

| File | Soft Limit | Hard Limit |
|------|------------|------------|
| SKILL.md | 500 | 5000 |
| references/*.md | 1000 | - |
| Description field | - | 1024 chars |
