# MCP Server Testing Strategy

Three-layer testing approach for MCP server quality validation.

## Testing Layers

### 1. Unit Tests

Test tool handler functions directly, isolated from MCP transport.

- Use language-native frameworks: Jest/Vitest (TS), pytest (Python), xUnit (C#)
- Mock external dependencies (APIs, databases, file system)
- Test input validation, error paths, and expected outputs
- One test file per tool domain minimum

**Checks:**
- `tests/` or `__tests__/` directory exists
- Test files present matching tool files
- CI config (`.github/workflows/`, `Makefile`) runs tests

### 2. MCP Inspector / Schema Validation

Validate server startup and tool schemas using [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

- Server starts without errors on stdio transport
- `tools/list` returns all expected tools
- Every tool has a non-empty `description`
- Input schemas are valid JSON Schema (required fields, types defined)
- Annotations present (`readOnlyHint`, `destructiveHint`)

**Checks:**
- Server starts cleanly (no crash, no unhandled errors)
- All tools have descriptions and valid input schemas
- No tools with empty or missing `inputSchema`

### 3. LLM Evaluations (qa_pair)

Automated evaluation using Anthropic's XML `qa_pair` format.

```xml
<qa_pair>
  <question>What is the name of user with ID 123?</question>
  <answer>Jane Smith</answer>
</qa_pair>
```

**Requirements:**
- 10+ `qa_pair` questions minimum
- Questions must be read-only, independent, non-destructive, stable
- Answers must be single verifiable values (string comparison)
- Include multi-tool scenarios where applicable
- Evaluation harness: `scripts/evaluation.py` (supports stdio, SSE, HTTP transports)

**Checks:**
- Evaluation XML file exists in project root or `evaluations/` directory
- Contains 10+ questions
- All questions are read-only (no create/update/delete operations)

## Scoring Impact

| Layer | Check | Score Impact |
|-------|-------|-------------|
| Unit Tests | `tests/` dir exists, test files present | Required for **Medium** |
| Schema Validation | All tools have descriptions + valid schemas | Required for **Medium-High** |
| LLM Evaluations | Eval XML with 10+ `qa_pairs` | Required for **High** |

Missing all three layers → automatic **Low** score regardless of other checks.

## Per-Language Examples

### TypeScript (Vitest)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true } });

// tests/tools/users.test.ts
import { handleGetUser } from '../../src/tools/users';

test('returns user by ID', async () => {
  const result = await handleGetUser({ user_id: '123' });
  expect(result.content[0].text).toContain('Jane');
});
```

### Python (pytest)

```python
# tests/test_tools.py
import pytest
from mcp import ClientSession
from service_mcp.server import mcp

@pytest.fixture
async def client():
    async with mcp.test_client() as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session

@pytest.mark.asyncio
async def test_get_user(client):
    result = await client.call_tool("get_user", {"user_id": "123"})
    assert "Jane" in result.content[0].text
```

### C# (xUnit)

```csharp
// Tests/UserToolsTests.cs
public class UserToolsTests
{
    [Fact]
    public async Task GetUser_ReturnsUser()
    {
        var mockApi = new Mock<IApiClient>();
        mockApi.Setup(x => x.GetUser("123"))
               .ReturnsAsync(new User { Name = "Jane" });

        var tools = new UserTools(mockApi.Object);
        var result = await tools.GetUser("123");
        Assert.Contains("Jane", result);
    }
}
```
