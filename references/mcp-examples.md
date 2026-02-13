# MCP Audit Examples

Before and after examples of MCP server quality improvements.

## Example 1: TypeScript Server (Low → Medium-High)

### Before

```typescript
server.tool("search", "Search stuff", { query: z.string() },
  async ({ query }) => {
    const data = await fetch(`/api?q=${query}`);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);
```

**Issues:**
- Generic name, no service prefix
- No annotations, no Zod constraints
- No error handling or pagination
- No response format options
- Score: **Low**

### After

```typescript
const SearchInputSchema = z.object({
  query: z.string().min(2).max(200).describe("Search query"),
  limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
  offset: z.number().int().min(0).default(0).describe("Pagination offset"),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
}).strict();

server.registerTool(
  "github_search_repos",
  {
    title: "Search GitHub Repositories",
    description: "Search repositories by name, topic, or language...",
    inputSchema: SearchInputSchema,
    annotations: {
      readOnlyHint: true, destructiveHint: false,
      idempotentHint: true, openWorldHint: true
    }
  },
  async (params) => {
    try {
      const data = await makeApiRequest("search/repos", "GET", undefined, params);
      return formatResponse(data, params.response_format);
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: handleApiError(error) }] };
    }
  }
);
```

**Improvements:**
- Service-prefixed name (`github_search_repos`)
- Zod schema with constraints and `.describe()`
- Annotations for tool behavior hints
- Error handling with structured response
- Pagination via `limit`/`offset`
- Score: **Medium-High**

---

## Example 2: Python Server (Low → Medium-High)

### Before

```python
@mcp.tool()
def get_users(query):
    data = requests.get(f"{URL}/users?q={query}")
    return str(data.json())
```

**Issues:**
- Sync `requests` blocks event loop
- No type hints or Pydantic model
- No error handling, no docstring, no annotations
- Score: **Low**

### After

```python
class UserSearchInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    query: str = Field(..., description="Search query", min_length=2, max_length=200)
    limit: Optional[int] = Field(default=20, ge=1, le=100)
    offset: Optional[int] = Field(default=0, ge=0)

@mcp.tool(name="service_search_users", annotations={"readOnlyHint": True})
async def search_users(params: UserSearchInput) -> str:
    """Search users by name or email. Returns formatted user list."""
    try:
        data = await _make_api_request("users/search", params={"q": params.query})
        return format_response(data, params.limit)
    except Exception as e:
        return _handle_api_error(e)
```

**Improvements:**
- Async with `httpx` instead of sync `requests`
- Pydantic model with constraints
- Service-prefixed name, annotations, docstring
- Score: **Medium-High**

---

## Example 3: C# Server (Low → Medium-High)

### Before

```csharp
[McpServerToolType]
public static class Tools
{
    [McpServerTool]
    public static string Search(string query) =>
        new HttpClient().GetStringAsync($"/api?q={query}").Result;
}
```

**Issues:**
- Blocking `.Result`, manual `HttpClient` (no DI)
- No `Description`, no snake_case name, no error handling
- Score: **Low**

### After

```csharp
[McpServerToolType]
public static class UserTools
{
    [McpServerTool(Name = "service_search_users"),
     Description("Search users by name or email")]
    public static async Task<string> SearchUsers(
        IHttpClientFactory httpClientFactory,
        [Description("Search query (min 2 chars)")] string query,
        [Description("Max results (1-100)")] int limit = 20,
        CancellationToken ct = default)
    {
        try {
            var client = httpClientFactory.CreateClient("ServiceApi");
            var response = await client.GetAsync($"users?q={query}&limit={limit}", ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync(ct);
        } catch (HttpRequestException ex) {
            return $"Error: {ex.Message}";
        }
    }
}
```

**Improvements:**
- Async with `IHttpClientFactory` via DI
- `Description` attributes, snake_case name
- Error handling, `CancellationToken` support
- Score: **Medium-High**

---

## Summary Output Example

```
╔══════════════════════════════════════════════════════════════════╗
║  SENSEI-MCP AUDIT: github-mcp-server                            ║
╠══════════════════════════════════════════════════════════════════╣
║  BEFORE                          AFTER                           ║
║  ──────                          ─────                           ║
║  Score: Low                      Score: Medium-High              ║
║  Tools: 5                        Tools: 5                        ║
║  With annotations: 0/5           With annotations: 5/5           ║
║  With schemas: 1/5               With schemas: 5/5               ║
║  Error handler: ✗                Error handler: ✓                ║
║  Pagination: 0/3 list tools      Pagination: 3/3 list tools      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Anti-Patterns

### ❌ Generic Tool Names

`search`, `get_data`, `list_items` — No service prefix, will collide.

### ❌ No Error Handling

Raw exceptions bubble up, exposing internals to LLM.

### ❌ Unbounded Results

List tools return ALL results with no limit/pagination.

### ❌ Sync HTTP in Python

Using `requests` instead of `httpx` blocks the event loop.

### ❌ `any` Types in TypeScript

Loses type safety, prevents proper schema generation.
