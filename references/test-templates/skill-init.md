# Skill initialization template

Start with the portable minimum. Replace placeholders before validation.

```yaml
---
name: skill-name
description: "Extract the intended artifact or perform the specific workflow. Use when the request matches this scope."
---

# Skill title

Follow the operational steps here. Load detailed references only as needed.
```

## Optional Sensei routing conventions

For a workflow with meaningful tool relationships:

```yaml
---
name: skill-name
description: "**WORKFLOW SKILL** - Deploy prepared applications. WHEN: \"deploy app\", \"publish release\". INVOKES: deployment CLI. FOR SINGLE OPERATIONS: use the CLI directly."
---
```

Use `**UTILITY SKILL**` for a single-purpose helper or `**ANALYSIS SKILL**` for
read-only analysis. Prefixes and routing labels are conventions, not spec fields.
Descriptions may use YAML block scalars, but inline double-quoted descriptions
are this repository's distribution convention.

## Scaffold checklist

- Name matches the directory and portable naming constraints.
- Description states intent/scope, is non-empty, and fits 1024 characters.
- Optional metadata has string values; quote versions.
- Positive routing is concise; do not pad to 150 characters or require exclusions.
- Move detail into references as needed; 500 tokens is a soft authoring target.
- Add realistic positive prompts, paraphrases, and near-miss cases.
- Observe activation where possible; report unavailable evidence, not a pass.
- Compare output quality with a no-skill or previous-version baseline.

```bash
target_root="/path/to/target-repo"
mkdir -p "$target_root/skills/skill-name/references" "$target_root/tests/skill-name"
touch "$target_root/skills/skill-name/SKILL.md" "$target_root/tests/skill-name/prompts.md"
# Fill SKILL.md using the template above before validation.
npm run tokens -- score --root "$target_root" skills/skill-name
npm run tokens -- check --root "$target_root" skills/skill-name/SKILL.md
```

Run these commands from the Sensei checkout and set `target_root` to the target
repository's absolute path.

Choose [Jest](jest.md), [pytest](pytest.md), or [manual prompts](prompts.md)
according to the target project. Those templates are starting points, not proof
of real host behavior. Record negative boundaries from intended scope without
requiring negative frontmatter syntax. See [portability](../portability.md) before
adding host-specific invocation controls.
