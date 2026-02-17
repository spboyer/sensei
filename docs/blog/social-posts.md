# Sensei Social Posts

Launch campaign for Sensei — 4 posts across LinkedIn and X.

Platform rules:
- LinkedIn: No markdown, no backticks, no code blocks. Links in first comment only. Personal voice.
- X (Twitter): 280 char limit per tweet. Thread format for longer content. 0-1 hashtags max.

---

## Post 1: Launch — Quality Checks (Strong Intro)

### LinkedIn

Your AI skill has a quality score. Most of them are embarrassingly low.

I spent months watching agents invoke the wrong skill because the description was 37 characters of nothing. "Process PDF files for various tasks." That's not a description — that's a shrug.

So I built something about it.

Sensei is an open-source skill that audits and improves AI agent skill frontmatter. Think of it as a linter for your skill's routing layer.

Here's what it checks:

✅ Name validation — lowercase, hyphens, 64 chars max
✅ Description length — 150 char minimum, 1024 max
✅ Trigger phrases — explicit "USE FOR:" with specific keywords
✅ Anti-triggers — "DO NOT USE FOR:" to prevent wrong-skill invocation
✅ Routing clarity — INVOKES, FOR SINGLE OPERATIONS, skill type prefix
✅ Token budgets — keeps your SKILL.md lean
✅ MCP integration — 4-point sub-score for tool dependencies

Every skill gets scored: Low → Medium → Medium-High → High.

The target is Medium-High — that's the threshold where agents actually have enough information to route correctly every time.

One command. Automated fixes. Open source. MIT licensed.

Works with any AI agent that uses structured skill definitions — GitHub Copilot, Claude, and beyond.

What score would your skills get?

🔗 Link in first comment

#AI #AgentSkills #OpenSource #GitHubCopilot #DevTools

---

### X (Thread)

**Tweet 1:**
Your AI skill has a quality score. Most of them are embarrassingly low.

I built Sensei — an open-source linter for AI skill frontmatter. One command. Automated fixes.

🧵

**Tweet 2:**
Most skills ship with 37-character descriptions. Your agent is literally guessing which skill to invoke.

Sensei checks triggers, anti-triggers, routing clarity, token budgets, and MCP integration. Scores every skill Low → High.

**Tweet 3:**
It doesn't just score — it fixes. The Ralph loop reads your skill, scores it, improves it, verifies with tests, and repeats until it hits Medium-High compliance.

Open source. MIT licensed.

github.com/spboyer/sensei

---

## Post 2: Before/After Showcase

### LinkedIn

37 characters. That's all the context your AI agent had to pick the right skill.

"Process PDF files for various tasks."

No triggers. No anti-triggers. No routing clarity. The agent was flipping a coin.

I ran Sensei on it. Here's what came out the other side:

BEFORE:
  description: "Process PDF files for various tasks"

AFTER:
  description: Process PDF files including text extraction, rotation, and merging.
  USE FOR: "extract PDF text", "rotate PDF", "merge PDFs", "split PDF".
  DO NOT USE FOR: creating new PDFs (use document-creator), extracting images (use image-extractor).

Same skill. Now the agent knows exactly when to use it — and when not to.

Low → Medium-High in one automated pass.

Your skills deserve better metadata than a one-liner someone wrote at 2am.

Have you ever had an agent invoke the wrong skill on you? I'd love to hear what went wrong.

🔗 Link in first comment

#AI #DevTools #SkillRouting #OpenSource

---

### X (Thread)

**Tweet 1:**
Before Sensei: "Process PDF files for various tasks"
→ 37 chars. Agent is guessing.

After Sensei: explicit triggers, anti-triggers, routing clarity.
→ Low → Medium-High in one pass.

**Tweet 2:**
Your skills deserve better metadata than a one-liner someone wrote at 2am.

Sensei automates the fix. One command.

github.com/spboyer/sensei

---

## Post 3: Skill Collision (The Follow-Up Problem Post)

### LinkedIn

Your agent has 15 skills. A user says "process this document."

Which skill fires?

→ pdf-processor?
→ document-creator?
→ image-extractor?
→ ocr-processor?

If none of them have anti-triggers, the agent picks based on vibes. Sometimes it's right. Often it's not.

This is skill collision — and it's the number one reliability problem in multi-skill agents.

The fix isn't better prompting. It's better frontmatter.

When a skill says "DO NOT USE FOR: creating new PDFs (use document-creator)" — the agent stops guessing. It knows which skill owns which prompt.

I built Sensei to automate this. It reads your skills, identifies missing anti-triggers, adds them, and verifies with tests using the Ralph loop pattern for iterative improvement.

The result: agents that route to the right skill, every time.

If you're running more than 5 skills in an agent, how are you handling routing conflicts today?

🔗 Link in first comment

#AI #AgentReliability #SkillCollision #DevTools

---

### X (Thread)

**Tweet 1:**
Your agent has 15 skills. User says "process this document."

Which skill fires? 🎰

Without anti-triggers, the agent picks based on vibes. This is skill collision.

**Tweet 2:**
The fix isn't better prompting. It's better frontmatter.

Sensei reads your skills, identifies missing anti-triggers, adds them, and verifies with tests. Automated.

github.com/spboyer/sensei

---

## Post 4: Open Source Community Invite

### LinkedIn

I shipped Sensei this week. Here's why I think it matters.

Every AI agent with multiple skills has a routing problem. The agent reads each skill's frontmatter to decide which one to invoke. Bad frontmatter means bad routing. It's that simple.

Sensei automates the fix. It's built on a few beliefs:

→ Skills are the routing layer for AI agents. The frontmatter IS the routing logic.
→ Quality should be automated, not manual. Sensei uses the Ralph loop — read, score, improve, verify, repeat.
→ The best practices already exist. They just need enforcement tooling.

It's MIT licensed and works with any AI agent that uses structured skill definitions — GitHub Copilot, Claude, and beyond.

I'm looking for:
🔧 Contributors who build skills and want better tooling
📝 Feedback on the scoring criteria and checks
🧪 Test framework integrations (Jest, pytest, Waza)

If you're building AI agent skills, try running Sensei on one of yours. The score might surprise you.

What's the first skill you'd run it on?

🔗 Link in first comment

#OpenSource #AI #AgentSkills #DevCommunity #GitHubCopilot

---

### X (Thread)

**Tweet 1:**
I shipped Sensei this week — an open-source linter for AI skill frontmatter.

Every multi-skill agent has a routing problem. Bad frontmatter = wrong skill fires. Sensei automates the fix.

**Tweet 2:**
It scores your skills Low → High, then iteratively improves them until they hit Medium-High compliance.

Triggers, anti-triggers, token budgets, MCP integration — all checked.

MIT licensed. Looking for contributors 🤝

github.com/spboyer/sensei
