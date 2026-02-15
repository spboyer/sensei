---
name: sensei
description: |
  **WORKFLOW SKILL** - Context-aware quality auditor for Anthropic skills AND MCP servers.
  Auto-detects whether the target is a SKILL.md (frontmatter audit) or an MCP server project
  (code quality audit) and runs the appropriate improvement loop.
  USE FOR: run sensei, sensei help, check my skill, check my mcp, audit skill, audit MCP server,
  improve frontmatter, MCP best practices, score skill, MCP compliance, fix triggers, MCP tool naming.
  DO NOT USE FOR: creating new skills from scratch (use skill-creator), creating MCP servers
  from scratch (use mcp-builder), general code review, or non-skill/non-MCP files.
  INVOKES: token counting tools, test runners, file system tools, grep/glob, git commands.
  FOR SINGLE OPERATIONS: use token CLI directly for counts/checks, or code review for single files.
---

# Sensei

> "A true master teaches not by telling, but by refining."

Context-aware quality auditor that auto-detects what you're working on — skill frontmatter or MCP server code — and runs the right improvement loop until Medium-High compliance.

## Help

When user says "sensei help" or asks how to use sensei:

```
╔═══════════════════════════════════════════════════════════════╗
║  SENSEI - Skill & MCP Quality Auditor                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  USAGE:                                                       ║
║    Run sensei                        # Auto-detect target     ║
║    Run sensei on <name>              # Named skill or project ║
║    Run sensei on <name> --fast       # Skip tests/deep scan   ║
║    Run sensei on <skill1>, <skill2>  # Multiple targets       ║
║    Sensei check my skill             # Explicit skill mode    ║
║    Sensei check my mcp              # Explicit MCP mode      ║
║                                                               ║
║  MODES (auto-detected):                                       ║
║                                                               ║
║  ┌─ SKILL MODE (finds SKILL.md) ──────────────────────────┐  ║
║  │  Audits frontmatter: triggers, anti-triggers, tokens,  │  ║
║  │  description length, routing clarity, MCP integration.  │  ║
║  │  Loop: READ → SCORE → IMPROVE → TEST → SUMMARY        │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌─ MCP MODE (finds MCP SDK dependency) ──────────────────┐  ║
║  │  Audits code quality: tool naming, schemas, errors,    │  ║
║  │  pagination, security, annotations, documentation.     │  ║
║  │  Loop: DETECT → SCAN → SCORE → IMPROVE → SUMMARY      │  ║
║  │  Languages: TypeScript, Python, C#                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  TARGET: Medium-High for both modes                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Step 0: AUTO-DETECT MODE

Before running any loop, determine the audit mode:

1. **Explicit mode** — User said "skill" or "mcp" → use that mode
2. **Named target** — Look for `skills/{name}/SKILL.md` (skill mode). If not found, check if `{name}/` has MCP SDK dependency (MCP mode)
3. **Current directory** — Scan cwd: if `SKILL.md` exists → skill mode. If `package.json` has `@modelcontextprotocol/sdk`, `pyproject.toml` has `mcp`, or `*.csproj` has `ModelContextProtocol` → MCP mode
4. **Ambiguous** — Both indicators present → ask the user

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Skills directory | `skills/` or `.github/skills/` | Where SKILL.md files live |
| Tests directory | `tests/` | Where test files live |
| Target score | Medium-High | Minimum compliance level |
| Max iterations | 5 | Per-target loop limit |
| Token soft limit | 500 | Skill mode: target for SKILL.md |
| Token hard limit | 5000 | Skill mode: maximum for SKILL.md |

---

## SKILL MODE

Audits skill frontmatter compliance using the Ralph loop pattern.

### Skill Loop

For each skill, loop until score >= Medium-High:

1. **READ** — Load `{skills-dir}/{skill-name}/SKILL.md`, count tokens via `npm run tokens -- count`
2. **SCORE** — Check description length (>= 150 chars), USE FOR triggers, DO NOT USE FOR anti-triggers, INVOKES routing clarity. See [references/scoring.md](references/scoring.md)
3. **CHECK** — If score >= Medium-High AND tests pass → skip to SUMMARY
4. **SCAFFOLD** — Create test files from [references/test-templates/](references/test-templates/) if missing
5. **IMPROVE** — Enhance frontmatter: add triggers, anti-triggers, keep description < 1024 chars
6. **TEST** — Run tests (`npm test`, `pytest`, or `waza run`). Skip with `--fast`
7. **TOKENS** — Verify budget: SKILL.md < 500 (soft) / 5000 (hard), references < 1000 each
8. **MCP INTEGRATION** — If INVOKES present: check for MCP Tools Used table, prerequisites, CLI fallback, name collision. See [references/mcp-integration.md](references/mcp-integration.md)
9. **SUMMARY** — Before/after comparison box
10. **PROMPT** — [C]ommit / [I]ssue / [S]kip
11. **REPEAT** — Until Medium-High or max iterations

### Skill Scoring

| Score | Requirements |
|-------|--------------|
| **Low** | Description < 150 chars OR no triggers |
| **Medium** | Description >= 150 chars AND has trigger keywords |
| **Medium-High** | Has "USE FOR:" AND "DO NOT USE FOR:" |
| **High** | Medium-High + INVOKES + FOR SINGLE OPERATIONS |

### Frontmatter Template

```yaml
---
name: skill-name
description: |
  **WORKFLOW SKILL** - What the skill does.
  USE FOR: phrase1, phrase2, phrase3.
  DO NOT USE FOR: scenario1 (use other-skill), scenario2.
  INVOKES: tools/MCP servers used.
  FOR SINGLE OPERATIONS: when to bypass.
