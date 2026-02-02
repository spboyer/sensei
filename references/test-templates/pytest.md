# pytest Test Template

Template for Python trigger tests using pytest.

## File Structure

```
tests/{skill-name}/
├── test_triggers.py
├── test_routing.py      # NEW: Tests for MCP tool routing
├── conftest.py
└── prompts.md
```

## test_triggers.py

```python
"""Trigger tests for {skill-name} skill."""
import pytest

SKILL_NAME = "{skill-name}"
SKILL_TYPE = "{skill-type}"  # WORKFLOW, UTILITY, or ANALYSIS

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
    # Single operations (from FOR SINGLE OPERATIONS - should use MCP directly)
    "Single operation that should bypass this skill",
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

## test_routing.py (for High adherence skills)

```python
"""Routing tests for {skill-name} skill."""
import pytest

SKILL_NAME = "{skill-name}"

# MCP tools this skill invokes (from INVOKES: field)
INVOKED_TOOLS = [
    "{mcp-tool-1}",
    "{mcp-tool-2}",
]

# Single operations that should bypass skill (from FOR SINGLE OPERATIONS:)
BYPASS_PROMPTS = [
    "Single command without workflow",
    "Quick status check",
    "Simple data query",
]


class TestInvokedTools:
    """Tests for MCP tools the skill invokes."""

    @pytest.mark.parametrize("tool", INVOKED_TOOLS)
    def test_skill_can_invoke_tool(self, tool: str, skill_tester):
        """Verify skill can invoke expected MCP tools."""
        result = skill_tester.test_can_invoke(SKILL_NAME, tool)
        assert result.can_invoke, f"Expected {SKILL_NAME} to invoke {tool}"


class TestBypassRouting:
    """Tests for prompts that should bypass skill and use MCP directly."""

    @pytest.mark.parametrize("prompt", BYPASS_PROMPTS)
    def test_routes_to_mcp_directly(self, prompt: str, routing_tester):
        """Verify single operations route to MCP, not skill."""
        result = routing_tester.test_routing(prompt)
        assert result.route == "mcp", f"Expected MCP routing for: {prompt}"
        assert result.skill != SKILL_NAME, f"Should bypass {SKILL_NAME}"
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


@dataclass
class InvokeResult:
    """Result of a tool invocation test."""
    can_invoke: bool
    tool_name: str = ""


@dataclass
class RoutingResult:
    """Result of a routing decision test."""
    route: str  # "skill" or "mcp"
    skill: str = ""
    tool: str = ""


class SkillTester:
    """Test helper for skill trigger testing."""

    def test_trigger(self, skill_name: str, prompt: str) -> TriggerResult:
        """Test if a skill would trigger on a given prompt."""
        raise NotImplementedError("Implement test_trigger for your environment")

    def test_can_invoke(self, skill_name: str, tool: str) -> InvokeResult:
        """Test if a skill can invoke a given MCP tool."""
        raise NotImplementedError("Implement test_can_invoke for your environment")


class RoutingTester:
    """Test helper for routing decision testing."""

    def test_routing(self, prompt: str) -> RoutingResult:
        """Test routing decision for a prompt."""
        raise NotImplementedError("Implement test_routing for your environment")


@pytest.fixture
def skill_tester():
    """Provide skill tester instance."""
    return SkillTester()


@pytest.fixture
def routing_tester():
    """Provide routing tester instance."""
    return RoutingTester()
```

## Running Tests

```bash
# All tests
pytest tests/

# Single skill
pytest tests/{skill-name}/ -v

# With coverage
pytest tests/{skill-name}/ --cov=skills/{skill-name}

# Routing tests only
pytest tests/{skill-name}/test_routing.py -v
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
