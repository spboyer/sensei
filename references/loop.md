# Ralph Loop Workflow

Detailed workflow documentation for the iterative improvement cycle.

## Overview

The Ralph loop implements iterative refinement - improving skills one step at a time until they reach compliance.

## Loop Diagram

```
         ┌──────────────────┐
         │      START       │
         └────────┬─────────┘
                  ▼
         ┌──────────────────┐
         │    1. READ       │◀────────────────┐
         │  Load SKILL.md   │                 │
         └────────┬─────────┘                 │
                  ▼                           │
         ┌──────────────────┐                 │
         │    2. SCORE      │                 │
         └────────┬─────────┘                 │
                  ▼                           │
         ┌──────────────────┐                 │
         │ Score >= M-H?    │──YES──▶ SUMMARY │
         └────────┬─────────┘                 │
                  │ NO                        │
                  ▼                           │
         ┌──────────────────┐                 │
         │  3. SCAFFOLD     │                 │
         │  (if no tests)   │                 │
         └────────┬─────────┘                 │
                  ▼                           │
         ┌──────────────────┐                 │
         │  4. IMPROVE      │                 │
         │  FRONTMATTER     │                 │
         └────────┬─────────┘                 │
                  ▼                           │
         ┌──────────────────┐                 │
         │  5. IMPROVE      │                 │
         │  TESTS           │                 │
         └────────┬─────────┘                 │
                  ▼                           │
         ┌──────────────────┐                 │
         │  6. VERIFY       │                 │
         └────────┬─────────┘                 │
                  ▼                           │
         ┌──────────────────┐                 │
         │ Iteration < 5?   │──YES────────────┘
         └────────┬─────────┘
                  │ NO
                  ▼
              TIMEOUT
```

## Step Details

### Step 1: READ

Load skill state:

```bash
# Load SKILL.md
cat {skills-dir}/{skill-name}/SKILL.md

# Count baseline tokens
python scripts/count_tokens.py {skills-dir}/{skill-name}/SKILL.md

# Check for existing tests
ls {tests-dir}/{skill-name}/
```

**Extract:**
- Frontmatter (name, description, compatibility)
- Current trigger/anti-trigger phrases
- Token count baseline

### Step 2: SCORE

Evaluate compliance:

```bash
python scripts/score_skill.py {skills-dir}/{skill-name}/SKILL.md
```

**Output:**
```
Skill: my-skill
Score: Low
Tokens: 142
Issues:
  - Description too short (85 chars, need 150+)
  - No trigger phrases found
  - No anti-triggers found
```

### Step 3: SCAFFOLD

If tests don't exist, create them:

```bash
python scripts/scaffold_tests.py {skill-name} \
  --tests-dir {tests-dir} \
  --framework jest  # or pytest, prompts
```

**Creates:**
```
tests/{skill-name}/
├── triggers.test.ts  # or test_triggers.py
└── prompts.md        # Always created
```

### Step 4: IMPROVE FRONTMATTER

Update SKILL.md description:

1. **Analyze** - Read skill body to understand purpose
2. **Identify triggers** - What phrases should activate this skill?
3. **Identify anti-triggers** - What should NOT activate this skill?
4. **Write description** - Follow template:

```yaml
description: |
  [What the skill does - 1-2 sentences]
  USE FOR: [phrase1], [phrase2], [phrase3], [phrase4], [phrase5].
  DO NOT USE FOR: [scenario1] (use other-skill), [scenario2].
```

**Constraints:**
- Keep under 1024 characters
- Include 5+ trigger phrases
- Include 2+ anti-triggers with skill recommendations

### Step 5: IMPROVE TESTS

Update test prompts to match new frontmatter.

**shouldTriggerPrompts (5+ required):**
- Match "USE FOR:" phrases
- Include natural language variations
- Cover primary use cases

**shouldNotTriggerPrompts (5+ required):**
- Match "DO NOT USE FOR:" scenarios
- Include unrelated topics
- Include other tools/platforms

### Step 6: VERIFY

Run tests (skip with `--fast`):

```bash
# Jest
npm test -- --testPathPattern={skill-name}

# pytest
pytest tests/{skill-name}/ -v

# Manual verification (if no test framework)
cat tests/{skill-name}/prompts.md
```

**If tests fail:**
1. Analyze failure
2. Adjust frontmatter or prompts
3. Re-run (sub-iteration)

### Step 7: SUMMARY

Display comparison:

```
╔══════════════════════════════════════════════════════════════════╗
║  SENSEI SUMMARY: {skill-name}                                    ║
╠══════════════════════════════════════════════════════════════════╣
║  BEFORE                          AFTER                           ║
║  ──────                          ─────                           ║
║  Score: Low                      Score: Medium-High              ║
║  Tokens: 142                     Tokens: 385                     ║
║  Triggers: 0                     Triggers: 5                     ║
║  Anti-triggers: 0                Anti-triggers: 3                ║
║                                                                  ║
║  TOKEN STATUS: ✅ Under budget (385 < 500)                       ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 8: PROMPT USER

Present options:

```
Choose an action:
  [C] Commit changes
  [I] Create GitHub issue
  [S] Skip (discard changes)
```

**Commit:**
```bash
git add {skills-dir}/{skill-name}/SKILL.md
git add {tests-dir}/{skill-name}/
git commit -m "sensei: improve {skill-name} frontmatter"
```

**Issue:** Create with summary and unimplemented suggestions.

### Step 9: REPEAT or EXIT

**Exit conditions:**
- Score >= Medium-High AND tests pass
- Iteration count >= 5 (timeout)

**Continue:**
- Score < Medium-High
- Iteration count < 5

## Batch Processing

When processing multiple skills:

1. Skills processed sequentially
2. Each goes through full loop
3. User prompted after each
4. Final summary shows all results

```
╔══════════════════════════════════════════════════════════════════╗
║  BATCH SUMMARY                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  skill-a: Low → Medium-High ✓                                    ║
║  skill-b: Medium → Medium-High ✓                                 ║
║  skill-c: Low → Medium (timeout)                                 ║
╚══════════════════════════════════════════════════════════════════╝
```

## Error Handling

### Tests Failing
1. Log specific failure
2. Attempt fix (adjust prompts/frontmatter)
3. Re-run (max 2 attempts)
4. If still failing, commit partial progress

### Skill Not Found
1. Check path exists
2. Check spelling
3. Report error, skip to next

### Git Conflicts
```bash
git stash
git pull --rebase
git stash pop
# Resolve manually if needed
```
