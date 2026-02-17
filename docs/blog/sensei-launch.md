# Your AI Skill Has a Quality Score — Do You Know What It Is?

*By Shayne Boyer*

*Your agent picks the wrong skill. You debug for 30 minutes. The code was fine. The frontmatter wasn't.*

---

You just watched your agent call `image-extractor` when the user asked to merge two PDFs. You checked the logs. You checked the prompt. You checked the skill code. Everything looked right.

Thirty minutes later, you found it: your `pdf-processor` skill's description was `"Process PDF files for various tasks"` — 37 characters, zero trigger phrases, zero anti-triggers. The agent had nothing to work with. It guessed. It guessed wrong.

This isn't a bug. It's a **frontmatter quality problem**. And it's hiding in almost every skill you've shipped.

Here's what makes it dangerous: it compounds. With 3 skills, you might get lucky. With 15, collisions start surfacing weekly. With 50, every vague description is a landmine — each skill without explicit triggers and anti-triggers is a potential collision with *every other skill*. The failure rate doesn't grow linearly. It grows combinatorially.

The worst part? You'll never find it in your code. You'll grep, you'll trace, you'll add logging. The answer was always in the YAML.

## The Invisible Thing: Skill Collision

There's a name for what keeps happening to you. **Skill collision.**

It's when two or more skills have overlapping descriptions, missing boundaries, and no explicit routing signals — so the agent picks one at random. Or picks the wrong one confidently. Or picks yours when it should have picked someone else's.

This isn't anecdotal. GitHub's analysis of 2,500+ repositories found that most agent instruction files fail because they're too vague. Generic descriptions like "You are a helpful coding assistant" don't constrain behavior — specific personas with explicit boundaries do. The same principle applies to skill frontmatter: if your description doesn't draw a line, the agent won't find one.

It gets worse at scale. Research on LLM tool selection has identified a "lost-in-the-middle" problem — models exhibit positional bias, favoring tools near the top or bottom of a list and overlooking those in the middle. As your skill count grows, vague descriptions compound with positional bias. The agent isn't just guessing *what* to pick — it's guessing *from where in the list* to pick.

That's why explicit trigger phrases and anti-triggers exist. They give the model concrete keywords to match against instead of relying on position or vibes.

Skill collision is the routing bug you can't grep for.

## Why Now

Every agent platform is adding skill support. GitHub Copilot, Claude, custom agent frameworks — skills are becoming the standard unit of AI capability. The ecosystem went from dozens of skills to thousands in months.

But here's the gap: **the tooling didn't keep up.**

And the quality problem is measurable. Recent research on community-contributed agent skills found that roughly 26% contain vulnerabilities — unclear permissions, undocumented dependencies, missing boundary constraints. Skills drift as codebases evolve: tools get removed, APIs change, but the SKILL.md still references them. Nobody updates the frontmatter. The skill keeps firing — just incorrectly.

We have linters for code. Formatters for style. Type checkers for correctness. But skill frontmatter — the metadata that determines whether your skill gets invoked correctly or causes a routing failure — has zero quality tooling. Nothing checks your descriptions. Nothing validates your triggers. Nothing catches the collision before your user hits it.

That gap is why you're debugging frontmatter at 2am instead of shipping features.

