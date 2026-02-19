# Session: Sensei Audit of agent-customization Skill

**Date:** 2026-02-19  
**Requested by:** Shayne Boyer (relaying from Harald)  
**Project:** microsoft/vscode-copilot-chat / agent-customization skill

## What Happened

Rusty ran a Sensei audit on the agent-customization skill. **Baseline:** Medium-High score (475-char description, explicit USE FOR triggers, anti-triggers present). **Blockers to High:** Missing skill type prefix, INVOKES clause, and FOR SINGLE OPERATIONS routing.

**Three recommended frontmatter additions:**
1. Prefix description with `**WORKFLOW SKILL**` (unblocks High)
2. Add INVOKES clause (Git, shell, YAML parser)
3. Add FOR SINGLE OPERATIONS fallback guidance

**Combined effort:** ~15 minutes.

## Key Finding

SkillsBench analysis revealed over-modularization risk: 6 reference files (14.4KB) incurs −2.9pp penalty. Optimal: 2–3 files. Consolidation would yield +13.7pp net performance gain but requires medium effort (proposed: primitives.md + examples.md with deprecation stubs for backwards compatibility).

## Learnings Captured

- Sensei scoring methodology is portable (external skills auditable)
- Module count impact is empirically validated (SkillsBench arXiv:2602.12670)
- Decision trees that burden users with classification ("Instructions vs Skill?") harm performance (16/84 negative cases)
