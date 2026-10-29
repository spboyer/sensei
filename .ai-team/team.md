# Team Roster

> GitHub Pages site for Sensei — clean Danish-style developer marketing page built with Astro + Tailwind CSS.

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. Does not generate domain artifacts. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Rusty | Lead | `.ai-team/agents/rusty/charter.md` | ✅ Active |
| Linus | Frontend Dev | `.ai-team/agents/linus/charter.md` | ✅ Active |
| Basher | Design & Content | `.ai-team/agents/basher/charter.md` | ✅ Active |
| Livingston | Tester | `.ai-team/agents/livingston/charter.md` | ✅ Active |
| Scribe | Session Logger | `.ai-team/agents/scribe/charter.md` | 📋 Silent |

## Model Routing

Default to **Auto / inherited runtime routing**: omit the `model` override on delegated tasks. App sessions may expose `auto`; use only the values supported by the actual tool. Inheritance respects **Copilot Fusion** when the host/user exposes and selects it. Fusion is a product routing option, not a model ID to invent or pass to `task`.

The following user-configured role preferences apply only to matching work and where runtime instructions permit configured overrides:

| Member | Work | Preferred override |
|--------|------|--------------------|
| Rusty | Architecture, complex decisions, code review | `gpt-6.1-sol` |
| Linus | Complex implementation, debugging, refactoring | `gpt-6.1-sol` |
| Basher | Content and visual/design review | `claude-sonnet-5.5` |
| Livingston | Independent QA, test design, review | `claude-sonnet-5.5` |
| Livingston | Complex test implementation | `gpt-6.1-sol` |
| Scribe | Routine logging and memory | Inherit; `claude-haiku-5.5` only if explicitly chosen by the user |

Current user direction takes precedence over these preferences. Charters refine the matching tasks; routine work without an explicit preference inherits. This is role-fit guidance, not a benchmark ranking or a guarantee of tool/image support.

Before setting `model`, verify that the current tool supports the ID and that runtime override rules authorize it. Omit `model`, `reasoning_effort`, and `context_tier` unless explicitly requested or configured as permitted by the runtime. Never copy the parent model or stale session settings merely to fill fields. On unsupported surfaces, inherit the session selection and disclose any unmet explicit model requirement. If a requested/configured model is unavailable, report the limitation; do not silently substitute another model or use inheritance to bypass an explicit requirement.

The 2026-10-29 decision supersedes older fixed model assignments; unrelated governance remains unchanged.

**Reviewed policy updates:** The protected-branch guard allows only `.ai-team/team.md`, `.ai-team/decisions.md` (the authoritative policy ledger), and `.ai-team/agents/<one-level-agent>/charter.md` as curated team files in PRs to `main` or `preview`. Histories, logs, decision inbox, casting, all other team state, and `team-docs` remain blocked. Removals are allowed; renames are checked by destination. This narrow exception supports reviewed charter/model-policy updates, not runtime-state merges.

## Project Context

- **Owner:** Shayne Boyer (spboyer@live.com)
- **Stack:** Astro, Tailwind CSS, GitHub Pages, GitHub Actions
- **Description:** Build a clean, Danish-style GitHub Pages marketing site for Sensei at spboyer.github.io/sensei with black/gray/orange palette.
- **Created:** 2026-02-09
- **Repository:** spboyer/sensei
- **Worktree strategy:** worktree-local — curated Squad policy lives on main; runtime state stays out of protected-branch PRs; gh-pages work uses a git worktree
