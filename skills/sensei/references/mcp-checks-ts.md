# TypeScript MCP Server Checks

## SDK & API Usage

- **MUST** use `server.registerTool()` (modern API)
- **MUST NOT** use deprecated `server.tool()` or `server.setRequestHandler(ListToolsRequestSchema, ...)`
- Import from `@modelcontextprotocol/sdk/server/mcp.js`
- Use `McpServer` class for server initialization

## Server Naming

- Format: `{service}-mcp-server` (lowercase with hyphens)
- Examples: `github-mcp-server`, `slack-mcp-server`

## Tool Registration Pattern

```typescript
server.registerTool(
  "service_tool_name",
  {
    title: "Human-Readable Title",
    description: "Detailed description with Args, Returns, Examples, Error Handling sections",
    inputSchema: ZodSchema,
    outputSchema: ZodOutputSchema, // where possible
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    /* handler */
  }
);
```

## Input Validation (Zod)

- Use Zod schemas for ALL tool inputs
- Add `.describe()` to every field
- Use `.strict()` to forbid extra fields
- Add constraints: `.min()`, `.max()`, `.email()`, etc.
- Use `z.nativeEnum()` for enums
- Provide defaults with `.default()`

```typescript
enum ResponseFormat { Markdown = "markdown", Json = "json" }

const InputSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  page: z.number().int().min(1).default(1).describe("Page number"),
  per_page: z.number().int().min(1).max(100).default(30).describe("Results per page"),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.Markdown)
    .describe("Output format: markdown or json"),
}).strict();
```

## TypeScript Strictness

- `strict: true` in tsconfig.json
- Target ES2022, module Node16
- No `any` types — use `unknown` instead
- Define interfaces for all data structures
- Use optional chaining `?.` and nullish coalescing `??`

## Async/Await & HTTP

- Always async/await (no `.then()` chains)
- Use `axios` or `fetch` with proper timeout (30s default)

## Response Formats

- Support `response_format` param: `"markdown"` | `"json"`
- Markdown: headers, lists, human-readable timestamps, display names with IDs
- JSON: complete structured data, consistent field names

## Structured Output

- Define `outputSchema` where possible
- Return `structuredContent` alongside text `content`

## CHARACTER_LIMIT

- Define constant (25000 chars default)
- Truncate with message when exceeded
- Suggest pagination/filters in truncation message

## Error Handling

```typescript
function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    switch (error.response?.status) {
      case 404: return "Error: Resource not found.";
      case 403: return "Error: Permission denied.";
      case 429: return "Error: Rate limit exceeded.";
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}
```

- Return `{ isError: true, content: [...] }` for tool errors
- Never expose stack traces

## Package Configuration

```json
{
  "type": "module",
  "main": "dist/index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12",
    "zod": "^3.25",
    "axios": "^1.9"
  }
}
```

tsconfig.json: `strict: true`, `target: "ES2022"`, `module: "Node16"`

## Quality Checklist

- [ ] Uses `registerTool()` not deprecated API
- [ ] All tools have Zod input schemas with `.strict()`
- [ ] All tools have annotations
- [ ] `strict: true` in tsconfig.json
- [ ] No `any` types
- [ ] Centralized error handler
- [ ] Response format support (JSON + Markdown)
- [ ] CHARACTER_LIMIT defined
- [ ] Pagination on list tools
- [ ] Async/await throughout
