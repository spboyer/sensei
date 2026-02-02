#!/usr/bin/env python3
"""Scaffold test templates for skills."""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


def parse_frontmatter(content: str) -> Optional[dict]:
    """Extract YAML frontmatter from SKILL.md content."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None
    
    frontmatter = {}
    yaml_content = match.group(1)
    
    name_match = re.search(r'^name:\s*["\']?([^"\'\n]+)["\']?', yaml_content, re.MULTILINE)
    if name_match:
        frontmatter["name"] = name_match.group(1).strip()
    
    desc_match = re.search(
        r'^description:\s*[|>]?\s*["\']?(.*?)(?=\n[a-z]+:|\n---|\Z)',
        yaml_content,
        re.MULTILINE | re.DOTALL
    )
    if desc_match:
        frontmatter["description"] = desc_match.group(1).strip().strip('"\'')
    
    return frontmatter


def extract_triggers(description: str) -> tuple[list[str], list[str]]:
    """Extract trigger and anti-trigger phrases from description."""
    triggers = []
    anti_triggers = []
    
    # Extract USE FOR phrases
    use_for_match = re.search(r'USE FOR:\s*(.+?)(?:DO NOT USE FOR:|$)', description, re.IGNORECASE | re.DOTALL)
    if use_for_match:
        phrases = re.findall(r'"([^"]+)"', use_for_match.group(1))
        triggers.extend(phrases)
    
    # Extract DO NOT USE FOR phrases
    not_for_match = re.search(r'DO NOT USE FOR:\s*(.+?)(?:\n[A-Z]|\Z)', description, re.IGNORECASE | re.DOTALL)
    if not_for_match:
        phrases = re.findall(r'"([^"]+)"', not_for_match.group(1))
        anti_triggers.extend(phrases)
        # Also extract parenthetical suggestions
        suggestions = re.findall(r'([^,.(]+)\s*\(use\s+[^)]+\)', not_for_match.group(1))
        anti_triggers.extend([s.strip() for s in suggestions if s.strip()])
    
    return triggers, anti_triggers


def generate_prompts_md(skill_name: str, triggers: list[str], anti_triggers: list[str]) -> str:
    """Generate prompts.md content."""
    trigger_lines = "\n".join(f'{i+1}. "{t}"' for i, t in enumerate(triggers[:5])) if triggers else "1. \"TODO: Add trigger prompt\""
    anti_trigger_lines = "\n".join(f'{i+1}. "{t}"' for i, t in enumerate(anti_triggers[:5])) if anti_triggers else "1. \"TODO: Add anti-trigger prompt\""
    
    return f"""# {skill_name} Trigger Prompts

## Should Trigger

These prompts should activate the {skill_name} skill:

{trigger_lines}

## Should NOT Trigger

These prompts should NOT activate the {skill_name} skill:

### Unrelated Topics
1. "What is the weather today?"
2. "Help me write a poem about mountains"
3. "Explain quantum computing"

### Related But Different Skills
{anti_trigger_lines}

### Other Platforms/Tools
1. "Help me with a competing tool"
2. "Use an alternative service"

## Notes

- Trigger phrases based on: USE FOR section of SKILL.md
- Anti-triggers based on: DO NOT USE FOR section of SKILL.md
- Last updated: {datetime.now().strftime('%Y-%m-%d')}
"""


def generate_jest_test(skill_name: str, triggers: list[str], anti_triggers: list[str]) -> str:
    """Generate Jest test file content."""
    trigger_prompts = ",\n  ".join(f"'{t}'" for t in triggers[:5]) if triggers else "'TODO: Add trigger prompt'"
    anti_trigger_prompts = ",\n  ".join(f"'{t}'" for t in anti_triggers[:5]) if anti_triggers else "'TODO: Add anti-trigger prompt'"
    
    return f"""import {{ describe, it, expect }} from '@jest/globals';

const SKILL_NAME = '{skill_name}';

const shouldTriggerPrompts = [
  {trigger_prompts},
];

const shouldNotTriggerPrompts = [
  'What is the weather today?',
  'Help me write a poem',
  {anti_trigger_prompts},
];

describe(`${{SKILL_NAME}} triggers`, () => {{
  describe('should trigger', () => {{
    shouldTriggerPrompts.forEach((prompt) => {{
      it(`triggers on: "${{prompt.substring(0, 50)}}..."`, async () => {{
        // TODO: Implement testSkillTrigger for your environment
        const result = await testSkillTrigger(SKILL_NAME, prompt);
        expect(result.triggered).toBe(true);
      }});
    }});
  }});

  describe('should NOT trigger', () => {{
    shouldNotTriggerPrompts.forEach((prompt) => {{
      it(`does not trigger on: "${{prompt.substring(0, 50)}}..."`, async () => {{
        const result = await testSkillTrigger(SKILL_NAME, prompt);
        expect(result.triggered).toBe(false);
      }});
    }});
  }});
}});

