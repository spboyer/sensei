# MCP Evaluation Guide

Evaluations test whether LLMs can effectively use your MCP server. Having evaluations moves a server from Medium-High to High compliance.

## Evaluation Requirements

- Create **10 human-readable questions**
- Questions must be **READ-ONLY, INDEPENDENT, NON-DESTRUCTIVE**
- Each question requires **multiple tool calls** (potentially dozens)
- Answers must be **single, verifiable values**
- Answers must be **STABLE** (won't change over time)

## Output Format

```xml
<evaluation>
  <qa_pair>
    <question>Your complex question here</question>
    <answer>Single verifiable answer</answer>
  </qa_pair>
</evaluation>
```

## Question Guidelines

### Must Be
- **Realistic** — Based on real use cases humans would care about
- **Complex** — Requiring multiple searches, analysis, and synthesis
- **Independent** — No dependency on other questions
- **Non-destructive** — Only read-only operations needed
- **Stable** — Based on historical/closed data that won't change

### Must NOT Be
- Solvable with a single keyword search
- Dependent on "current state" (counts that change)
- Answerable with a list (use counts or superlatives instead)
- Trivially easy (should require deep exploration)

### Complexity Patterns
- Multi-hop: answer requires chaining multiple tool calls
- Aggregation: counting, comparing, finding max/min
- Time-based: filtering by date ranges, finding historical data
- Ambiguous: requires judgment on which tools to use
- Format-specific: require particular output format (date, ID, name)

## Answer Guidelines

- Must be verifiable via **direct string comparison**
- Prefer **human-readable** formats (names, dates, yes/no)
- Specify format in question if ambiguous ("Use YYYY/MM/DD", "Answer True or False")
- Must NOT be complex structures or lists

## Evaluation Process

1. **Inspect** — List available tools, understand capabilities
2. **Explore** — Use READ-ONLY operations to discover content
3. **Generate** — Create 10 complex questions
4. **Verify** — Solve each question yourself using the tools
5. **Validate** — Ensure answers are stable and unambiguous

## Sensei-mcp Scoring

| Has Evaluation File? | Questions | Impact |
|---------------------|-----------|--------|
| No | — | Caps at Medium-High |
| Yes, < 10 questions | Partial | +partial credit |
| Yes, 10+ valid questions | Full | Enables High score |

## Check Criteria

When auditing, sensei-mcp checks:
- [ ] Evaluation file exists (`.xml` with `<qa_pair>` elements)
- [ ] Contains 10+ questions
- [ ] Questions use read-only operations only
- [ ] Questions are independent (no cross-dependencies)
- [ ] Answers are single values (not lists)
- [ ] No questions about dynamic/changing state
