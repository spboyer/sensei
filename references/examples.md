# Examples

Before and after examples of frontmatter improvements.

## Cross-Model Optimized Examples

These examples follow the recommended template for cross-model compatibility (Claude Sonnet, GPT-4, Gemini, etc.).

### Template

```yaml
description: "[ACTION VERB] [UNIQUE_DOMAIN]. [One clarifying sentence]. WHEN: \"phrase1\", \"phrase2\", \"phrase3\"."
```

> Use inline double-quoted strings for descriptions (not `>-` folded scalars — incompatible with [skills.sh](https://skills.sh)).

### Example 1: PDF Processor (Low → Medium-High)

**Before:**
```yaml
description: 'Process PDF files for various tasks'
```

**After (cross-model optimized):**
```yaml
description: "Extract, rotate, merge, and split PDF files for document processing. WHEN: \"extract PDF text\", \"rotate PDF pages\", \"merge PDFs\", \"split PDF\", \"PDF to text\"."
```

**Why:** 27 words, leads with action verbs, unique domain, quoted WHEN: triggers.

### Example 2: Azure Deploy (Low → High)

**Before (89 words):**
```yaml
description: |
  Execute deployment to Azure. Final step after preparation and validation.
  Runs azd up, azd deploy, or infrastructure provisioning commands.
  USE FOR: run azd up, run azd deploy, execute deployment, provision
  infrastructure, push to production, go live, ship it, deploy web app...
  DO NOT USE FOR: creating or building apps (use azure-prepare), validating
  before deploy (use azure-validate).
```

**After (35 words):**
```yaml
description: "Execute deployment to Azure using azd up or azd deploy. Final step after app is already prepared and validated. WHEN: \"run azd up\", \"deploy my app\", \"push to production\", \"go live\"."
```

**Why:** Removed DO NOT USE FOR (keyword contamination), capped at 35 words, quoted WHEN: triggers.

### Example 3: Azure AI (Medium → High)

**Before (68 words):**
```yaml
description: |
  Use for Azure AI: Search, Speech, OpenAI, Document Intelligence...
  USE FOR: AI Search, query search, vector search...
  DO NOT USE FOR: Function apps/Functions (use azure-functions)...
```

**After (34 words):**
```yaml
description: "Integrate Azure AI services: AI Search, Speech, OpenAI, and Document Intelligence into applications. WHEN: \"vector search\", \"speech-to-text\", \"OCR\", \"Azure OpenAI\", \"hybrid search\", \"transcribe audio\"."
```

**Why:** "DO NOT USE FOR: Function apps/Functions" was causing Sonnet to key on "Functions" and activate wrongly.

### Example 4: High with Routing Clarity

```yaml
description: "**WORKFLOW SKILL** — Orchestrate Azure deployment through preparation, validation, and execution phases. WHEN: \"deploy to Azure\", \"azd up\", \"push to Azure\", \"ship to production\". INVOKES: azure-azd MCP (up, deploy, provision), azure-deploy MCP (plan_get). FOR SINGLE OPERATIONS: Use azure-azd MCP directly for single azd commands."
```

### Example 5: Utility Skill (High)

```yaml
description: "**UTILITY SKILL** — Count tokens in markdown files and check against limits. WHEN: \"count tokens\", \"check token limit\", \"token budget\", \"how many tokens\". INVOKES: tiktoken library, file system operations. FOR SINGLE OPERATIONS: Run npm run tokens count <file> directly."
```

### Example 6: Analysis Skill (High)

```yaml
description: "**ANALYSIS SKILL** — Debug and troubleshoot production issues on Azure resources. WHEN: \"debug Azure\", \"troubleshoot container app\", \"diagnose app service\", \"analyze logs\", \"fix deployment issue\". INVOKES: azure-applens MCP (diagnostics), azure-resourcehealth MCP, azure-monitor MCP. FOR SINGLE OPERATIONS: Use azure-resourcehealth MCP for quick health checks."
```

---

## Legacy Pattern Examples

> ⚠️ These examples use the `USE FOR:` / `DO NOT USE FOR:` pattern. This still scores Medium-High but is **not recommended** for cross-model compatibility. `DO NOT USE FOR:` clauses cause keyword contamination on Claude Sonnet and similar models.

### Legacy Example 1: PDF Processor (Low → Medium-High)

**Before:**
```yaml
description: 'Process PDF files for various tasks'
```

**After (legacy pattern):**
```yaml
description: |
  Process PDF files including text extraction, page rotation, merging,
  and splitting. USE FOR: "extract text from PDF", "rotate PDF pages",
  "merge PDFs", "split PDF", "PDF to text", "combine PDF files".
  DO NOT USE FOR: creating new PDFs from scratch (use document-creator),
  extracting images from PDFs (use image-extractor), or OCR on scanned
  documents (use ocr-processor).
```

⚠️ **Cross-model issue:** The "DO NOT USE FOR" clause introduces keywords "creating", "images", "OCR", "scanned" — on Sonnet these may cause this skill to activate for document creation or OCR tasks.

---

### Legacy Example 2: API Client (Low → Medium-High)

**Before:**
```yaml
description: 'Make HTTP requests to APIs'
```

**After (legacy pattern):**
```yaml
description: |
  Make HTTP requests to REST APIs with authentication, headers, and
  response handling. USE FOR: "call API", "make HTTP request", "fetch
  from endpoint", "POST to API", "API authentication", "handle API
  response". DO NOT USE FOR: GraphQL queries (use graphql-client),
  WebSocket connections (use websocket-handler), or file downloads
  (use file-downloader).
```

---

### Legacy Example 3: Database Query (Medium → Medium-High)

**Before:**
```yaml
description: |
  Query databases using SQL. Supports SELECT, INSERT, UPDATE, DELETE
  operations. Use this skill when you need to interact with relational
  databases like PostgreSQL, MySQL, or SQLite.
```

**After (legacy pattern):**
```yaml
description: |
  Query relational databases using SQL for SELECT, INSERT, UPDATE,
  DELETE operations. USE FOR: "query database", "SQL select", "insert
  into table", "update records", "PostgreSQL query", "MySQL query".
  DO NOT USE FOR: NoSQL databases (use nosql-client), database schema
  migrations (use db-migrate), or connection pooling setup (use
  db-connection).
```

---

### Legacy Example 4: High Adherence with Routing Clarity

```yaml
description: |
  **WORKFLOW SKILL** - Orchestrates deployment through preparation, validation,
  and execution phases for Azure applications. USE FOR: "deploy to Azure",
  "azd up", "push to Azure", "publish to Azure", "ship to production".
  DO NOT USE FOR: preparing new apps (use azure-prepare), validating before
  deploy (use azure-validate), Azure Functions specifically (use azure-functions).
  INVOKES: azure-azd MCP (up, deploy, provision), azure-deploy MCP (plan_get).
  FOR SINGLE OPERATIONS: Use azure-azd MCP directly for single azd commands.
```

⚠️ **Cross-model issue:** "DO NOT USE FOR: ... Azure Functions" causes Sonnet to key on "Functions" and activate this skill for Azure Functions tasks.

---

### Legacy Example 5: Utility Skill (High)

```yaml
description: |
  **UTILITY SKILL** - Count tokens in markdown files and check against limits.
  USE FOR: "count tokens", "check token limit", "token budget", "how many tokens".
  DO NOT USE FOR: improving skills (use sensei), creating skills (use skill-creator).
  INVOKES: tiktoken library, file system operations.
  FOR SINGLE OPERATIONS: Run `npm run tokens count <file>` directly.
```

---

### Legacy Example 6: Analysis Skill (High)

```yaml
description: |
  **ANALYSIS SKILL** - Debug and troubleshoot production issues on Azure resources.
  USE FOR: "debug Azure", "troubleshoot container app", "diagnose app service",
  "analyze logs", "fix deployment issue", "why is my app failing".
  DO NOT USE FOR: deploying apps (use azure-deploy), creating resources (use
  azure-create-app), setting up monitoring (use azure-observability).
  INVOKES: azure-applens MCP (diagnostics), azure-resourcehealth MCP, azure-monitor MCP.
  FOR SINGLE OPERATIONS: Use azure-resourcehealth MCP for quick health checks.
```

---

## Test Prompt Examples

### Good Trigger Prompts

```javascript
const shouldTriggerPrompts = [
  // Exact matches
  'Extract text from this PDF',
  'Rotate this PDF 90 degrees',
  
  // Natural variations
  'I need to merge these PDF files together',
  'Can you help me split this PDF into pages?',
  
  // Keyword focused
  'PDF to text conversion',
  'Combine multiple PDFs',
];
```

### Good Anti-Trigger Prompts

```javascript
const shouldNotTriggerPrompts = [
  // Unrelated topics (always include)
  'What is the weather today?',
  'Write a poem about mountains',
  
  // Related but different skills
  'Create a new PDF document',      // → document-creator
  'Extract images from this PDF',   // → image-extractor
  'OCR this scanned document',      // → ocr-processor
  
  // Other platforms
  'Help me with Word documents',
  'Convert Excel to CSV',
];
```

---

## Anti-Patterns

### ❌ Too Long

```yaml
description: |
  This skill processes PDF files which are Portable Document Format
  files originally developed by Adobe Systems in the 1990s. PDFs are
  widely used for sharing documents because they preserve formatting
  across different devices and operating systems. This skill can help
  you with various PDF operations including but not limited to text
  extraction where we parse the PDF structure to get readable text,
  page rotation which allows you to fix orientation issues...
  [continues for 1500+ characters]
```

**Problem:** Exceeds 1024 character limit.

### ❌ Too Vague

```yaml
description: |
  Process PDFs. USE FOR: PDF stuff.
  DO NOT USE FOR: other things.
```

**Problem:** Not specific enough for agent to determine activation.

### ❌ Mismatched Tests

```yaml
# SKILL.md says:
USE FOR: "extract PDF text", "rotate PDF"
```

```javascript
// But tests have:
const shouldTriggerPrompts = [
  'Create a new PDF',        // Wrong! Not in USE FOR
  'Edit Word document',      // Wrong! Different format
];
```

**Problem:** Tests don't match frontmatter triggers.

### ❌ Too Many Modules

```
references/  (6 files — diminishing returns above 3)
├── overview.md, api-reference.md, advanced-usage.md
├── troubleshooting.md, examples.md, configuration.md
```

**Problem:** 4+ modules show diminishing returns compared to 2–3. Consolidate.

### ❌ Conflicting Procedures

```yaml
description: |
  Deploy to Azure. Step 1: Run azd up.
  Alternatively, use az webapp deploy.
  For production, use the CI/CD pipeline instead.
```

**Problem:** Multiple contradictory paths confuse the agent. Pick ONE primary path.

### ❌ Declarative Only (No Procedures)

```yaml
description: |
  This skill handles PDF files. PDFs are Portable Document
  Format files used for sharing documents across platforms.
```

**Problem:** Describes WHAT, not HOW. Skills need action verbs, steps, workflows.

### ❌ Anti-Trigger Keyword Contamination

```yaml
description: |
  Deploy to Azure. USE FOR: "deploy app", "push to production".
  DO NOT USE FOR: Function apps (use azure-functions),
  storage accounts (use azure-storage), Kubernetes (use azure-aks).
```

**Problem:** The "DO NOT USE FOR" clause introduces "Function apps", "storage", "Kubernetes" — on Claude Sonnet these keywords cause this skill to activate for Functions, Storage, and AKS tasks. Remove anti-triggers and use positive routing with distinctive `WHEN:` phrases instead.

### ❌ Description Too Dense (>60 words)

```yaml
description: |
  This skill orchestrates the complete Azure deployment workflow including
  preparation, validation, and execution phases for web applications, APIs,
  Function apps, container apps, and static web apps. It generates Bicep
  templates, Terraform configurations, azure.yaml files, and Dockerfiles.
  USE FOR: deploy, create app, build, migrate, modernize, prepare, validate,
  provision, configure, set up, initialize...
```

**Problem:** At 60+ words, Sonnet's attention is diluted across all 24+ skill descriptions. Cap at ≤60 words and front-load the unique signal.

---

## Skill Body Patterns

Templates for structuring the SKILL.md body content, adapted from Anthropic's [Complete Guide to Building Skills](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf).

### Pattern 1: Sequential Workflow

Use when users need multi-step processes in a specific order.

```markdown
# Workflow: [Process Name]

## Step 1: [First Step]
Call MCP tool: `tool_name`
Parameters: param1, param2

## Step 2: [Second Step]
Call MCP tool: `other_tool`
Wait for: [validation condition]

## Step 3: [Final Step]
Call MCP tool: `final_tool`
Parameters: result_from_step1, config
```

**Key techniques:** Explicit step ordering, dependencies between steps, validation at each stage, rollback instructions for failures.

### Pattern 2: Multi-MCP Coordination

Use when workflows span multiple services or MCP servers.

```markdown
## Phase 1: [Service A] (service-a MCP)
1. Fetch data from Service A
2. Transform and prepare payload

## Phase 2: [Service B] (service-b MCP)
1. Send prepared data to Service B
2. Validate response

## Phase 3: Notification (messaging MCP)
1. Post summary to channel
2. Include links from Phase 1-2
```

**Key techniques:** Clear phase separation, data passing between MCPs, validation before next phase, centralized error handling.

### Pattern 3: Iterative Refinement

Use when output quality improves with iteration.

```markdown
## Initial Draft
1. Fetch data via MCP
2. Generate first draft
3. Save to temporary file

## Quality Check
1. Run validation: `scripts/check.py`
2. Identify issues

## Refinement Loop
1. Address each identified issue
2. Regenerate affected sections
3. Re-validate
4. Repeat until quality threshold met

## Finalization
1. Apply final formatting
2. Generate summary
```

**Key techniques:** Explicit quality criteria, validation scripts, know when to stop iterating.

### Pattern 4: Context-Aware Tool Selection

Use when the same outcome requires different tools depending on context.

```markdown
## Decision Tree
1. Check input type and constraints
2. Determine best approach:
   - Condition A: Use tool-x MCP
   - Condition B: Use tool-y MCP
   - Fallback: Use local processing

## Execute
Based on decision, call appropriate tool
Apply context-specific configuration

## Explain
Tell user why that approach was chosen
```

**Key techniques:** Clear decision criteria, fallback options, transparency about choices.

### Pattern 5: Domain-Specific Intelligence

Use when the skill adds specialized knowledge beyond tool access.

```markdown
## Before Processing (Domain Check)
1. Fetch input details via MCP
2. Apply domain rules:
   - Check constraint A
   - Verify requirement B
   - Assess risk level
3. Document decision

## Processing
IF checks passed:
  - Call processing MCP tool
  - Apply domain-specific validation
ELSE:
  - Flag for review
  - Create exception case

## Audit Trail
- Log all checks performed
- Record processing decisions
```

**Key techniques:** Domain expertise embedded in logic, compliance before action, comprehensive documentation, clear governance.
