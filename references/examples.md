# Frontmatter examples

These illustrate Sensei authoring advice, not additional specification rules.
Prefer concise intent and scope, then evaluate on the intended host.

## Minimal portable skill

```yaml
---
name: pdf-processor
description: Extract text, rotate pages, and merge existing PDF documents.
---
```

Only `name` and `description` are required. A useful short description can be
valid without a prefix, `WHEN:`, license, or version.

## More distinctive positive routing

Before:

```yaml
description: "Process files for various tasks."
```

After:

```yaml
description: "Extract PDF text, rotate pages, and merge existing PDFs. WHEN: \"extract PDF text\", \"rotate PDF pages\", \"merge PDFs\"."
```

This makes intended use clearer without mandating an arbitrary character floor.

## Optional workflow routing

```yaml
---
name: azure-deploy
description: "**WORKFLOW SKILL** - Deploy prepared Azure applications. WHEN: \"deploy to Azure\", \"azd up\", \"publish to Azure\". INVOKES: Azure deployment tools. FOR SINGLE OPERATIONS: use the deployment CLI directly."
compatibility: Requires Azure credentials and the deployment CLI
metadata:
  version: "1.0"
---
```

Tool access and credentials still depend on the host's runtime permissions.
`INVOKES:` is prose, not a permission grant.

## Boundaries belong in evaluations

For the PDF example, try realistic positives such as "Merge these two signed
PDFs" and paraphrases such as "Combine the attached documents into one PDF."
Near-misses might include "Create a new PDF invoice from this spreadsheet" or
"OCR this scanned page" if those operations are outside the skill's actual scope.
Also include unrelated requests.

Do not generate negative prompts solely by copying a mandatory `DO NOT USE FOR:`
clause. Such a clause is optional; whether it helps depends on deployment evidence.
Keyword tests alone do not prove that the host activated the skill.

## Common corrections

| Problem | Correction |
|---|---|
| Description exceeds 1024 characters | Shorten discovery text; move procedures to the body |
| Numeric metadata value | Quote it: `version: "1.0"` |
| `compatibility: ""` | Omit it unless environment requirements exist |
| Duplicate YAML fields | Keep one unambiguous definition |
| Long list of overlapping domains | State the workflow's distinctive purpose |
| Host control in portable frontmatter | Separate host-specific configuration; see [portability](portability.md) |

When Sensei is installed separately from the target project, run from the Sensei
checkout and pass the target root plus paths relative to it:

```bash
npm run tokens -- score --root <target-repo> <skill-path>
npm run tokens -- check --root <target-repo> <skill-path>/SKILL.md
```

For example, use `--root ../my-project .github/skills/pdf-processor` when the
target repo is `../my-project`. `count` accepts the same `--root` option.
Do not describe a static score as runtime or security validation.
