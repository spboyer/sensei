---
name: sensei
description: "**WORKFLOW SKILL** - Iteratively improve skill frontmatter and routing clarity. WHEN: \"run sensei\", \"sensei help\", \"improve skill\", \"fix frontmatter\", \"score skill\", \"check skill tokens\". INVOKES: token CLI, test runners, git. FOR SINGLE OPERATIONS: use the token CLI directly."
---

# Sensei

Improve skills using the [Ralph loop](references/loop.md). For help, explain modes,
defaults, and checks from [configuration](references/configuration.md).

1. **Read** the target `SKILL.md`, references, tests, and repo-local instructions.
   Verify tooling exists before claiming it is missing. Count baseline tokens:
   `npm run tokens -- count <path>/SKILL.md` from the Sensei checkout.
2. **Score** with `npm run tokens -- score <path>`. Separate portable-spec
   diagnostics from [Sensei recommendations](references/scoring.md).
   Preserve `.sensei.json` and AGENTS.md short-description policy. A 150-character
   floor, 60-word target, type prefix, `WHEN:`, and 500-token target are heuristics,
   not specification requirements.
3. **Scaffold** missing tests using [templates](references/test-templates/skill-init.md).
   Use realistic positive prompts and close near-misses from intended scope;
   negative frontmatter syntax is not required.
4. **Improve** concise positive routing and operational instructions using
   [examples](references/examples.md). Keep descriptions non-empty and within
   1024 characters. Preserve meaningful boundaries; evaluate them on the target host.
   Check [portability](references/portability.md) before introducing host fields.
5. **Verify** with the target project's test runner; `--fast` skips tests but must
   report them as not run. GEPA mode uses optional keyword/proxy fitness, not
   observed host activation; follow [configuration](references/configuration.md).
6. **Check budgets** with `npm run tokens -- check <path>/SKILL.md`.
   Report configured token-limit warnings separately from optional optimization
   suggestions. For MCP-aware skills, follow [MCP integration](references/mcp-integration.md).
7. **Summarize** changes, diagnostics, tests, token deltas, and remaining suggestions.
   `score --emit-proof` records static evidence, not runtime quality or a security audit.
   Ask whether to commit, create an issue, or skip; do not discard edits unasked.
8. **Repeat** until the advisory target and tests pass, at most five iterations.
   Process batches sequentially and report failures explicitly.
