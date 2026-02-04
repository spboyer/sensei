# Sensei Demo - Video Recording Outline

> **Duration:** 5 minutes | **Resolution:** 1920x1080 | **Format:** MP4

---

## Pre-Recording Checklist

- [ ] Terminal font size: 18pt+ (readable on small screens)
- [ ] Clean terminal history (`clear`)
- [ ] Reset sample skill: `./demo-docs/run-demo.sh --reset`
- [ ] Close unnecessary apps/notifications
- [ ] Test audio levels

---

## Recording Script

### 0:00-0:10 | TITLE CARD
**Screen:** Sensei logo or title slide
**Audio:** "Sensei - Automated skill frontmatter compliance"

---

### 0:10-0:40 | THE PROBLEM
**Screen:** Show `demo-docs/sample-skill/SKILL.md` in editor

```
description: 'Utility for working with files'
```

**Audio:**
> "Here's a common problem. This skill has a 32-character description. The agent has no idea when to use it or when NOT to use it. This causes skill collision - the wrong skill gets invoked."

**Action:** Highlight the brief description

---

### 0:40-1:10 | INTRODUCE SENSEI
**Screen:** Show Sensei README or help output

**Audio:**
> "Sensei fixes this automatically. It uses the Ralph loop - read, score, improve, verify, repeat - until your skill reaches Medium-High compliance."

**Action:** Scroll through the Ralph loop diagram in README

---

### 1:10-3:30 | LIVE DEMO
**Screen:** Copilot CLI terminal

**Audio:** 
> "Let me show you. I'll run Sensei on this skill."

**Type:**
```
Run sensei on file-utils --fast
```

**Audio (while running):**
> "Sensei reads the skill... scores it as Low... now it's improving the frontmatter... adding trigger phrases... adding anti-triggers..."

**Show the output as it appears:**
- READ step
- SCORE step (Low)
- IMPROVE step
- TOKENS check
- SUMMARY display

**Audio:**
> "It shows me the before and after comparison, and asks what I want to do."

---

### 3:30-4:30 | THE RESULT
**Screen:** Split view or side-by-side comparison

**Audio:**
> "Look at the difference. Before: 32 characters, no triggers. After: 400 characters, 7 triggers, 4 anti-triggers. The score went from Low to Medium-High."

**Show comparison table:**
| Metric | Before | After |
|--------|--------|-------|
| Characters | 32 | ~400 |
| Triggers | 0 | 7 |
| Anti-triggers | 0 | 4 |
| Score | Low | Medium-High |

---

### 4:30-5:00 | CLOSING
**Screen:** Installation command + GitHub URL

**Audio:**
> "Install Sensei in one command. Clone it to your skills folder, run it on your skills, and eliminate skill collision."

**Show:**
```bash
git clone https://github.com/spboyer/sensei.git ~/.copilot/skills/sensei
```

**End card:** GitHub URL, your contact info

---

## Post-Production Notes

- Add captions for accessibility
- Speed up any waiting/loading sections (keep under 5 min)
- Add subtle background music (optional)
- Export at 1080p, 30fps minimum
