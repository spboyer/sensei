---
name: sensei-mcp
description: |
  **WORKFLOW SKILL** - Audit MCP server projects for quality, compliance, and best practices
  using an iterative improvement loop. Checks tool naming, descriptions, annotations, error
  handling, pagination, security, project structure, and documentation for TypeScript, Python,
  and C# MCP servers.
  USE FOR: "audit MCP server", "check MCP quality", "MCP best practices", "review MCP tools",
  "MCP compliance", "improve MCP server", "sensei-mcp", "MCP tool naming", "MCP annotations".
  DO NOT USE FOR: improving skill frontmatter (use sensei), creating MCP servers from scratch
  (use mcp-builder), general code review, or non-MCP projects.
  INVOKES: file system tools, grep/glob for code analysis, git commands.
  FOR SINGLE OPERATIONS: use code review tools directly for single-file checks.
---

# Sensei-MCP

> "Quality is not an act, it is a habit." — Aristotle

Audits MCP server projects for quality and compliance — iteratively improving tool naming, descriptions, annotations, error handling, and documentation until the project reaches Medium-High compliance.

## Help

When user says "sensei-mcp help" or asks how to use sensei-mcp:

```
╔══════════════════════════════════════════════════════════════════╗
║  SENSEI-MCP - MCP Server Quality Auditor                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  USAGE:                                                          ║
║    Run sensei-mcp on <project-path>       # Single project       ║
║    Run sensei-mcp on <path> --fast        # Skip deep analysis   ║
║                                                                  ║
║  WHAT IT DOES:                                                   ║
║    1. DETECT  - Identify language (TS, Python, C#)               ║
║    2. SCAN    - Analyze project structure and code                ║
║    3. SCORE   - Evaluate all check categories                    ║
║    4. REPORT  - Show compliance findings                         ║
║    5. IMPROVE - Fix automatable issues                           ║
║    6. VERIFY  - Re-scan and run build if available               ║
║    7. SUMMARY - Before/after comparison                          ║
║    8. PROMPT  - Commit, Create Issue, or Skip                    ║
║                                                                  ║
║  TARGET SCORE: Medium-High                                       ║
║                                                                  ║
║  CHECK CATEGORIES:                                               ║
║    ✓ Project Structure      ✓ Tool Quality                       ║
║    ✓ Error Handling          ✓ Pagination                         ║
║    ✓ Security                ✓ Transport                          ║
║    ✓ Language-Specific       ✓ Documentation                     ║
║      (TS / Python / C#)     ✓ Evaluations                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

## Configuration

Sensei-MCP uses these defaults (override by specifying in your prompt):

| Setting | Default | Description |
|---------|---------|-------------|
| Target score | Medium-High | Minimum compliance level |
| Max iterations | 5 | Per-project loop limit |
| Supported languages | TypeScript, Python, C# | Auto-detected from project files |

## Language Detection

Auto-detect the MCP server language by checking (in order):

| File | Language | SDK Indicator |
|------|----------|---------------|
| `package.json` | TypeScript | `@modelcontextprotocol/sdk` |
| `pyproject.toml` / `setup.py` | Python | `mcp` dependency |
| `*.csproj` | C# | `ModelContextProtocol` package |

## The Audit Loop

For each project, execute this loop until score >= Medium-High:

### Step 1: DETECT
Identify the MCP server language by scanning for `package.json` with `@modelcontextprotocol`, `pyproject.toml` with `mcp`, or `*.csproj` with `ModelContextProtocol`.

### Step 2: SCAN
Analyze project structure, tool registrations, resource definitions, prompt templates, and configuration files. Map all tool names, descriptions, and input schemas.

### Step 3: SCORE
Evaluate all check categories: Project Structure, Tool Quality, Error Handling, Pagination, Security, Language-Specific, Transport, Documentation, and Evaluations. Generate a compliance report.

### Step 4: CHECK
If score >= Medium-High → skip to SUMMARY step.

### Step 5: IMPROVE
Fix automatable issues:
- Standardize tool naming (lowercase, hyphens, verb-noun)
- Add missing `inputSchema` annotations
- Improve tool descriptions (action verb, clear purpose, param docs)
- Add error handling patterns where missing
- Add pagination to list operations

### Step 6: VERIFY
Re-scan the project and run build if available:
```bash
npm run build          # TypeScript
python -m py_compile   # Python
dotnet build           # C#
```

### Step 7: SUMMARY
Display before/after comparison:

```
╔══════════════════════════════════════════════════════════════════╗
║  SENSEI-MCP SUMMARY: {project-name}                              ║
╠══════════════════════════════════════════════════════════════════╣
║  BEFORE                          AFTER                           ║
║  ──────                          ─────                           ║
║  Score: Low                      Score: Medium-High              ║
║  Tool naming: 2/8                Tool naming: 8/8                ║
║  Descriptions: 3/8              Descriptions: 8/8               ║
║  Error handling: 1/8            Error handling: 7/8              ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 8: PROMPT
Ask how to proceed:
- **[C] Commit** - Save with message `sensei-mcp: audit {project-name}`
- **[I] Create Issue** - Open issue with findings and recommendations
- **[S] Skip** - Discard changes

## Scoring Quick Reference

| Score | Requirements |
|-------|--------------|
| **Low** | Missing >50% of checks across categories |
| **Medium** | Basic structure present, incomplete descriptions |
| **Medium-High** | All core checks pass ← TARGET |
| **High** | Medium-High + evaluations + security hardening |

## Reference Documentation

- [mcp-scoring.md](references/mcp-scoring.md) - Scoring algorithm and check weights
- [mcp-checks-ts.md](references/mcp-checks-ts.md) - TypeScript-specific checks
- [mcp-checks-python.md](references/mcp-checks-python.md) - Python-specific checks
- [mcp-checks-csharp.md](references/mcp-checks-csharp.md) - C#-specific checks
- [mcp-project-structure.md](references/mcp-project-structure.md) - Expected project layouts
- [mcp-evaluation-guide.md](references/mcp-evaluation-guide.md) - Writing MCP evaluations
- [mcp-examples.md](references/mcp-examples.md) - Before/after audit examples
- [mcp-testing.md](references/mcp-testing.md) - Testing strategy (unit, schema, evaluations)

## Commit Messages

```
sensei-mcp: audit {project-name}
```
