# Project Context

- **Owner:** Shayne Boyer (spboyer@live.com)
- **Project:** GitHub Pages marketing site for Sensei — Astro + Tailwind CSS, Danish minimalist design, black/gray/orange palette
- **Stack:** Astro, Tailwind CSS, GitHub Pages, GitHub Actions
- **Created:** 2026-02-09

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

📌 Team update (2026-02-09): GitHub Pages deploy workflow uses two-job pattern (build + deploy) at .github/workflows/deploy-pages.yml — decided by Rusty
📌 Team update (2026-02-09): Astro site lives in docs/ subdirectory; worktree on feat/gh-pages-site branch — decided by Rusty
📌 Team update (2026-02-09): Tailwind v4 uses @tailwindcss/vite, not @astrojs/tailwind; CSS-first config via @theme directives — decided by Rusty

### Landing page build (2026-02-09)

- **Components created** (all in `sensei-site/docs/src/components/`):
  - `Hero.astro` — Title, tagline, install command with copy-to-clipboard
  - `Problem.astro` — 2×2 grid of problem cards with orange left border
  - `HowItWorks.astro` — 6-step Ralph loop as horizontal flow with connecting line
  - `BeforeAfter.astro` — Side-by-side YAML code blocks with manual syntax highlighting
  - `ScoringLevels.astro` — 4-level progression bar, Medium-High highlighted as target
  - `QuickStart.astro` — Install command + usage examples + GitHub link
  - `Footer.astro` — Minimal nav links + branding

- **Architecture decisions:**
  - No external JS — copy-to-clipboard uses inline `<script>` with `navigator.clipboard` API, unique IDs per instance (hero vs quickstart)
  - Manual YAML syntax highlighting via Tailwind color classes on `<span>` elements — avoids Shiki/Prism dependency, keeps zero-JS philosophy
  - Section dividers are `<hr>` elements with `border-mid-gray/10` — barely visible, structural not decorative
  - All components use the custom Tailwind v4 theme tokens (`text-light-gray`, `bg-dark-gray`, `text-orange-accent`, etc.) — no raw hex values
  - Mobile-first grid: `grid-cols-1 md:grid-cols-{n}` pattern throughout
  - No rounded corners, no shadows, no gradients — flat Danish minimalist aesthetic

- **Patterns established:**
  - Data-driven components: arrays of objects in frontmatter, `.map()` in template
  - Copy button pattern: unique IDs, inline SVG icons, 2s checkmark feedback
  - Code block pattern: `<pre>` + `<code>` with `bg-dark-gray p-6 font-mono text-sm`
  - Section rhythm: `py-24 md:py-32 px-6` with `max-w-5xl mx-auto` (hero uses `max-w-4xl`)

📌 Team update (2026-02-17): Blog post examples must use generic/themed references (pdf-processor), not Azure-specific MCP tools; Anthropic uses "informed by" framing — decided by Basher
