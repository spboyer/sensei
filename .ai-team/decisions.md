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

### 2026-02-09: Landing page component architecture
**By:** Linus
**What:** Built 7 Astro components composing the full landing page. Each component is self-contained with its own data, markup, and scripts. No shared state, no external JS dependencies. Copy-to-clipboard uses navigator.clipboard with unique element IDs to avoid collisions when the pattern appears twice (Hero + QuickStart).
**Why:** Zero-JS default is Astro's strength — inline scripts only hydrate what's needed. Unique IDs prevent DOM conflicts without adding a framework. Self-contained components mean any section can be reordered, removed, or extracted without side effects.

### 2026-02-09: Manual YAML syntax highlighting over Shiki/Prism
**By:** Linus
**What:** BeforeAfter.astro uses hand-crafted `<span>` elements with Tailwind color classes for YAML highlighting instead of a syntax highlighting library.
**Why:** Adding Shiki or Prism would introduce build-time dependencies and increase bundle complexity for exactly two code blocks. The manual approach uses three colors (orange for keys, light-gray for values, mid-gray for comments/parens) which matches the site's restrained palette perfectly. Trade-off: harder to maintain if examples change, but these are stable reference examples.

### 2026-02-09: Section spacing rhythm
**By:** Linus
**What:** All sections use `py-24 md:py-32 px-6` with content constrained to `max-w-5xl mx-auto` (hero uses `max-w-4xl` for tighter reading width). Dividers are near-invisible `<hr>` elements at `border-mid-gray/10`.
**Why:** Consistent vertical rhythm is the backbone of Danish minimalist design. The generous padding creates breathing room without decorative elements. The narrower hero container keeps the tagline from stretching too wide on desktop — every line should feel intentional, not accidental.
