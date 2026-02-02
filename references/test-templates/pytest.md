# pytest Test Template

Template for Python trigger tests using pytest.

## File Structure

```
tests/{skill-name}/
├── test_triggers.py
├── conftest.py
└── prompts.md
```

## test_triggers.py

```python
"""Trigger tests for {skill-name} skill."""
import pytest

SKILL_NAME = "{skill-name}"

# Prompts that SHOULD trigger this skill
SHOULD_TRIGGER_PROMPTS = [
    # Add 5+ prompts matching "USE FOR:" phrases
    "Example prompt that should trigger this skill",
    "Another phrase from USE FOR section",
    "Natural language variation of trigger",
    "Keyword-focused prompt",
    "User request matching skill purpose",
]

# Prompts that should NOT trigger this skill
SHOULD_NOT_TRIGGER_PROMPTS = [
    # Unrelated topics
    "What is the weather today?",
    "Help me write a poem",
    # Related but different skills (from DO NOT USE FOR)
    "Prompt that should use other-skill instead",
    "Another scenario for different skill",
    # Other platforms/tools
    "Help me with competing-tool",
]


class TestShouldTrigger:
    """Tests for prompts that should trigger the skill."""

    @pytest.mark.parametrize("prompt", SHOULD_TRIGGER_PROMPTS)
    def test_triggers_on_prompt(self, prompt: str, skill_tester):
        """Verify skill triggers on expected prompts."""
        result = skill_tester.test_trigger(SKILL_NAME, prompt)
        assert result.triggered, f"Expected {SKILL_NAME} to trigger on: {prompt}"


class TestShouldNotTrigger:
    """Tests for prompts that should NOT trigger the skill."""

    @pytest.mark.parametrize("prompt", SHOULD_NOT_TRIGGER_PROMPTS)
    def test_does_not_trigger_on_prompt(self, prompt: str, skill_tester):
        """Verify skill does not trigger on unrelated prompts."""
        result = skill_tester.test_trigger(SKILL_NAME, prompt)
        assert not result.triggered, f"Expected {SKILL_NAME} to NOT trigger on: {prompt}"
```

## conftest.py

```python
"""Pytest fixtures for skill testing."""
import pytest
from dataclasses import dataclass


@dataclass
class TriggerResult:
    """Result of a skill trigger test."""
    triggered: bool
    confidence: float = 0.0
    skill_name: str = ""


class SkillTester:
    """Test helper for skill trigger testing."""

    def test_trigger(self, skill_name: str, prompt: str) -> TriggerResult:
        """Test if a skill would trigger on a given prompt.
        
        Implement this method based on your skill testing setup.
        """
        # Example implementation:
        # skills = load_skills()
        # triggered = skills.would_trigger(skill_name, prompt)
        # return TriggerResult(triggered=triggered)
        
        raise NotImplementedError("Implement test_trigger for your environment")


@pytest.fixture
def skill_tester():
    """Provide skill tester instance."""
    return SkillTester()
```

## Running Tests

```bash
# All tests
pytest tests/

# Single skill
pytest tests/{skill-name}/ -v

# With coverage
pytest tests/{skill-name}/ --cov=skills/{skill-name}

# Specific test class
pytest tests/{skill-name}/test_triggers.py::TestShouldTrigger -v
```

## pytest Configuration

Add to `pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
```
