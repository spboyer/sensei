# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Architecture & project setup | Rusty | Astro config, GitHub Actions, project structure, worktree setup |
| Frontend & components | Linus | Astro components, layouts, pages, Tailwind styling, responsive design |
| Design & content | Basher | Copy, color palette, typography, visual design, section content |
| Testing & QA | Livingston | Build verification, link checks, responsive testing, accessibility |
| Code review | Rusty | Review PRs, check quality, suggest improvements |
| Scope & priorities | Rusty | What to build next, trade-offs, decisions |
| Session logging | Scribe | Automatic — never needs routing |

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If components are being built, spawn Livingston to verify builds simultaneously.
