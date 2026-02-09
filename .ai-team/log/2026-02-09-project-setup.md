# 2026-02-09 — Project Setup

**Requested by:** Shayne Boyer

- Rusty (Lead) set up git worktree at `C:\Users\shboyer\GitHub\sensei-site` on branch `feat/gh-pages-site`.
- Rusty scaffolded Astro 5.x project with Tailwind v4 in `docs/` directory.
- Configured GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) for deployment.
- Build verified clean.
- **Key decision:** Tailwind v4 uses CSS-first config (`@theme` directives), no `tailwind.config.mjs`.
