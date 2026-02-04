# Sensei Demo - Talking Points

> **Duration:** 5 minutes | **Audience:** All levels

---

## 1. THE PROBLEM (30 seconds)

**[Show `demo-docs/sample-skill/SKILL.md`]**

> "Here's a typical skill that causes problems..."

```yaml
description: 'Utility for working with files'
```

**Key points:**
- Only 32 characters - agent has no context
- No trigger phrases - when should it activate?
- No anti-triggers - collides with grep, git, code editor
- Result: **skill collision** - wrong skill gets invoked

---

## 2. THE SOLUTION (30 seconds)

**[Show Sensei README or SKILL.md header]**

> "Sensei automates frontmatter improvement using the Ralph loop..."

**Key points:**
- Iterative refinement until compliance
- Adds USE FOR triggers
- Adds DO NOT USE FOR anti-triggers
- Checks token budget
- Target: Medium-High adherence

---

## 3. LIVE DEMO (3 minutes)

**[In Copilot CLI]**

### 3a. Check current state
```
Show me the contents of demo-docs/sample-skill/SKILL.md
```

> "Notice the brief description, no triggers..."

### 3b. Run Sensei
```
Run sensei on file-utils --fast
```

> "Sensei reads the skill, scores it as Low, then improves it..."

**What happens:**
1. READ - Loads the skill
2. SCORE - Evaluates as "Low" 
3. IMPROVE - Adds triggers and anti-triggers
4. TOKENS - Checks budget
5. SUMMARY - Shows before/after
6. PROMPT - Asks what to do

### 3c. Show the result

> "Now we have clear triggers and anti-triggers..."

---

## 4. THE RESULT (1 minute)

**[Show before/after comparison]**

| Metric | Before | After |
|--------|--------|-------|
| Description | 32 chars | ~400 chars |
| Triggers | 0 | 7 |
| Anti-triggers | 0 | 4 |
| Score | Low | Medium-High |

**Key benefits:**
- Agent knows exactly when to use this skill
- Agent knows when NOT to use it
- Reduces skill collision
- Improves user experience

---

## CLOSING

> "Sensei helps you write better skills by enforcing compliance automatically. Install it, run it on your skills, and eliminate skill collision."

**Call to action:**
```bash
git clone https://github.com/spboyer/sensei.git ~/.copilot/skills/sensei
```

---

## Q&A Prep

**Q: What's the Ralph loop?**
A: Read → Score → Improve → Verify → Repeat until target score reached.

**Q: What's Medium-High adherence?**
A: Has explicit USE FOR triggers AND DO NOT USE FOR anti-triggers.

**Q: Does it modify my code?**
A: Only the SKILL.md frontmatter. You approve all changes before commit.
