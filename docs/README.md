# Sensei — Site

Marketing and documentation site for [Sensei](https://spboyer.github.io/sensei/).

Built with Astro 5.x and Tailwind CSS v4. Single-page, zero client JS, static output.

## Project Structure

```text
docs/
├── astro.config.mjs          # Site config (base: /sensei, static output)
├── package.json
├── public/                    # Static assets
├── src/
│   ├── components/
│   │   ├── Hero.astro         # Tagline, install command, copy-to-clipboard
│   │   ├── Problem.astro      # "Why skills fail" pain point
│   │   ├── HowItWorks.astro   # Three-step workflow explanation
│   │   ├── BeforeAfter.astro  # Low→High YAML transformation (manual syntax highlight)
│   │   ├── ScoringLevels.astro # Low / Medium / Medium-High / High breakdown
│   │   ├── QuickStart.astro   # Install + run commands, copy-to-clipboard
│   │   └── Footer.astro       # Links, copyright
│   ├── layouts/
│   │   └── BaseLayout.astro   # <head>, OG/Twitter meta tags, global styles
│   ├── pages/
│   │   └── index.astro        # Single landing page composing all components
│   └── styles/
│       └── global.css         # Tailwind v4 @theme directives (palette, typography)
└── tsconfig.json
```

## Commands

Run from the `docs/` directory:

| Command           | Action                                              |
| :---------------- | :-------------------------------------------------- |
| `npm install`     | Install dependencies                                |
| `npm run dev`     | Local dev server at `localhost:4321/sensei/`         |
| `npm run build`   | Production build to `dist/` (static HTML, no JS)    |
| `npm run preview` | Preview the production build locally before deploy  |

## Deployment

GitHub Actions auto-deploys on push to `main` when `docs/**` changes.

- **Workflow:** `.github/workflows/deploy-pages.yml`
- **Pattern:** Two-job build + deploy (checkout → build → upload artifact → deploy-pages)
- **Trigger:** Push to `main` (`docs/**` path filter) + manual `workflow_dispatch`
- **Prerequisite:** GitHub Pages source must be set to "GitHub Actions" in repo settings

## Design System

Danish minimalist. Black ground, restrained palette, generous whitespace.

### Palette

| Token              | Value     | Usage                        |
| :----------------- | :-------- | :--------------------------- |
| `--color-black`    | `#0a0a0a` | Page background              |
| `--color-dark-gray`| `#1a1a1a` | Card / section backgrounds   |
| `--color-mid-gray` | `#6b7280` | Secondary text, dividers     |
| `--color-light-gray`| `#f5f5f5`| Primary text                 |
| `--color-orange-accent` | `#f97316` | CTAs, highlights, keys   |

### Typography

Inter via `--font-sans`. System font stack fallback.

### Spacing

All sections: `py-24 md:py-32 px-6`. Content: `max-w-5xl mx-auto` (hero: `max-w-4xl`). Dividers: `border-mid-gray/10`.

### Syntax Highlighting

BeforeAfter uses hand-crafted `<span>` elements — three colors (orange keys, light-gray values, mid-gray comments). No Shiki/Prism dependency.

## Components

Each component is self-contained — own data, markup, inline scripts. No shared state, no external JS.

| Component        | Purpose                                          |
| :--------------- | :----------------------------------------------- |
| `Hero`           | Headline, subline, install command with clipboard |
| `Problem`        | Names the pain — skill collision, vague triggers  |
| `HowItWorks`     | Three-step scan → score → fix flow               |
| `BeforeAfter`    | Side-by-side YAML: Low score → High score         |
| `ScoringLevels`  | Four-tier breakdown with criteria per level       |
| `QuickStart`     | Install + run block with clipboard, repo link     |
| `Footer`         | Navigation links, license, copyright              |

## Notes

- Tailwind v4 uses `@tailwindcss/vite` — not `@astrojs/tailwind`. Theme lives in CSS, not a JS config file.
- All external links use `target="_blank" rel="noopener noreferrer"`.
- Copy-to-clipboard uses `navigator.clipboard` with unique element IDs (avoids collisions between Hero and QuickStart).
