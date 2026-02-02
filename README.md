# Sensei

> "A true master teaches not by telling, but by refining."

**Sensei** is a skill for iteratively improving SKILL.md frontmatter compliance using the [Ralph loop pattern](https://github.com/soderlund/ralph). It helps ensure your skills have proper triggers, anti-triggers, and stay within token budgets.

## What It Does

Sensei automates the improvement of [Agent Skills](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills) by:

1. **Scoring** skill frontmatter compliance (Low → Medium → Medium-High → High)
2. **Adding triggers** (`USE FOR:`) so agents know when to activate the skill
3. **Adding anti-triggers** (`DO NOT USE FOR:`) to prevent skill collision
4. **Tracking tokens** to keep skills lean and efficient
5. **Scaffolding tests** for trigger validation

## Quick Start

### Using with Copilot CLI

```
Run sensei on my-skill-name
```

### Using the Scripts Directly

```bash
# Score a skill
python scripts/score_skill.py skills/my-skill/SKILL.md

# Count tokens
python scripts/count_tokens.py skills/my-skill/SKILL.md

# Scaffold tests
python scripts/scaffold_tests.py my-skill --skills-dir skills/ --tests-dir tests/
```

## Installation

### As a Copilot CLI Skill

Add to your `.github/copilot-instructions.md` or skill configuration:

```markdown
Use the sensei skill from https://github.com/spboyer/sensei for improving skill frontmatter.
```

### Scripts Only

```bash
git clone https://github.com/spboyer/sensei.git
cd sensei/scripts
pip install -r requirements.txt  # Optional: for accurate token counting
```

## Scoring Criteria

| Score | Requirements |
|-------|--------------|
| **Low** | Description < 150 chars OR no triggers |
| **Medium** | Description ≥ 150 chars AND has trigger keywords |
| **Medium-High** | Has `USE FOR:` AND `DO NOT USE FOR:` |
| **High** | Medium-High + `compatibility` field |

**Target: Medium-High** — ensures agents know both when to use AND when not to use your skill.

## Example Transformation

### Before (Low)

```yaml
---
name: pdf-processor
description: 'Process PDF files'
---
```

### After (Medium-High)

```yaml
---
name: pdf-processor
description: |
  Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs", "split PDF".
  DO NOT USE FOR: creating new PDFs (use document-creator), OCR (use ocr-processor).
---
```

## The Ralph Loop

Sensei uses an iterative improvement cycle:

```
READ → SCORE → IMPROVE → TEST → REPEAT
```

1. Load skill and count tokens
2. Score frontmatter compliance
3. Add triggers and anti-triggers
4. Run/scaffold tests
5. Repeat until Medium-High achieved (max 5 iterations)

## Project Structure

```
sensei/
├── SKILL.md              # Main skill instructions
├── references/           # Detailed documentation
│   ├── scoring.md        # Scoring criteria
│   ├── loop.md           # Ralph loop details
│   ├── examples.md       # Before/after examples
│   ├── configuration.md  # Project setup
│   └── test-templates/   # Jest, pytest, generic templates
└── scripts/              # Standalone Python tools
    ├── count_tokens.py   # Token counter
    ├── score_skill.py    # Compliance scorer
    └── scaffold_tests.py # Test generator
```

## Commands

| Command | Description |
|---------|-------------|
| `Run sensei on <skill>` | Improve a single skill |
| `Run sensei on <s1>, <s2>` | Improve multiple skills |
| `Run sensei on all skills` | Improve all skills in directory |
| `Run sensei on all Low-adherence skills` | Batch improve by score |
| `sensei help` | Show usage information |

## Configuration

Sensei auto-detects your project structure:

- **Skills:** `skills/` or `.github/skills/`
- **Tests:** `tests/`
- **Token limit:** 500 (soft), 5000 (hard)

Override in your prompt:
```
Run sensei on my-skill with skills in src/ai/skills/ and tests in spec/
```

## Requirements

- Python 3.8+
- Optional: `tiktoken` for accurate token counting (`pip install tiktoken`)

## License

MIT — see [LICENSE.txt](LICENSE.txt)

## Related

- [Anthropic Skills Documentation](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills)
- [Ralph Loop Pattern](https://github.com/soderlund/ralph)
- [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) — for creating new skills from scratch
