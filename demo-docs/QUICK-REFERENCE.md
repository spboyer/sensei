# Sensei Demo - Quick Reference

> One-page prep sheet for demos

---

## 5-Second Pitch
**Sensei automates skill frontmatter compliance so agents invoke the right skill.**

---

## Key Commands

| Command | Description |
|---------|-------------|
| `Run sensei on <skill>` | Improve single skill |
| `Run sensei on <skill> --fast` | Skip tests |
| `Run sensei on all Low-adherence skills` | Batch fix |
| `sensei help` | Show help |

---

## Demo Files

| File | Purpose |
|------|---------|
| `demo-docs/sample-skill/SKILL.md` | "Bad" skill (before) |
| `demo-docs/sample-skill/SKILL-after.md` | "Good" skill (after) |
| `demo-docs/run-demo.sh` | Automated demo script |
| `demo-docs/run-demo.sh --reset` | Reset sample skill |

---

## Scoring Levels

| Level | Criteria |
|-------|----------|
| **Low** | < 150 chars OR no triggers |
| **Medium** | ≥ 150 chars + implicit triggers |
| **Medium-High** | Has USE FOR + DO NOT USE FOR |
| **High** | Medium-High + INVOKES + routing clarity |

---

## Before/After Comparison

```
BEFORE (Low):
description: 'Utility for working with files'

AFTER (Medium-High):
description: |
  **UTILITY SKILL** - Perform common file system operations...
  USE FOR: "read file", "write file", "list directory"...
  DO NOT USE FOR: searching contents (use grep), editing code...
```

---

## FAQ Quick Answers

**Q: Does it change my code?**
A: Only SKILL.md frontmatter. You approve before commit.

**Q: What's the Ralph loop?**
A: Read → Score → Improve → Verify → Repeat until target score.

**Q: Why Medium-High target?**
A: It has explicit triggers AND anti-triggers - minimum for good routing.

---

## Pre-Demo Checklist

- [ ] Sensei installed: `ls ~/.copilot/skills/sensei`
- [ ] Dependencies: `cd ~/.copilot/skills/sensei/scripts && npm install`
- [ ] Sample reset: `./demo-docs/run-demo.sh --reset`
- [ ] Terminal font readable (18pt+)
- [ ] Notifications off

---

## Links

- **Repo:** https://github.com/spboyer/sensei
- **Anthropic Skills Docs:** https://support.anthropic.com/en/articles/12512198
- **Ralph Loop:** https://github.com/soderlund/ralph
