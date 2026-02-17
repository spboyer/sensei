# Project Context

- **Owner:** Shayne Boyer (spboyer@live.com)
- **Project:** GitHub Pages marketing site for Sensei — Astro + Tailwind CSS, Danish minimalist design, black/gray/orange palette
- **Stack:** Astro, Tailwind CSS, GitHub Pages, GitHub Actions
- **Created:** 2026-02-09

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

📌 Team update (2026-02-09): Astro site lives in docs/ subdirectory; worktree on feat/gh-pages-site branch — decided by Rusty
📌 Team update (2026-02-09): Tailwind v4 uses @tailwindcss/vite, not @astrojs/tailwind; CSS-first config via @theme directives — decided by Rusty
📌 Team update (2026-02-09): Landing page complete — 7 components (Hero, Problem, HowItWorks, BeforeAfter, ScoringLevels, QuickStart, Footer), all self-contained, no external JS — built by Linus
📌 QA pass (2026-02-09): Full QA pass completed by Livingston — 3 files changed:
  - BaseLayout.astro: Added OG meta tags (og:title, og:description, og:type, og:url, og:image), Twitter card tags (twitter:card, twitter:title, twitter:description), and meta description. Props interface extended with optional description.
  - QuickStart.astro: Fixed GitHub link missing target="_blank" and rel="noopener noreferrer" — all external links now consistent.
  - favicon.svg: Replaced Astro default logo with orange (#f97316) torii gate icon matching the sensei/dojo theme.
📌 QA verified (2026-02-09): All Tailwind custom colors (black, dark-gray, mid-gray, light-gray, orange-accent) are defined in @theme in global.css. No broken class references. All components use mobile-first responsive design with md: breakpoints. Semantic HTML hierarchy (h1→h2→h3) is clean. Both copy buttons have aria-labels. Footer nav links all have target="_blank" rel="noopener noreferrer".
📌 Team update (2026-02-09): GitHub Pages not yet enabled — deploy job fails with 404. Owner must enable Pages with "GitHub Actions" source in repo settings — decided by Rusty
📌 Team update (2026-02-17): docs/README.md now documents actual project (structure, design system, component inventory) — not Astro boilerplate — decided by Basher
