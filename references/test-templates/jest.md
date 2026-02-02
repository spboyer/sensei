# Jest Test Template

Template for JavaScript/TypeScript trigger tests using Jest.

## File Structure

```
tests/{skill-name}/
├── triggers.test.ts
└── prompts.md
```

## triggers.test.ts

```typescript
import { describe, it, expect } from '@jest/globals';

const SKILL_NAME = '{skill-name}';

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
  
  // Other platforms/tools
  'Help me with competing-tool',
];

describe(`${SKILL_NAME} triggers`, () => {
  describe('should trigger', () => {
    shouldTriggerPrompts.forEach((prompt) => {
      it(`triggers on: "${prompt.substring(0, 50)}..."`, async () => {
        // Integration with your skill testing framework
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

// Implement this function based on your skill testing setup
async function testSkillTrigger(skillName: string, prompt: string) {
  // Example implementation:
  // const skills = await loadSkills();
  // const triggered = skills.wouldTrigger(skillName, prompt);
  // return { triggered };
  
  throw new Error('Implement testSkillTrigger for your environment');
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
