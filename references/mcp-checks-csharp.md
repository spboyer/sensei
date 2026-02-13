# C# MCP Server Checks

## SDK & Packages
- Use `ModelContextProtocol` NuGet package
- Use `ModelContextProtocol.AspNetCore` for HTTP transport
- Use `Microsoft.Extensions.Hosting` for lifecycle management
- Target .NET 9+ (10+ recommended)

## Server Naming
- Format: `{service}-mcp-server` (matching TypeScript convention)
- Examples: `github-mcp-server`, `slack-mcp-server`
- NuGet package name should match

## Server Initialization
```csharp
var builder = Host.CreateApplicationBuilder(args);
builder.Logging.AddConsole(options => {
    options.LogToStandardErrorThreshold = LogLevel.Trace;
});
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();
await builder.Build().RunAsync();
```

## Tool Registration Pattern
```csharp
[McpServerToolType]
public static class ServiceTools
{
    [McpServerTool(Name = "service_tool_name"), Description("What the tool does")]
    public static async Task<string> ToolMethod(
        [Description("Parameter description")] string param1,
        [Description("Optional param")] int limit = 20)
    {
        // Implementation
    }
}
```

## Tool Naming
- Methods are PascalCase by C# convention
- Use `[McpServerTool(Name = "snake_case_name")]` to override for MCP
- Include service prefix: `service_action_resource`
- Class-level: `[McpServerToolType]` marks the containing class

## Descriptions
Two approaches (both valid):
1. **`[Description]` attribute** from `System.ComponentModel` — on method and parameters
2. **XML comments** on `partial` methods — auto-generates `[Description]` attributes
```csharp
// Approach 1: Attribute
[McpServerTool, Description("Search users by name or email")]
public static string SearchUsers([Description("Search query")] string query) => ...;

// Approach 2: XML comments (requires partial)
/// <summary>Search users by name or email</summary>
/// <param name="query">Search query</param>
[McpServerTool]
public static partial string SearchUsers(string query);
```

## Dependency Injection
- Services injected automatically via method parameters
- Register in `builder.Services`: `AddHttpClient()`, `AddSingleton<T>()`, etc.
- `McpServer` can be injected for sampling/elicitation
- `CancellationToken` parameter supported for cancellation

```csharp
[McpServerTool, Description("Get data from API")]
public static async Task<string> GetData(
    HttpClient httpClient,           // Injected via DI
    McpServer server,                // Injected - for sampling
    [Description("ID")] string id,
    CancellationToken ct)            // Cancellation support
```

## Logging
- **CRITICAL**: For stdio transport, logs MUST go to stderr, not stdout
- Use `LogToStandardErrorThreshold = LogLevel.Trace`
- Use `ILogger<T>` via DI for structured logging

## Error Handling
```csharp
// Protocol-level errors
throw new McpProtocolException("Missing argument 'id'", McpErrorCode.InvalidParams);

// Tool-level errors — return error content
return JsonSerializer.Serialize(new { error = "Resource not found", suggestion = "Check the ID" });
```
- Use `McpProtocolException` with `McpErrorCode` for protocol errors
- Return descriptive error strings for tool-level errors
- Map HTTP status codes to user-friendly messages

## Structured Output (2025-06-18 spec)
- Return typed objects that serialize to JSON
- Use `System.Text.Json` with `JsonSerializerContext` for AOT compatibility
- Source-generated serialization preferred

## Transport Options
- `.WithStdioServerTransport()` — local/CLI tools
- `.WithAspNetCoreServerTransport()` — HTTP/remote (requires `ModelContextProtocol.AspNetCore`)
- No SSE (deprecated)

## Publishing & Deployment
- **NuGet**: Package as tool with `.mcp/server.json` metadata
- **Container**: `dotnet publish /t:PublishContainer` with multi-arch support
- **AOT**: Native AOT for smaller, faster deployments
- **Self-contained**: `dotnet publish -r <rid> --self-contained`

## Quality Checklist
- [ ] Uses `[McpServerToolType]` + `[McpServerTool]` attributes
- [ ] All tools and params have `[Description]` (or XML comments on `partial`)
- [ ] Tool names are snake_case via `Name = "..."` override
- [ ] `AddMcpServer()` with proper transport
- [ ] Logging to stderr for stdio transport
- [ ] DI used for services (not manual instantiation)
- [ ] `CancellationToken` accepted on async tools
- [ ] `Microsoft.Extensions.Hosting` lifecycle
- [ ] Error handling with `McpProtocolException`
- [ ] `ModelContextProtocol` NuGet package (not hardcoded version)
- [ ] Container or NuGet publishing configured
