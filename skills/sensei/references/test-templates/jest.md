# Jest Test Template

Template for JavaScript/TypeScript trigger tests using Jest.

## File Structure

```
tests/{skill-name}/
├── triggers.test.ts
├── routing.test.ts      # NEW: Tests for MCP tool routing
└── prompts.md
```

## triggers.test.ts

```typescript
import { describe, it, expect } from '@jest/globals';

const SKILL_NAME = '{skill-name}';
const SKILL_TYPE = '{skill-type}'; // WORKFLOW, UTILITY, or ANALYSIS

// Prompts that SHOULD trigger this skill
const shouldTriggerPrompts = [
  // Add 5+ prompts matching "USE FOR:" phrases
  'Example prompt that should trigger this skill',
  'Another phrase from USE FOR section',
  'Natural language variation of trigger',
  'Keyword-focused prompt',
  'User request matching skill purpose',
];

// Prompts that should NOT trigger this skill
const shouldNotTriggerPrompts = [
  // Unrelated topics
  'What is the weather today?',
  'Help me write a poem',
  
  // Related but different skills (from DO NOT USE FOR)
  'Prompt that should use other-skill instead',
  'Another scenario for different skill',
  
  // Single operations (from FOR SINGLE OPERATIONS - should use MCP directly)
  'Single operation that should bypass this skill',
  
  // Other platforms/tools
  'Help me with competing-tool',
];

describe(`${SKILL_NAME} triggers`, () => {
  describe('should trigger', () => {
    shouldTriggerPrompts.forEach((prompt) => {
      it(`triggers on: "${prompt.substring(0, 50)}..."`, async () => {
        const result = await testSkillTrigger(SKILL_NAME, prompt);
        expect(result.triggered).toBe(true);
      });
    });
  });

  describe('should NOT trigger', () => {
    shouldNotTriggerPrompts.forEach((prompt) => {
      it(`does not trigger on: "${prompt.substring(0, 50)}..."`, async () => {
        const result = await testSkillTrigger(SKILL_NAME, prompt);
        expect(result.triggered).toBe(false);
      });
    });
  });
});

async function testSkillTrigger(skillName: string, prompt: string) {
  throw new Error('Implement testSkillTrigger for your environment');
}
```

## routing.test.ts (for High adherence skills)

```typescript
import { describe, it, expect } from '@jest/globals';

const SKILL_NAME = '{skill-name}';

// MCP tools this skill invokes (from INVOKES: field)
const INVOKED_TOOLS = [
  '{mcp-tool-1}',
  '{mcp-tool-2}',
];

// Single operations that should bypass skill (from FOR SINGLE OPERATIONS:)
const BYPASS_PROMPTS = [
  'Single azd command without workflow',
  'Quick status check',
  'Simple data query',
];

describe(`${SKILL_NAME} routing`, () => {
  describe('invokes correct MCP tools', () => {
    INVOKED_TOOLS.forEach((tool) => {
      it(`skill can invoke ${tool}`, async () => {
        const result = await testSkillCanInvokeTool(SKILL_NAME, tool);
        expect(result.canInvoke).toBe(true);
      });
    });
  });

  describe('bypass for single operations', () => {
    BYPASS_PROMPTS.forEach((prompt) => {
      it(`routes to MCP directly: "${prompt.substring(0, 40)}..."`, async () => {
        const result = await testRoutingDecision(prompt);
        expect(result.route).toBe('mcp');
        expect(result.skill).not.toBe(SKILL_NAME);
      });
    });
  });
});

async function testSkillCanInvokeTool(skillName: string, tool: string) {
  throw new Error('Implement testSkillCanInvokeTool for your environment');
}

async function testRoutingDecision(prompt: string) {
  throw new Error('Implement testRoutingDecision for your environment');
}
```

## Running Tests

```bash
# All skill tests
npm test

# Single skill
npm test -- --testPathPattern={skill-name}

# With coverage
npm test -- --coverage --testPathPattern={skill-name}
```

## Jest Configuration

Add to `jest.config.js`:

```javascript
module.exports = {
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
```
