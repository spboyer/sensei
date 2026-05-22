# Copilot Instructions

Follow `AGENTS.md` as the canonical contributor guidance for this repository. This file summarizes the highest-impact rules for GitHub Copilot and Copilot Coding Agent.

## Project Context

This repository is **Sensei**, an Agent Skill that improves `SKILL.md` frontmatter compliance. The root `SKILL.md` is the runtime skill; `README.md` is human-facing documentation; `references/` contains progressive-disclosure docs; `scripts/` contains the TypeScript token/scoring CLI and optional GEPA evaluator.

## Skill Authoring Rules

- Keep `SKILL.md` focused on operational instructions, not README-style documentation.
- Put detailed explanations, examples, and templates under `references/`.
- Preserve Agent Skills frontmatter format:

  ```yaml
  ---
  name: skill-name
  description: "**WORKFLOW SKILL** - What the skill does. WHEN: \"trigger 1\", \"trigger 2\", \"trigger 3\". INVOKES: tools used. FOR SINGLE OPERATIONS: when to bypass."
  ---
  ```

- Prefer positive routing with `WHEN:` / `USE FOR:` trigger phrases.
- Avoid `DO NOT USE FOR:` in descriptions because it can contaminate skill routing.
- Keep description fields under 1024 characters.
- Use inline double-quoted descriptions, not folded YAML scalars.
- Use skill type prefixes consistently: `**WORKFLOW SKILL**`, `**UTILITY SKILL**`, or `**ANALYSIS SKILL**`.

## Token and Scoring Expectations

- Target `SKILL.md` at about 500 tokens; hard limit is 5000 tokens.
- Keep `references/*.md` near 2000 tokens or less.
- Target Medium-High or High advisory score:
  - Medium-High: trigger phrases with a concise description.
  - High: Medium-High plus routing clarity such as `INVOKES:` and `FOR SINGLE OPERATIONS:`.

## Validation Commands

Run the narrowest relevant checks after changes:

```bash
npm run tokens -- check [paths...]
npm run tokens -- score .
npm test
```

Use `npm run tokens -- count [paths...]`, `npm run tokens -- suggest [paths...]`, or `npm run tokens -- compare [refs...]` when working on token budgets or optimization.

## Change Guidelines

- Make focused changes and avoid unrelated rewrites.
- Update docs only when they are directly related to the change.
- Reuse existing patterns in `scripts/src/tokens/commands/` before adding new helpers.
- If adding test framework support, add a template under `references/test-templates/` and document it in `references/configuration.md`.
- For MCP-aware skills, include tool prerequisites, fallback guidance, and collision checks as described in `references/mcp-integration.md`.
