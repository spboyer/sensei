# Project Context

- **Owner:** Shayne Boyer (spboyer@live.com)
- **Project:** GitHub Pages marketing site for Sensei — Astro + Tailwind CSS, Danish minimalist design, black/gray/orange palette
- **Stack:** Astro, Tailwind CSS, GitHub Pages, GitHub Actions
- **Created:** 2026-02-09

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-02-09: Astro + Tailwind v4 scaffold

- **Worktree:** Site development lives in `C:\Users\shboyer\GitHub\sensei-site` on branch `feat/gh-pages-site`. Main branch stays untouched for Squad state.
- **Astro 5.x + Tailwind v4:** Uses `@tailwindcss/vite` plugin (not the deprecated `@astrojs/tailwind` integration). Theme is configured via CSS `@theme` directives in `docs/src/styles/global.css`, not a JS config file.
- **Key paths:**
  - `docs/astro.config.mjs` — Astro config with GitHub Pages settings (`site`, `base: '/sensei'`, `output: 'static'`)
  - `docs/src/styles/global.css` — Tailwind v4 theme (colors, fonts)
  - `docs/src/layouts/BaseLayout.astro` — Base layout with Inter font via Google Fonts CDN
  - `docs/src/pages/index.astro` — Placeholder landing page
  - `.github/workflows/deploy-pages.yml` — GitHub Actions deploy workflow (triggers on `docs/**` changes to main)
- **Color palette:** black (#0a0a0a), dark-gray (#1a1a1a), mid-gray (#6b7280), light-gray (#f5f5f5), orange-accent (#f97316)
- **Font:** Inter loaded from Google Fonts CDN, with system font fallbacks
- **CRLF note:** Worktree uses `core.autocrlf = false` to avoid line-ending conflicts with Astro-generated files

📌 Team update (2026-02-09): Tailwind v4 uses @tailwindcss/vite, not @astrojs/tailwind; CSS-first config via @theme directives — decided by Rusty
📌 Team update (2026-02-09): GitHub Pages deploy workflow uses two-job pattern (build + deploy) at .github/workflows/deploy-pages.yml — decided by Rusty
📌 Team update (2026-02-09): Astro site lives in docs/ subdirectory; worktree on feat/gh-pages-site branch — decided by Rusty