async function testSkillTrigger(skillName: string, prompt: string) {{
  // TODO: Implement based on your skill testing setup
  throw new Error('Implement testSkillTrigger');
}}
"""


def generate_pytest_test(skill_name: str, triggers: list[str], anti_triggers: list[str]) -> str:
    """Generate pytest test file content."""
    trigger_list = ",\n    ".join(f'"{t}"' for t in triggers[:5]) if triggers else '"TODO: Add trigger prompt"'
    anti_trigger_list = ",\n    ".join(f'"{t}"' for t in anti_triggers[:5]) if anti_triggers else '"TODO: Add anti-trigger prompt"'
    
    return f'''"""Trigger tests for {skill_name} skill."""
import pytest

SKILL_NAME = "{skill_name}"

SHOULD_TRIGGER_PROMPTS = [
    {trigger_list},
]

SHOULD_NOT_TRIGGER_PROMPTS = [
    "What is the weather today?",
    "Help me write a poem",
    {anti_trigger_list},
]


class TestShouldTrigger:
    @pytest.mark.parametrize("prompt", SHOULD_TRIGGER_PROMPTS)
    def test_triggers_on_prompt(self, prompt: str, skill_tester):
        result = skill_tester.test_trigger(SKILL_NAME, prompt)
        assert result.triggered, f"Expected {{SKILL_NAME}} to trigger on: {{prompt}}"


class TestShouldNotTrigger:
    @pytest.mark.parametrize("prompt", SHOULD_NOT_TRIGGER_PROMPTS)
    def test_does_not_trigger_on_prompt(self, prompt: str, skill_tester):
        result = skill_tester.test_trigger(SKILL_NAME, prompt)
        assert not result.triggered, f"Expected {{SKILL_NAME}} to NOT trigger on: {{prompt}}"
'''


def main():
    parser = argparse.ArgumentParser(
        description="Scaffold test templates for skills"
    )
    parser.add_argument(
        "skill_name",
        help="Name of the skill to scaffold tests for"
    )
    parser.add_argument(
        "--skills-dir",
        type=Path,
        default=Path("skills"),
        help="Skills directory (default: skills/)"
    )
    parser.add_argument(
        "--tests-dir",
        type=Path,
        default=Path("tests"),
        help="Tests directory (default: tests/)"
    )
    parser.add_argument(
        "--framework",
        choices=["jest", "pytest", "prompts"],
        default="prompts",
        help="Test framework (default: prompts)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing files"
    )
    
    args = parser.parse_args()
    
    # Find SKILL.md
    skill_md = args.skills_dir / args.skill_name / "SKILL.md"
    if not skill_md.exists():
        # Try .github/skills/
        skill_md = Path(".github/skills") / args.skill_name / "SKILL.md"
    
    triggers, anti_triggers = [], []
    
    if skill_md.exists():
        content = skill_md.read_text()
        frontmatter = parse_frontmatter(content)
        if frontmatter and "description" in frontmatter:
            triggers, anti_triggers = extract_triggers(frontmatter["description"])
            print(f"📖 Found {len(triggers)} triggers, {len(anti_triggers)} anti-triggers in SKILL.md")
    else:
        print(f"⚠️  SKILL.md not found at {skill_md}, using empty templates")
    
    # Create test directory
    test_dir = args.tests_dir / args.skill_name
    test_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate prompts.md (always)
    prompts_file = test_dir / "prompts.md"
    if not prompts_file.exists() or args.force:
        prompts_file.write_text(generate_prompts_md(args.skill_name, triggers, anti_triggers))
        print(f"✅ Created {prompts_file}")
    else:
        print(f"⏭️  Skipped {prompts_file} (already exists)")
    
    # Generate framework-specific test
    if args.framework == "jest":
        test_file = test_dir / "triggers.test.ts"
        if not test_file.exists() or args.force:
            test_file.write_text(generate_jest_test(args.skill_name, triggers, anti_triggers))
            print(f"✅ Created {test_file}")
        else:
            print(f"⏭️  Skipped {test_file} (already exists)")
    
    elif args.framework == "pytest":
        test_file = test_dir / "test_triggers.py"
        if not test_file.exists() or args.force:
            test_file.write_text(generate_pytest_test(args.skill_name, triggers, anti_triggers))
            print(f"✅ Created {test_file}")
        else:
            print(f"⏭️  Skipped {test_file} (already exists)")
    
    print(f"\n📁 Test scaffolding complete: {test_dir}/")


if __name__ == "__main__":
    main()
