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

**Skill Type:** {WORKFLOW|UTILITY|ANALYSIS}

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

### Single Operations (Route to MCP)
1. "Quick status check" → use {mcp-tool} directly
2. "Simple data query" → use {mcp-tool} directly
3. "Single command execution" → use {mcp-tool} directly

### Other Platforms/Tools
1. "Help me with competing-tool"
2. "Use alternative-service for this"

## MCP Tool Routing

### This Skill Invokes
- `{mcp-tool-1}` - for {purpose}
- `{mcp-tool-2}` - for {purpose}

### Bypass to MCP When
- User requests single command execution
- User wants quick status/query without workflow
- User explicitly names the MCP tool

## Notes

- Trigger phrases based on: USE FOR section of SKILL.md
- Anti-triggers based on: DO NOT USE FOR section of SKILL.md
- Routing based on: INVOKES and FOR SINGLE OPERATIONS sections
- Last updated: {date}
```

## Usage

### Manual Testing

Review each prompt and verify:
1. ✅ "Should Trigger" prompts activate the skill
2. ❌ "Should NOT Trigger" prompts do not activate
3. 🔀 "Single Operations" route to MCP tools directly

### Custom Test Framework

Parse prompts.md and integrate with your testing:

```python
import re
from pathlib import Path

def parse_prompts(skill_name: str) -> dict:
    """Parse prompts.md into structured test data."""
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
        r"## Should NOT Trigger\n\n(.*?)(?=\n## MCP Tool|\n## Notes|\Z)", 
        content, 
        re.DOTALL
    )
    anti_triggers = re.findall(r'\d+\. "([^"]+)"', anti_match.group(1))
    
    # Extract MCP routing info
    invokes_match = re.search(
        r"### This Skill Invokes\n(.*?)(?=\n### |\n## |\Z)",
        content,
        re.DOTALL
    )
    invoked_tools = re.findall(r'`([^`]+)`', invokes_match.group(1)) if invokes_match else []
    
    return {
        "triggers": triggers,
        "anti_triggers": anti_triggers,
        "invoked_tools": invoked_tools,
    }
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
| `{skill-type}` | WORKFLOW, UTILITY, or ANALYSIS |
| `{mcp-tool}` | MCP tool name for routing |
| `{mcp-tool-1}`, `{mcp-tool-2}` | Tools from INVOKES field |
| `{purpose}` | What the tool is used for |
| `{date}` | Current date |
| Prompt examples | Based on SKILL.md frontmatter |

## Functional Testing (Beyond Triggers)

Anthropic's [Complete Guide](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) recommends three testing areas. Trigger testing (above) covers area 1. Areas 2-3 are documented here.

### Area 2: Functional Tests

Goal: Verify the skill produces correct outputs.

```markdown
## Functional Tests

### Test: [Scenario Name]
Given: [Input conditions]
When: Skill executes workflow
Then:
  - [Expected output 1]
  - [Expected output 2]
  - No API/MCP errors
  - [Validation criteria]

### Test: Error Recovery
Given: [Invalid input or MCP failure condition]
When: Skill encounters error
Then:
  - Error is caught and reported clearly
  - No partial/corrupt output
  - User is guided to resolution
```

### Area 3: Performance Comparison

Goal: Prove the skill improves results vs. baseline (no skill).

```markdown
## Performance Comparison

### Without Skill
- User provides instructions each time
- N back-and-forth messages needed
- M failed API calls requiring retry
- X tokens consumed

### With Skill
- Automatic workflow execution
- N' clarifying questions only
- 0 failed API calls
- X' tokens consumed (should be < X)
```

These are aspirational targets — rough benchmarks rather than precise thresholds. Run the same task with and without the skill 3-5 times to measure.
