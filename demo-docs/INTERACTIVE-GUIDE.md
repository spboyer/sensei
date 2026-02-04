# Sensei Demo - Interactive Copilot CLI Guide

> Follow these steps in Copilot CLI for a hands-on demo

---

## Setup (Before Demo)

```bash
# 1. Install Sensei (if not already)
git clone https://github.com/spboyer/sensei.git ~/.copilot/skills/sensei
cd ~/.copilot/skills/sensei/scripts && npm install

# 2. Reset the sample skill to "bad" state
cd ~/.copilot/skills/sensei
./demo-docs/run-demo.sh --reset
```

---

## Demo Steps

### Step 1: Show the Problem

**You say:**
> Show me the contents of demo-docs/sample-skill/SKILL.md

**Expected:** Copilot shows the "bad" skill with brief description

**Point out:**
- "Only 32 characters in description"
- "No triggers - agent doesn't know when to activate"
- "No anti-triggers - will collide with similar skills"

---

### Step 2: Check Token Count

**You say:**
> Count tokens in demo-docs/sample-skill/SKILL.md

**Expected:** Low token count (~50 tokens)

**Point out:**
- "Token budget is fine, but content is insufficient"

---

### Step 3: Run Sensei

**You say:**
> Run sensei on file-utils --fast

**Expected:** Sensei executes the Ralph loop

**Watch for:**
1. **READ** - Loads the skill
2. **SCORE** - Shows "Low" adherence
3. **IMPROVE** - Adds USE FOR and DO NOT USE FOR
4. **TOKENS** - Verifies budget
5. **SUMMARY** - Before/after comparison
6. **PROMPT** - Asks: Commit, Create Issue, or Skip?

**Choose:** Skip (for demo purposes)

---

### Step 4: Show the Improved Version

**You say:**
> Show me demo-docs/sample-skill/SKILL-after.md

**Expected:** The improved skill with full frontmatter

**Point out:**
- "Skill type prefix: **UTILITY SKILL**"
- "7 trigger phrases under USE FOR"
- "4 anti-triggers under DO NOT USE FOR"
- "Score: Medium-High"

---

### Step 5: Compare Before/After

**You say:**
> Compare the token counts of demo-docs/sample-skill/SKILL.md and demo-docs/sample-skill/SKILL-after.md

**Expected:** Side-by-side token comparison

---

### Step 6: Explain Options

**You say:**
> What other ways can I run sensei?

**Expected:** Sensei help output showing:
- Single skill: `Run sensei on my-skill`
- Fast mode: `Run sensei on my-skill --fast`
- Multiple: `Run sensei on skill-a, skill-b`
- By score: `Run sensei on all Low-adherence skills`
- All: `Run sensei on all skills`

---

## Wrap Up

**You say:**
> Thanks! Let me know if you have questions about Sensei.

**Key takeaways:**
1. Sensei automates frontmatter improvement
2. Target score is Medium-High (USE FOR + DO NOT USE FOR)
3. You approve all changes before commit
4. Use `--fast` to skip tests for quick iteration

---

## Troubleshooting

**If Sensei doesn't trigger:**
- Make sure the skill is installed in `~/.copilot/skills/sensei`
- Say exactly: "Run sensei on file-utils"

**If token count fails:**
- Run `cd ~/.copilot/skills/sensei/scripts && npm install`

**If you want to restart:**
- Run `./demo-docs/run-demo.sh --reset`
