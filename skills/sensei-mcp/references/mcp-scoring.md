# MCP Server Scoring Criteria

Detailed scoring criteria for evaluating MCP server quality and compliance.

## Adherence Levels

### Low Adherence

A server is **Low** if:
- Missing >50% of checks
- No tool descriptions or incomplete input schemas
- No annotations, no error handling pattern

### Medium Adherence

A server is **Medium** if:
- Basic project structure present (package config, entry point, README)
- Tool descriptions present but incomplete
- Missing annotations or pagination support

### Medium-High Adherence (Target)

A server is **Medium-High** if all core checks pass:
- Proper naming convention
- Complete tool descriptions with input/output schemas
- Annotations on all tools
- Centralized error handling with `isError: true`
- Pagination on list endpoints
- Input validation via Zod/Pydantic/Description attrs

### High Adherence

A server is **High** if all Medium-High criteria plus:
- Evaluations file with 10+ QA pairs
- Security hardening (path sanitization, DNS rebinding protection)
- Comprehensive documentation with 3+ examples
- Response format options (text/JSON)

## Check Categories (11 total)

### 1. Project Structure & Naming

- **TS:** `{service}-mcp-server` — **Python:** `{service}_mcp` — **C#:** `{service}-mcp-server`
- Package config, entry point, README present

### 2. Tool Quality

- `snake_case` names with service prefix
- Explicit descriptions, input schemas (Zod/Pydantic/Description attrs)
- Annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- Response format support, CHARACTER_LIMIT respected

### 3. Error Handling

- Centralized handler, `isError: true` pattern
- HTTP status mapping, no leaked internals, resource cleanup

### 4. Pagination

- `limit`/`offset` params on list tools
- Metadata: `has_more`, `next_offset`, `total_count`
- Default limits 20–50, no unbounded loads

### 5. Security

- Env vars for secrets, schema validation
- Path sanitization, URL validation, DNS rebinding protection
- stderr logging for stdio transport

### 6. TypeScript-Specific

- `registerTool()` not deprecated `tool()`
- `strict: true`, no `any`, async/await, interfaces, Zod `.strict()`

### 7. Python-Specific

- `@mcp.tool()` with FastMCP, Pydantic v2
- Type hints, httpx, docstrings, no deprecated patterns

### 8. C#-Specific

- `[McpServerTool]` + `[Description]` attrs
- `AddMcpServer()` + transport, `WithToolsFromAssembly()`
- stderr logging, DI, McpServer injection
- Microsoft.Extensions.Hosting, ModelContextProtocol NuGet
- Structured output, OAuth 2.1, container publishing

### 9. Transport & Config

- stdio baseline, Streamable HTTP for remote
- No SSE (deprecated), timeouts configured, env var config

### 10. Documentation

- README with tool table, per-tool docs, auth instructions
- 3+ usage examples, security docs, rate limit info

### 11. Evaluations

- XML `qa_pair` file with 10+ questions
- Read-only, independent, non-destructive test cases
- Complex/multi-tool scenarios, stable expected answers

## Scoring Algorithm

```python
def score_mcp_server(server):
    checks = run_all_checks(server)
    pass_rate = checks.passed / checks.total

    if pass_rate < 0.5:
        return "Low"

    core_checks = ['naming', 'tool_descriptions', 'input_validation', 'error_handling']
    if not all(checks[c] for c in core_checks):
        return "Medium"

    advanced_checks = ['annotations', 'pagination', 'security', 'language_specific']
    if not all(checks[c] for c in advanced_checks):
        return "Medium-High"

    return "High"  # Has evaluations + full docs
```

## Weights

| Category | Weight | Notes |
|----------|--------|-------|
| Tool Quality | 25% | Most impactful for LLM usability |
| Error Handling | 15% | Critical for reliability |
| Security | 15% | Critical for production |
| Project Structure | 10% | Foundation |
| Language-Specific | 10% | Idiom compliance |
| Pagination | 10% | Scalability |
| Transport | 5% | Configuration |
| Documentation | 5% | Discoverability |
| Evaluations | 5% | Quality validation |
