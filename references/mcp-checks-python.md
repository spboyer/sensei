# Python MCP Server Checks

## SDK & API Usage
- Use `FastMCP` from `mcp.server.fastmcp`
- Initialize: `mcp = FastMCP("service_mcp")`
- Register tools with `@mcp.tool()` decorator

## Server Naming
- Format: `{service}_mcp` (lowercase with underscores)
- Examples: `github_mcp`, `slack_mcp`

## Tool Registration Pattern
```python
@mcp.tool(
    name="service_tool_name",
    annotations={
        "title": "Human-Readable Title",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True
    }
)
async def service_tool_name(params: InputModel) -> str:
    '''Comprehensive docstring with Args, Returns, Examples, Error Handling.'''
    pass
```

## Input Validation (Pydantic v2)
- Use Pydantic BaseModel for ALL tool inputs
- Use `Field(...)` with `description=`, `min_length=`, `max_length=`, `ge=`, `le=`
- Use `model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True, extra='forbid')`
- Use `@field_validator` with `@classmethod` (NOT deprecated `@validator`)
- Use `model_dump()` (NOT deprecated `dict()`)
- Use `ResponseFormat(str, Enum)` for format options

```python
class ListItemsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    query: str = Field(..., description="Search query", min_length=1)
    page: int = Field(1, description="Page number", ge=1)
    per_page: int = Field(30, description="Results per page", ge=1, le=100)
    response_format: ResponseFormat = Field(ResponseFormat.MARKDOWN)
```

## Pydantic v2 Checks (No Deprecated Patterns)
- ✅ `model_config = ConfigDict(...)` — NOT nested `class Config`
- ✅ `@field_validator` — NOT `@validator`
- ✅ `model_dump()` — NOT `dict()`
- ✅ Validators require `@classmethod`

## Type Hints
- Type hints on ALL function signatures
- Use `Optional`, `List`, `Dict`, `Any` from `typing`
- Return types annotated

## Async HTTP
- ✅ `httpx` with `AsyncClient` for async requests
- ❌ `requests` (blocks event loop)
- Always use `async with httpx.AsyncClient() as client:`
- Set timeout: `timeout=30.0`

## Docstrings
- Every tool MUST have comprehensive docstring
- Include: description, Args (with types), Returns (with schema), Examples, Error Handling
- Docstring auto-generates the tool description in MCP

## Response Formats
- Support `response_format` param via `ResponseFormat(str, Enum)`
- Markdown: headers, lists, human-readable timestamps
- JSON: `json.dumps(response, indent=2)`

## Context Parameter
- Inject `Context` for advanced features: `ctx: Context`
- `ctx.report_progress(progress, message)` for long operations
- `ctx.log_info()`, `ctx.log_error()` for logging
- `ctx.elicit()` for user input

## Error Handling
```python
def _handle_api_error(e: Exception) -> str:
    if isinstance(e, httpx.HTTPStatusError):
        match e.response.status_code:
            case 404: return "Error: Resource not found."
            case 403: return "Error: Permission denied."
            case 429: return "Error: Rate limit exceeded."
    return f"Error: {type(e).__name__}"
```
- Centralized `_handle_api_error` function
- Never expose tracebacks

## Resources (Optional)
- `@mcp.resource("uri://template/{param}")` for data access
- Use for static/semi-static data with simple parameters
- Tools for complex operations with validation

## Quality Checklist
- [ ] Uses `@mcp.tool()` with FastMCP
- [ ] All tools have Pydantic input models with `extra='forbid'`
- [ ] All tools have annotations
- [ ] Pydantic v2 patterns (no deprecated APIs)
- [ ] Type hints throughout
- [ ] `httpx` for async HTTP (not `requests`)
- [ ] Comprehensive docstrings
- [ ] Centralized error handler
- [ ] Response format support
- [ ] Pagination on list tools
