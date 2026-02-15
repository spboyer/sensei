# MCP Project Structure

Expected project layouts for each supported language.

## TypeScript

```
{service}-mcp-server/
├── package.json          # name: "{service}-mcp-server", type: "module"
├── tsconfig.json         # strict: true, target: ES2022, module: Node16
├── README.md             # Tool inventory, setup, examples
├── src/
│   ├── index.ts          # Entry point: McpServer init + transport
│   ├── types.ts          # TypeScript interfaces
│   ├── constants.ts      # API_BASE_URL, CHARACTER_LIMIT
│   ├── tools/            # Tool implementations (one file per domain)
│   │   ├── users.ts
│   │   └── projects.ts
│   ├── services/         # API clients, shared utilities
│   │   └── api-client.ts
│   └── schemas/          # Zod validation schemas
│       └── user.ts
└── dist/                 # Built output (entry: dist/index.js)
```

### Key Files
- **package.json**: Must have `"type": "module"`, `"main": "dist/index.js"`, deps: `@modelcontextprotocol/sdk`, `zod`
- **tsconfig.json**: Must have `strict: true`

## Python

```
{service}_mcp/
├── pyproject.toml        # or setup.py, name: "{service}_mcp"
├── README.md
├── {service}_mcp/        # Package directory
│   ├── __init__.py
│   ├── __main__.py       # Entry point: mcp.run()
│   ├── server.py         # FastMCP initialization
│   ├── models.py         # Pydantic input models
│   ├── tools/            # Tool implementations
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── projects.py
│   ├── services/         # API clients
│   │   └── api_client.py
│   └── constants.py      # API_BASE_URL, CHARACTER_LIMIT
└── tests/
    └── test_tools.py
```

### Key Files
- **pyproject.toml**: Use `uv` or `pip`, dep: `mcp[cli]`
- **server.py**: `mcp = FastMCP("service_mcp")`

## C# (.NET)

```
{Service}McpServer/
├── {Service}McpServer.csproj    # Package refs: ModelContextProtocol, Microsoft.Extensions.Hosting
├── README.md
├── Program.cs                   # Entry: Host builder + AddMcpServer()
├── Tools/                       # Tool classes with [McpServerToolType]
│   ├── UserTools.cs
│   └── ProjectTools.cs
├── Services/                    # DI-registered services
│   └── ApiClient.cs
├── Models/                      # Data models
│   └── User.cs
├── Properties/
│   └── launchSettings.json
└── .mcp/
    └── server.json              # MCP server metadata (for NuGet)
```

### Key Files
- **.csproj**: `<PackageReference Include="ModelContextProtocol" />`, `<PackageReference Include="Microsoft.Extensions.Hosting" />`
- **Program.cs**: `AddMcpServer().WithStdioServerTransport().WithToolsFromAssembly()`

## Language Detection

Sensei-mcp auto-detects language by checking (in order):

| Signal | Language |
|--------|----------|
| `package.json` with `@modelcontextprotocol/sdk` dep | TypeScript |
| `tsconfig.json` present | TypeScript |
| `pyproject.toml` with `mcp` dep | Python |
| `setup.py` or `FastMCP` import | Python |
| `.csproj` with `ModelContextProtocol` ref | C# |
| `*.cs` files with `McpServerTool` attribute | C# |

## Common Patterns (All Languages)

- **tools/** directory for tool implementations (one file per domain)
- **services/** directory for shared API clients
- **README.md** with tool inventory table
- **Constants file** with `API_BASE_URL`, `CHARACTER_LIMIT`
- **Entry point** clearly defined
