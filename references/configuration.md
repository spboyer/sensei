# Configuration

Project setup patterns for using Sensei.

## Directory Structure

Sensei expects skills in a standard structure:

```
project/
├── skills/                    # or .github/skills/
│   ├── skill-one/
│   │   ├── SKILL.md
│   │   └── references/
│   └── skill-two/
│       ├── SKILL.md
│       └── scripts/
└── tests/
    ├── skill-one/
    │   ├── triggers.test.ts   # or test_triggers.py
    │   └── prompts.md
    └── skill-two/
        └── prompts.md
```

## Auto-Detection

Sensei auto-detects the skills directory by checking:

1. `skills/` in project root
2. `.github/skills/`
3. Custom path specified in prompt

## Custom Paths

Override defaults in your prompt:

```
Run sensei on my-skill with skills in src/ai/skills/ and tests in spec/
```

Or be explicit:

```
Run sensei on my-skill
- Skills directory: custom/skills/
- Tests directory: custom/tests/
- Token limit: 800
```

## Test Framework Detection

Sensei detects test frameworks by checking:

1. `package.json` → Jest/Vitest (JavaScript/TypeScript)
2. `pytest.ini` or `pyproject.toml` → pytest (Python)
3. `go.mod` → Go testing
4. Fallback → Generic prompts.md

## Token Limits

| Setting | Default | Override Example |
|---------|---------|------------------|
| Soft limit | 500 | `--token-limit 800` |
| Hard limit | 5000 | (not configurable) |

## Scoring Target

| Setting | Default | Override Example |
|---------|---------|------------------|
| Target score | Medium-High | "target High adherence" |

## Iteration Limits

| Setting | Default | Override Example |
|---------|---------|------------------|
| Max iterations | 5 | "max 3 iterations" |

## Example Configurations

### Monorepo

```
Run sensei on all skills
- Skills: packages/ai/skills/
- Tests: packages/ai/tests/
```

### GitHub Actions Skills

```
Run sensei on my-action
- Skills: .github/skills/
- Tests: .github/tests/
```

### No Tests

```
Run sensei on my-skill --fast
```
(Creates prompts.md for manual review)

## Repo-local Policy

If the target repo prefers short trigger-phrase descriptions, drop a `.sensei.json` at its root:

```json
{ "descriptionStyle": "short-trigger" }
```

Or disable the minimum-length advisory:

```json
{ "advisoryOverrides": { "minDescriptionLength": false } }
```

`sensei score` detects this (and short-description cues in `AGENTS.md`) and waives the description-length floor. Disable with `--no-repo-policy`.

## Proof Artifact

`sensei score --emit-proof` writes `sensei-audit.md` next to the skill, summarizing the score, level, and detected repo policy. PR review bots and humans can link it from PR bodies. Override the path with `--emit-proof=path/to/file.md`. In the GitHub Action, set the `emit-proof` input to a path.

## Environment Variables

Sensei scripts respect these environment variables:

```bash
SENSEI_SKILLS_DIR=custom/skills/
SENSEI_TESTS_DIR=custom/tests/
SENSEI_TOKEN_LIMIT=800
```

## Integration with CI

Run Sensei in CI to validate skill compliance:

```yaml
# .github/workflows/skill-lint.yml
- name: Check skill compliance
  run: |
    python sensei/scripts/score_skill.py skills/*/SKILL.md --min-score medium-high
```
