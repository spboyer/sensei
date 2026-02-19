# Session: PR #3866 Revert Reference Reorganization

**Date:** 2026-02-19  
**Requested by:** Shayne Boyer  

## What Happened

Basher reverted the reference file reorganization in PR #3866 per Harald's feedback from the VS Code Copilot Chat team. The consolidation from 6 files to 2 created churn and integration friction in their external workflow.

**Restored structure:**
- Deleted consolidated files: `file-customizations.md`, `agent-extensibility.md`
- Restored original 6 reference files: `instructions.md`, `workspace-instructions.md`, `prompts.md`, `agents.md`, `skills.md`, `hooks.md`
- Updated SKILL.md Quick Reference table back to 6-row format
- Kept improved frontmatter description and Common Pitfalls section
- Added PR comment recommending the reorg as a future improvement once external tooling stabilizes

## Decisions Made

None — revert per stakeholder feedback, not new team direction.

## Release Notes

**Sensei v1.1.0** (SkillsBench branding removal from output-facing files)
- Stripped all SkillsBench references, arXiv citations, author names, and paper attribution from output-facing files
- Kept all practical guidance: module thresholds, complexity tiers, advisory checks, anti-patterns
- `references/skillsbench.md` retained as internal knowledge but no longer linked
- Files updated: SKILL.md, README.md, AGENTS.md, references/scoring.md, references/examples.md
- All token limits verified passing

## Status

✓ Complete