---
```

Skill type prefixes: `**WORKFLOW SKILL**`, `**UTILITY SKILL**`, `**ANALYSIS SKILL**`

---

## MCP MODE

Audits MCP server projects for quality and best practices.

### Language Detection

| File | Language | SDK Indicator |
|------|----------|---------------|
| `package.json` | TypeScript | `@modelcontextprotocol/sdk` |
| `pyproject.toml` / `setup.py` | Python | `mcp` dependency |
| `*.csproj` | C# | `ModelContextProtocol` package |

### MCP Loop

For each project, loop until score >= Medium-High:

1. **DETECT** — Identify language from project files
2. **SCAN** — Analyze tool registrations, schemas, descriptions, error handling, project structure
3. **SCORE** — Evaluate all check categories. See [references/mcp-scoring.md](references/mcp-scoring.md)
4. **CHECK** — If score >= Medium-High → skip to SUMMARY
5. **IMPROVE** — Fix: standardize tool names (snake_case, service prefix), add input schemas, improve descriptions, add error handling, add pagination to list tools
6. **VERIFY** — Re-scan and run build (`npm run build` / `dotnet build` / `python -m py_compile`)
7. **SUMMARY** — Before/after comparison box
8. **PROMPT** — [C]ommit / [I]ssue / [S]kip

### MCP Scoring

| Score | Requirements |
|-------|--------------|
| **Low** | Missing >50% of checks |
| **Medium** | Basic structure, incomplete descriptions |
| **Medium-High** | All core checks pass |
| **High** | Medium-High + evaluations + security hardening |

### MCP Check Categories

Project Structure, Tool Quality, Error Handling, Pagination, Security, Transport, Language-Specific, Documentation, Testing/Evaluations.

Language-specific checks: [mcp-checks-ts.md](references/mcp-checks-ts.md) | [mcp-checks-python.md](references/mcp-checks-python.md) | [mcp-checks-csharp.md](references/mcp-checks-csharp.md)

---

## Summary Output

Both modes produce a before/after comparison:

```
╔═══════════════════════════════════════════════════════════════╗
║  SENSEI SUMMARY: {target-name}              Mode: Skill|MCP  ║
╠═══════════════════════════════════════════════════════════════╣
║  BEFORE                         AFTER                        ║
║  ──────                         ─────                        ║
║  Score: Low                     Score: Medium-High            ║
║  [mode-specific metrics]                                      ║
╚═══════════════════════════════════════════════════════════════╝
```

## Commit Messages

```
sensei: improve {skill-name} frontmatter       # Skill mode
sensei: audit {project-name}                    # MCP mode
```

## Reference Documentation

### Skill References
- [scoring.md](references/scoring.md) - Skill scoring criteria
- [mcp-integration.md](references/mcp-integration.md) - MCP integration patterns for skills
- [loop.md](references/loop.md) - Ralph loop details
- [examples.md](references/examples.md) - Skill before/after examples
- [configuration.md](references/configuration.md) - Project setup patterns
- [test-templates/](references/test-templates/) - Test scaffolding

### MCP References
- [mcp-scoring.md](references/mcp-scoring.md) - MCP scoring algorithm
- [mcp-checks-ts.md](references/mcp-checks-ts.md) - TypeScript checks
- [mcp-checks-python.md](references/mcp-checks-python.md) - Python checks
- [mcp-checks-csharp.md](references/mcp-checks-csharp.md) - C# checks
- [mcp-project-structure.md](references/mcp-project-structure.md) - Expected layouts
- [mcp-evaluation-guide.md](references/mcp-evaluation-guide.md) - Writing evaluations
- [mcp-examples.md](references/mcp-examples.md) - MCP before/after examples
- [mcp-testing.md](references/mcp-testing.md) - Testing strategy

## Built-in Scripts

```bash
npm run tokens count              # Count all markdown files
npm run tokens check              # Check against token limits
npm run tokens suggest            # Get optimization suggestions
npm run tokens compare            # Compare with git history
```
