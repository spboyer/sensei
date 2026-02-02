# Generic Prompts Template

Framework-agnostic prompt list for manual or custom testing.

## File Structure

```
tests/{skill-name}/
└── prompts.md
```

## prompts.md

```markdown
# {skill-name} Trigger Prompts

## Should Trigger

These prompts should activate the {skill-name} skill:

1. "Example prompt matching USE FOR phrase 1"
2. "Example prompt matching USE FOR phrase 2"
3. "Natural language variation"
4. "Keyword-focused prompt"
5. "User request matching skill purpose"

## Should NOT Trigger

These prompts should NOT activate the {skill-name} skill:

### Unrelated Topics
1. "What is the weather today?"
2. "Help me write a poem about mountains"
3. "Explain quantum computing"

### Related But Different Skills
1. "Prompt for other-skill-name" → use other-skill instead
2. "Prompt for another-skill" → use another-skill instead

### Other Platforms/Tools
1. "Help me with competing-tool"
2. "Use alternative-service for this"

## Notes

- Trigger phrases based on: USE FOR section of SKILL.md
- Anti-triggers based on: DO NOT USE FOR section of SKILL.md
- Last updated: {date}
```

## Usage

### Manual Testing

Review each prompt and verify:
1. ✅ "Should Trigger" prompts activate the skill
2. ❌ "Should NOT Trigger" prompts do not activate

### Custom Test Framework

Parse prompts.md and integrate with your testing:

```python
import re
from pathlib import Path

def parse_prompts(skill_name: str) -> tuple[list[str], list[str]]:
    """Parse prompts.md into trigger/anti-trigger lists."""
    content = Path(f"tests/{skill_name}/prompts.md").read_text()
    
    # Extract "Should Trigger" section
    trigger_match = re.search(
        r"## Should Trigger\n\n(.*?)(?=\n## |\Z)", 
        content, 
        re.DOTALL
    )
    triggers = re.findall(r'\d+\. "([^"]+)"', trigger_match.group(1))
    
    # Extract "Should NOT Trigger" section
    anti_match = re.search(
        r"## Should NOT Trigger\n\n(.*?)(?=\n## Notes|\Z)", 
        content, 
        re.DOTALL
    )
    anti_triggers = re.findall(r'\d+\. "([^"]+)"', anti_match.group(1))
    
    return triggers, anti_triggers
```

### CI Validation

```bash
# Check prompts.md exists for all skills
for skill in skills/*/; do
  name=$(basename "$skill")
  if [ ! -f "tests/$name/prompts.md" ]; then
    echo "Missing prompts.md for $name"
    exit 1
  fi
done
```

## Template Variables

When scaffolding, replace:

| Variable | Description |
|----------|-------------|
| `{skill-name}` | Name of the skill |
| `{date}` | Current date |
| Prompt examples | Based on SKILL.md frontmatter |
