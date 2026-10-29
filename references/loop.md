# Ralph Loop Workflow

Detailed workflow documentation for the iterative improvement cycle.

## Overview

The Ralph loop implements iterative refinement toward a Sensei advisory target.
Portable-spec diagnostics remain separate from authoring advice; a passing static
score does not establish observed activation or task quality.

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
npm run tokens -- count {skills-dir}/{skill-name}/SKILL.md

# Check for existing tests
ls {tests-dir}/{skill-name}/
```

**Extract:**
- Frontmatter (name, description, compatibility)
- Intended scope, positive phrases, and near-miss boundaries
- Token count baseline

### Step 2: SCORE

Evaluate compliance:

```bash
npm run tokens -- score {skills-dir}/{skill-name}
```

**Illustrative workflow summary (the CLI emits individual checks):**
```
Skill: my-skill
Score: Low
Tokens: 142
Issues:
  - Scope is vague; clarify intended use without padding
  - Add realistic positive and near-miss cases
```

### Step 3: SCAFFOLD

If tests don't exist, create them:

Copy the appropriate [test template](test-templates/skill-init.md) for the target
project's framework. There is no bundled `scaffold_tests.py` command.

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
3. **Identify near-misses** - What similar requests are outside scope?
4. **Write description** - Follow template:

```yaml
description: "Extract PDF text and merge existing PDFs. WHEN: \"extract PDF text\", \"merge PDFs\"."
```

**Constraints:**
- Keep under 1024 characters
- Prefer concise positive intent/scope; no 150-character floor
- Test boundaries in near-miss prompts, not mandatory negative frontmatter syntax

### Step 5: IMPROVE TESTS

Update test prompts to match new frontmatter.

**shouldTriggerPrompts (start with 5+):**
- Match "USE FOR:" phrases
- Include natural language variations
- Cover primary use cases

**shouldNotTriggerPrompts (start with 5+):**
- Include close near-misses derived from intended scope
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
║  Near-miss tests: 0              Near-miss tests: 5              ║
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
4. If still failing, report the failure; do not claim completion or commit unasked

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

## Success Criteria

Beyond Sensei's frontmatter scoring, Anthropic's [Complete Guide](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) recommends defining runtime success criteria. These are aspirational targets — rough benchmarks rather than precise thresholds.

### Quantitative Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Trigger accuracy | 90%+ of relevant queries | Run 10-20 test queries that should trigger the skill. Track how many load automatically. |
| Tool call efficiency | Fewer calls with skill than without | Compare the same task with and without the skill. Count tool calls and tokens consumed. |
| Error rate | 0 failed API calls per workflow | Monitor MCP server logs during test runs. Track retry rates and error codes. |

### Qualitative Metrics

| Metric | How to Assess |
|--------|---------------|
| No next-step prompting needed | During testing, note how often you need to redirect or clarify |
| Workflows complete without correction | Run the same request 3-5 times. Compare outputs for consistency. |
| Consistent results across sessions | Can a new user accomplish the task on first try with minimal guidance? |

## Runtime Iteration Signals

After a skill is deployed, monitor for these signals to guide further iteration.

### Undertriggering

**Symptoms:** Skill doesn't load when it should, users manually enabling it, support questions about when to use it.

**Fixes:**
- Add more trigger phrases to description — include keywords for technical terms
- Ensure description is specific enough to distinguish from generic requests
- Test with paraphrased requests, not just exact trigger phrases

### Overtriggering

**Symptoms:** Skill loads for irrelevant queries, users disabling it, confusion about purpose.

**Fixes:**
- Make description more specific (narrow the domain)
- Use distinctive `WHEN:` phrases with quoted terms unique to this skill
- Evaluate concise scope wording against realistic positives and near-misses;
  negative boundaries are context-sensitive, not a universal model rule

### Execution Issues

**Symptoms:** Inconsistent results, API call failures, user corrections needed.

**Fixes:**
- Improve body instructions — add error handling, validation steps
- Add explicit quality checks before finalizing output
- Consider bundling validation scripts (code is deterministic; language interpretation isn't)
