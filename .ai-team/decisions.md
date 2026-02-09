# Decisions

> Shared team brain. All agents read this. Scribe merges new decisions from the inbox.

### 2026-02-09: Project stack and approach
**By:** Squad (Coordinator)
**What:** Sensei GitHub Pages site uses Astro + Tailwind CSS, deployed via GitHub Actions to gh-pages branch. Single landing page to start, expandable later. Danish minimalist design with black/gray/orange palette.
**Why:** User chose Astro for extensibility (Markdown support, component islands, zero JS by default). Single page keeps initial scope tight.

### 2026-02-09: Git worktree strategy
**By:** Squad (Coordinator)
**What:** Use git worktrees to separate gh-pages work from main branch. Squad state stays on main. Site development happens in a worktree checked out to a feature branch, with build output deployed to gh-pages.
**Why:** Preserves Squad team state on main branch. Worktrees allow parallel branch work without stashing or losing context.

### 2026-02-09: Tailwind v4 via @tailwindcss/vite (not @astrojs/tailwind)
**By:** Rusty
**What:** Astro 5.x ships with Vite 6. Tailwind CSS v4 integrates via `@tailwindcss/vite` plugin, not the legacy `@astrojs/tailwind` Astro integration. Theme configuration uses CSS `@theme` directives in `docs/src/styles/global.css` instead of a `tailwind.config.mjs` JS file.
**Why:** `@astrojs/tailwind` targets Tailwind v3 and is incompatible with Tailwind v4's CSS-first configuration model. The Vite plugin is the officially recommended path for Tailwind v4 in any Vite-based framework.

### 2026-02-09: GitHub Pages deploy workflow structure
**By:** Rusty
**What:** Deploy workflow at `.github/workflows/deploy-pages.yml` uses a two-job pattern: `build` (checkout → setup-node → npm ci → build → upload-pages-artifact) and `deploy` (deploy-pages). Triggers on push to main when `docs/**` changes, plus manual `workflow_dispatch`.
**Why:** Two-job split follows GitHub's recommended pattern for Pages deployment. The `concurrency` group with `cancel-in-progress: false` prevents deploy races. Node 22 matches current LTS.

### 2026-02-09: Site lives in docs/ subdirectory
**By:** Rusty
**What:** The Astro project lives in `docs/` within the repo, not at root. The worktree at `C:\Users\shboyer\GitHub\sensei-site` on branch `feat/gh-pages-site` isolates site work from main.
**Why:** Keeps the skill project root clean. The `docs/` convention is well-understood and GitHub Pages supports it natively. Worktree strategy preserves Squad state on main without branch-switching gymnastics.
