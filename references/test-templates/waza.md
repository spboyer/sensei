# Waza Trigger Test Template

Generate Waza-compatible trigger tests from skill frontmatter.

## Output Format

Sensei generates `trigger_tests.yaml` in Waza format:

```yaml
name: {skill-name}-triggers
skill: {skill-name}

# Prompts that SHOULD activate this skill
# Generated from "USE FOR:" in description
shouldTriggerPrompts:
  - "exact phrase from USE FOR"
  - "natural language variant"
  - "question form"
  - "command form"
  - "context-rich example"

# Prompts that should NOT activate this skill  
# Generated from "DO NOT USE FOR:" in description
shouldNotTriggerPrompts:
  - "phrase matching anti-trigger"
  - "competing skill's trigger"
  - "MCP tool direct invocation"
  - "unrelated request"
  - "edge case that looks similar"
```

## Generation Rules

### From USE FOR Phrases

For each phrase in `USE FOR:`, generate:

1. **Exact match** - The phrase as-is
2. **Question form** - "How do I {phrase}?"
3. **Command form** - "{Phrase} now" or "Please {phrase}"
4. **Context variant** - "{phrase} for my project"

**Example:**
```
USE FOR: deploy my app, set up Azure

Generates:
- "deploy my app"
- "How do I deploy my app?"
- "Deploy my app now"
- "deploy my app for my React project"
- "set up Azure"
- "How do I set up Azure?"
```

### From DO NOT USE FOR Phrases

For each anti-trigger, generate:

1. **Exact anti-trigger** - The phrase as-is
2. **Related MCP operation** - If skill mentions MCP, add "list/get/query" variants
3. **Competing skill reference** - If "(use X)" mentioned, add X's triggers

**Example:**
```
DO NOT USE FOR: listing resources (use azure-storage MCP), simple queries

Generates:
- "list my resources"
- "list storage accounts"
- "get my resources"
- "query my storage"
- "simple storage query"
```

## Minimum Test Counts

| Category | Minimum | Recommended |
|----------|---------|-------------|
| shouldTriggerPrompts | 5 | 10+ |
| shouldNotTriggerPrompts | 5 | 10+ |

## Scaffold Command

When Sensei scaffolds tests, it:

1. Parses `USE FOR:` from description
2. Parses `DO NOT USE FOR:` from description
3. Expands each to 2-3 variants
4. Writes `{tests-dir}/{skill-name}/trigger_tests.yaml`

## Running Waza Tests

```bash
# Install waza
pip install waza

# Run trigger tests
waza run tests/{skill-name}/trigger_tests.yaml

# Generate report
waza run tests/{skill-name}/trigger_tests.yaml --output results.json
```

## Example: Complete trigger_tests.yaml

```yaml
name: pdf-processor-triggers
skill: pdf-processor

shouldTriggerPrompts:
  # From USE FOR: "extract PDF text"
  - "extract PDF text"
  - "How do I extract text from a PDF?"
  - "Extract the text from this PDF"
  - "extract PDF text from my document"
  
  # From USE FOR: "rotate PDF"
  - "rotate PDF"
  - "How do I rotate a PDF?"
  - "Rotate this PDF 90 degrees"
  
  # From USE FOR: "merge PDFs"
  - "merge PDFs"
  - "How do I merge multiple PDFs?"
  - "Combine these PDFs into one"

shouldNotTriggerPrompts:
  # From DO NOT USE FOR: "creating PDFs (use document-creator)"
  - "create a PDF"
  - "generate a new PDF"
  - "make a PDF from scratch"
  
  # From DO NOT USE FOR: "image extraction"  
  - "extract images from PDF"
  - "get the images from this PDF"
  
  # MCP direct operations (from INVOKES)
  - "list my PDF files"
  - "check if file exists"
```

## CI Integration

```yaml
# .github/workflows/trigger-tests.yaml
name: Trigger Accuracy

on:
  pull_request:
    paths:
      - 'skills/**/SKILL.md'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install waza
      - run: waza run tests/**/trigger_tests.yaml --threshold 0.8
```