[Sensei](https://github.com/spboyer/sensei) fills it. It's the first linter for skill quality.

## What Sensei Does

Sensei is an open-source skill that audits and improves AI agent skill frontmatter — the YAML metadata that tells agents when to activate a skill, when *not* to, and how to route between overlapping capabilities.

Think of it as a **linter for your skill's routing layer**. One command. It reads your `SKILL.md`, scores it from Low to High, identifies what's missing, improves it iteratively, runs tests to verify the changes, and checks token budgets — all automated. No guessing.

It's informed by multiple skill specification approaches — including [Anthropic's custom skills format](https://support.anthropic.com/en/articles/12512198-how-to-create-custom-skills) — and works with any AI agent that uses structured skill definitions.

## The Checks That Matter

Sensei runs 10 compliance checks across three categories. Here's what it's looking for and why each one matters.

**Identity** — Is your skill recognizable?

**Name format** — Catches uppercase, underscores, names > 64 chars — anything that breaks conventions.

**Description length** — Too short (< 150 chars) means the agent is guessing. Too long (> 1024 chars) bloats the context window.

**Token budget** — SKILL.md under 500 tokens (soft) / 5,000 (hard). References under 1,000 each.

**Routing** — Does the agent know when to use your skill *and when not to*?

**Trigger phrases** — Missing `USE FOR:` — the agent has no explicit activation criteria.

**Anti-triggers** — Missing `DO NOT USE FOR:` — the single biggest source of skill collision.

**Routing clarity** — No `INVOKES:` or `FOR SINGLE OPERATIONS:` — the agent can't distinguish your skill from the raw tools it wraps.

**Integration** — If your skill calls MCP tools, is it documented?

**MCP Tools Used table** — Catches undocumented tool dependencies.

**Prerequisites section** — Catches missing setup requirements.

**CLI fallback pattern** — Catches no fallback when MCP is unavailable.

**Name collision** — Catches skill name matching an MCP tool name — guaranteed routing confusion.

These checks feed into a four-level score:

**Low** — Agent is guessing. No triggers, brief description.

**Medium** — Has triggers but no anti-triggers. Collisions likely.

**Medium-High** — Has `USE FOR:` AND `DO NOT USE FOR:`. Agent routes reliably. *This is the target.*

**High** — Full routing clarity. Skill type prefix, `INVOKES:`, bypass guidance.

## You've Been Here

**Scenario 1: The document processing suite.** You're building 5 skills — `pdf-processor`, `document-creator`, `image-extractor`, `ocr-processor`, `file-converter`. They all deal with documents. They all have one-line descriptions. The agent picks `pdf-processor` when the user asks to create a new document from scratch. Why? Because "process PDF files for various tasks" technically *could* mean creation. Without a `DO NOT USE FOR: creating new PDFs (use document-creator)` anti-trigger, the agent has no boundary.

**Scenario 2: The MCP tool shadow.** You wrote a `deploy` skill that wraps deployment MCP tools into a multi-step workflow. But when a user says "deploy my app," the agent calls the raw MCP tool directly instead of your skill — because the skill name matches the tool name and there's no `FOR SINGLE OPERATIONS:` guidance telling the agent when to use the tool directly vs. when to use your workflow.

**Scenario 3: The scale wall.** Your team had 4 skills. Everything worked. You added 8 more. Now nothing routes correctly. Nobody's descriptions are long enough. Nobody added anti-triggers. Every skill is colliding with every other skill because none of them drew boundaries. You're spending more time debugging routing than writing skill logic.

**Scenario 4: The ghost instruction.** Three months ago, your skill invoked a `format-output` tool. That tool got deprecated and removed. But the SKILL.md still references it in the `INVOKES:` line. Now when the agent activates your skill, it tries to call a tool that doesn't exist — and fails silently, or worse, hallucinates a response. The frontmatter drifted. Nobody noticed because nobody audits frontmatter.

Sensei catches all four. Before your users do.

## Before and After

Here's what this looks like in practice. Your `pdf-processor` starts like this:

```yaml
---
name: pdf-processor
description: 'Process PDF files for various tasks'
---
```

37 characters. Score: **Low.** The agent has no idea when to use this vs. `document-creator` or `image-extractor`. It guesses.

After Sensei runs, it looks like this:

```yaml
---
name: pdf-processor
description: |
  **UTILITY SKILL** - Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs", "split PDF",
  "PDF to text", "combine PDF files".
  DO NOT USE FOR: creating new PDFs (use document-creator), extracting
  images (use image-extractor), or OCR on scanned documents (use ocr-processor).
  INVOKES: pdf-tools MCP for extraction, file-system for I/O.
  FOR SINGLE OPERATIONS: Use pdf-tools MCP directly for simple extractions.
---
```

Score: **High.** Clear purpose. Explicit triggers. Anti-triggers drawing boundaries with every related skill. Routing clarity for MCP tool integration. The agent doesn't guess anymore.

## Most Linters Find Problems. Sensei Fixes Them.

This is the part that changes everything.

Sensei doesn't hand you a list of violations and walk away. It uses the [Ralph loop pattern](https://github.com/soderlund/ralph) — an iterative improvement cycle that reads, scores, fixes, tests, and verifies until your skill reaches compliance. Automatically.

Here's how the loop works: Sensei reads your SKILL.md and scores it. If it's below Medium-High, it scaffolds tests from templates, improves the frontmatter by adding triggers, anti-triggers, and routing clarity, then runs those tests to make sure the changes actually work. It checks your token budget. It shows you a before/after comparison. Then it asks: commit, create an issue, or skip?

If the score still isn't there, it loops again. Up to 5 iterations, refining each pass.

```
Run sensei on my-skill-name
```

One command. Nine steps. READ → SCORE → SCAFFOLD → IMPROVE → VERIFY → CHECK TOKENS → SUMMARY → PROMPT → REPEAT. You get a skill that went from Low to Medium-High without manually editing a single line of YAML.

This isn't "here's what's wrong, go fix it." This is "here's what was wrong, I fixed it, here's the proof, do you want to ship it?"

## Why This Works

Three principles make Sensei's approach effective where manual review fails.

**Triggers AND anti-triggers are a pair, not a feature.** Triggers alone tell the agent when to activate. That's necessary but not sufficient. Without anti-triggers, two skills with overlapping domains will both claim the same prompt. This matters at a technical level: LLMs don't just read skill descriptions — they pattern-match against them. Vague descriptions force the model to rely on position in the prompt and semantic guessing, which is where the "lost-in-the-middle" bias kicks in. Explicit trigger keywords give the model concrete match criteria. Anti-triggers give it concrete *rejection* criteria. Together, they replace guessing with routing. This is why Medium (triggers only) isn't the target. Medium-High (both) is.

**Token budgets prevent skill bloat.** Every skill gets loaded into the agent's context window. A 3,000-token SKILL.md crowds out everything else — other skills, user context, conversation history. Sensei enforces a 500-token soft limit on SKILL.md and pushes detailed documentation into references. This isn't arbitrary. It's the difference between a skill that coexists with 20 others and a skill that starves them of context.

**Iterative improvement beats one-shot fixing.** A single pass might add triggers but miss anti-triggers. Or add anti-triggers that conflict with the triggers. The Ralph loop catches these by re-scoring after every improvement, running tests against the new frontmatter, and looping until the score stabilizes. Each iteration builds on the last. The result is frontmatter that's been validated against its own test suite, not just formatted correctly.

## Getting Started

```bash
npx skills add spboyer/sensei
```

That's it. Or clone it manually:

```bash
git clone https://github.com/spboyer/sensei.git ~/.copilot/skills/sensei
cd ~/.copilot/skills/sensei/scripts && npm install
```

Then run it:

```
Run sensei on my-skill-name              # Single skill
Run sensei on my-skill-name --fast       # Skip tests
Run sensei on skill-a, skill-b, skill-c  # Multiple skills
Run sensei on all skills                 # Everything
```

## The Skill Ecosystem Needs Quality Tooling. Help Us Build It.

Skills are the next layer of the AI stack. Every major agent platform is betting on them. But right now, skill quality is a manual process — if it's a process at all. Most teams ship skills with one-line descriptions and hope for the best.

In multi-agent systems, the stakes are higher. Research from Patronus AI shows that unclear skill responsibilities lead to misclassified tasks, cascading errors, and increased hallucination. Ambiguous routing doesn't just slow things down — it compounds across agents.

That's not going to work at scale.

Sensei is [MIT licensed](https://github.com/spboyer/sensei) and open source. It's the beginning of a quality layer for the skill ecosystem — and it needs people who've felt the pain of skill collision to help shape it.

- 🔧 **Build with us** — Contributors who ship skills and want better tooling
- 📝 **Shape the standard** — Feedback on scoring criteria, compliance checks, what we're missing
- 🧪 **Extend the coverage** — Test framework integrations for Jest, pytest, Waza, and beyond

If you've ever burned 30 minutes debugging a routing failure that turned out to be a 37-character description, you already know why this matters.

**Run Sensei. See your score. Fix it before your users find it.**

→ [github.com/spboyer/sensei](https://github.com/spboyer/sensei)

---

*Sensei — "A true master teaches not by telling, but by refining." 🥋*
