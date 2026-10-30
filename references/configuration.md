# Configuration

Project setup patterns for using Sensei.

## Workflow invocation

These are requests to the skill, not token CLI flags:

```text
Run sensei on my-skill
Run sensei on skill-a, skill-b
Run sensei on all Low-adherence skills
Run sensei on all skills
Run sensei on my-skill --fast
Run sensei on my-skill --gepa
```

Default target is Medium-High (advisory), with at most five iterations per skill.
`--fast` skips tests and reports them as not run. `--gepa` replaces template
editing with optional proxy-based optimization; it does not observe activation.
For help, explain modes and show the token CLI commands below. Process batches
sequentially and ask before commits or discarding changes.

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
| Workflow soft target | 500 | Specify a target in the workflow prompt |
| Configured check limit | `.token-limits.json` | `--config=path/to/limits.json` |

The 500-token target is advisory; the spec recommends under 5000 tokens, not a
mandatory hard limit. `check --strict` enforces your configured thresholds, while
`suggest` emits optional ideas. See [scoring](scoring.md).

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

Or express the same preference with the supported policy override:

```json
{ "advisoryOverrides": { "minDescriptionLength": false } }
```

`sensei score` reports this policy (and short-description cues in `AGENTS.md`)
in CLI output and proof artifacts. The current portable scorer has no
150-character minimum; the authoring loop should preserve useful short descriptions.
Disable policy detection with `--no-repo-policy`.

## Proof Artifact

`sensei score --emit-proof` writes `sensei-audit.md` next to the skill, summarizing the frontmatter, token/module counts, spec checks, and advisory checks. PR review bots and humans can link it from PR bodies. Override the path with `--emit-proof=path/to/file.md`. In the GitHub Action, set the `emit-proof` input to a path.

Newly merged flags may not be in published packages. The composite Action runs
npm (`package-version: latest` by default), not its checkout's CLI. Check both the
Action ref and package version; use current checkout commands for unreleased
behavior. See [release status](../README.md#distribution-and-release-status).

## Optional behavioral evaluation

From a current checkout with script dependencies installed:

```bash
npm run tokens -- eval manifest.json --root=/path/to/project --format=json
```

Supply a trusted host adapter, repeated positive/near-miss cases, literal output
assertions, and a without-skill or prior-version baseline. Missing activation
evidence cannot pass. Adapters run local code with inherited credentials and
own trace authenticity and session isolation. See the
[manifest, protocol, and smoke test](evaluation.md). GEPA fitness is separate.

## Optional GEPA optimization

GEPA uses keyword/proxy fitness rather than observed host activation. From the
Sensei checkout, with Python and uv available:

```bash
uv run scripts/src/gepa/auto_evaluator.py score --skill my-skill --skills-dir skills --tests-dir tests
uv run --with-requirements scripts/src/gepa/requirements.txt scripts/src/gepa/auto_evaluator.py optimize --skill my-skill --skills-dir skills --tests-dir tests
```

Optimization requires model access and the optional GEPA version in the existing
requirements file. If your index cannot supply it, optimization is unavailable.
Score-only mode uses the standard library and does not make LLM calls.
Use explicit paths: the token CLI does not implement `SENSEI_*` environment
variables or `--token-limit`.

## Integration with CI

Run Sensei in CI to validate skill compliance:

```yaml
# .github/workflows/skill-lint.yml
- name: Check skill compliance
  run: |
    npx @spboyer/sensei check --root . --config .token-limits.json --strict
```

This enforces configured token limits, not an advisory score threshold.
Use `npx @spboyer/sensei score skills/my-skill --format=json` for separate
portable-spec diagnostics and optional recommendations.
