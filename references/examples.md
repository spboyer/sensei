# Examples

Before and after examples of frontmatter improvements.

## Example 1: PDF Processor (Low → Medium-High)

### Before

```yaml
---
name: pdf-processor
description: 'Process PDF files for various tasks'
---
```

**Issues:**
- Only 37 characters
- No trigger phrases
- No anti-triggers
- Score: **Low**

### After

```yaml
---
name: pdf-processor
description: |
  Process PDF files including text extraction, page rotation, merging,
  and splitting. USE FOR: "extract text from PDF", "rotate PDF pages",
  "merge PDFs", "split PDF", "PDF to text", "combine PDF files".
  DO NOT USE FOR: creating new PDFs from scratch (use document-creator),
  extracting images from PDFs (use image-extractor), or OCR on scanned
  documents (use ocr-processor).
---
```

**Improvements:**
- 389 characters
- 6 trigger phrases
- 3 anti-triggers with skill recommendations
- Score: **Medium-High**

---

## Example 2: API Client (Low → Medium-High)

### Before

```yaml
---
name: api-client
description: 'Make HTTP requests to APIs'
---
```

**Issues:**
- Only 28 characters
- Generic description
- Score: **Low**

### After

```yaml
---
name: api-client
description: |
  Make HTTP requests to REST APIs with authentication, headers, and
  response handling. USE FOR: "call API", "make HTTP request", "fetch
  from endpoint", "POST to API", "API authentication", "handle API
  response". DO NOT USE FOR: GraphQL queries (use graphql-client),
  WebSocket connections (use websocket-handler), or file downloads
  (use file-downloader).
---
```

**Improvements:**
- 361 characters
- 6 trigger phrases
- 3 anti-triggers
- Score: **Medium-High**

---

## Example 3: Database Query (Medium → Medium-High)

### Before

```yaml
---
name: database-query
description: |
  Query databases using SQL. Supports SELECT, INSERT, UPDATE, DELETE
  operations. Use this skill when you need to interact with relational
  databases like PostgreSQL, MySQL, or SQLite.
---
```

**Status:**
- 198 characters ✓
- Has implicit triggers ✓
- Missing anti-triggers ✗
- Score: **Medium**

### After

```yaml
---
name: database-query
description: |
  Query relational databases using SQL for SELECT, INSERT, UPDATE,
  DELETE operations. USE FOR: "query database", "SQL select", "insert
  into table", "update records", "PostgreSQL query", "MySQL query".
  DO NOT USE FOR: NoSQL databases (use nosql-client), database schema
  migrations (use db-migrate), or connection pooling setup (use
  db-connection).
---
```

**Improvements:**
- Added explicit "USE FOR:" section
- Added "DO NOT USE FOR:" anti-triggers
- Score: **Medium-High**

---

## Example 4: High Adherence

```yaml
---
name: image-editor
description: |
  Edit and transform images including resize, crop, rotate, filters,
  and format conversion. USE FOR: "resize image", "crop photo",
  "rotate image", "apply filter", "convert PNG to JPEG", "thumbnail".
  DO NOT USE FOR: AI image generation (use image-generator), OCR text
  extraction (use ocr-processor), or video editing (use video-editor).
compatibility: |
  Requires: Python 3.8+, Pillow library
  Supports: PNG, JPEG, GIF, WebP, BMP formats
  Optional: ImageMagick for advanced operations
---
```

**Score: High** (has compatibility field)

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

---

## Summary Output Example

```
╔══════════════════════════════════════════════════════════════════╗
║  SENSEI SUMMARY: pdf-processor                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  BEFORE                          AFTER                           ║
║  ──────                          ─────                           ║
║  Score: Low                      Score: Medium-High              ║
║  Tokens: 42                      Tokens: 156                     ║
║  Triggers: 0                     Triggers: 6                     ║
║  Anti-triggers: 0                Anti-triggers: 3                ║
║                                                                  ║
║  TOKEN STATUS: ✅ Under budget (156 < 500)                       ║
║                                                                  ║
║  Choose an action:                                               ║
║    [C] Commit changes                                            ║
║    [I] Create GitHub issue                                       ║
║    [S] Skip (discard changes)                                    ║
╚══════════════════════════════════════════════════════════════════╝
```
