---
name: sensei
description: "**WORKFLOW SKILL** - Improve and evaluate Agent Skills with portable validation, host profiles, resource analysis, and behavioral evidence. WHEN: \"run sensei\", \"sensei help\", \"improve skill\", \"fix frontmatter\", \"score skill\", \"analyze skill\", \"evaluate skill\". INVOKES: Sensei CLI, test runners, git. FOR SINGLE OPERATIONS: use the Sensei CLI directly."
---

# Sensei

Improve skills using the [Ralph loop](references/loop.md). For help, explain modes,
defaults, and checks from [configuration](references/configuration.md).
For source bundles and installation, see [distribution](references/distribution.md).

1. **Read** the target `SKILL.md`, references, tests, and repo-local instructions.
   Verify tooling exists before claiming it is missing. Count baseline tokens:
   From the Sensei checkout, pass the target repository root and a path relative
   to it: `npm run tokens -- count --root <target-repo> <skill-path>/SKILL.md`.
2. **Score** with `npm run tokens -- score --root <target-repo> <skill-path>`.
   Select `--profile=portable` or `--profile=copilot` explicitly when host
   extensions are present.
   Separate portable-spec
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
6. **Analyze resources** with
   `npm run tokens -- analyze --root <target-repo> <skill-path>`.
   Review contained links, symlinks, aggregate resource limits, script signals,
   and lifecycle evidence. Treat heuristic warnings as hypotheses, not failures.
7. **Check budgets** with
   `npm run tokens -- check --root <target-repo> <skill-path>/SKILL.md`.
   Report configured token-limit warnings separately from optional optimization
   suggestions. For MCP-aware skills, follow [MCP integration](references/mcp-integration.md).
8. **Summarize** profile states, findings, unavailable evidence, changes,
   diagnostics, tests, token deltas, and remaining suggestions.
   `score --emit-proof` records static evidence, not runtime quality or a security audit.
   Ask whether to commit, create an issue, or skip; do not discard edits unasked.
9. **Repeat** until the intended gates and tests pass, at most five iterations.
   Process batches sequentially and report failures explicitly.
