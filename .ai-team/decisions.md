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

### 2026-02-09: External links require target and rel attributes
**By:** Livingston (Tester)
**What:** All external links on the site must include `target="_blank"` and `rel="noopener noreferrer"`. QA pass found QuickStart.astro was missing both; now consistent across all components.
**Why:** Security (noopener prevents reverse tabnapping) and consistency. Any future components with external links must follow this pattern.

### 2026-02-09: SEO meta tags added to BaseLayout
**By:** Livingston (Tester)
**What:** BaseLayout.astro now includes Open Graph tags (og:title, og:description, og:type, og:url, og:image), Twitter card tags (twitter:card, twitter:title, twitter:description), and a meta description tag.
**Why:** Required for link previews on social media and search engine indexing. Were completely missing from the initial build.

### 2026-02-09: Enable GitHub Pages before deploy workflow can succeed
**By:** Rusty
**What:** The `deploy-pages.yml` workflow build job passes, but the deploy job fails with `404 Not Found` because GitHub Pages is not enabled on the `spboyer/sensei` repository. Owner must go to **Settings → Pages → Build and deployment → Source** and select **"GitHub Actions"**. After enabling, either re-run the failed workflow or push any change to `docs/` to trigger a new deploy. The site URL will be `https://spboyer.github.io/sensei/`.
**Why:** The `actions/deploy-pages@v4` action requires the Pages API to be enabled on the repo. This is a one-time manual step that can't be done via git — it's a repo settings change. Once enabled, all future pushes to `main` touching `docs/**` will auto-deploy.

### 2026-02-09: Social and article content formatting rules
**By:** Basher (consolidated 2026-02-18)
**What:** Three content types with distinct formatting rules: (1) **LinkedIn feed posts** — plain text only (no markdown), links in first comment not post body, personal voice ("I built"). (2) **LinkedIn Articles** — markdown OK for headers, bold/italic, code blocks, but **no tables** (render as broken text). Use bold-label definition lists (`**Label** — Description.`) instead. (3) **X posts** — thread format, 280 char limit per tweet, 0-1 hashtags. All content uses Shayne's personal voice.
**Why:** LinkedIn feed posts and Articles have completely different rendering engines — conflating them causes either broken feed posts or stripped-down articles. Feed post links are penalized by the algorithm. Tables in Articles render as broken text blobs. Personal voice drives higher engagement. These rules are permanent content standards.

### 2026-02-18: SkillsBench evidence base added as reference document
**By:** Basher
**What:** Created `references/skillsbench.md` summarizing SkillsBench paper (arXiv:2602.12670) findings. Updated `README.md` intro with 2-sentence evidence summary and added paper to References section. Document is 859 tokens (under 2000 limit).
**Why:** Sensei's design decisions (token budgets, 2–3 module focus, scoring levels, anti-pattern detection) now have empirical backing from a 7,308-trajectory benchmark. The self-generation warning (F3: -1.3pp) directly validates Sensei's approach of scoring human-authored skills rather than auto-generating them. Any future design debates can reference this evidence base instead of arguing from intuition.

### 2026-02-18: User directive — model usage for SkillsBench implementation
**By:** Shayne Boyer (via Copilot)
**What:** All coders must use Opus 4.6 model. All code review must use GPT-5.3-Codex. Fix any issues found during review before merging.
**Why:** User request — captured for team memory

### 2026-02-18: Score module test patterns use temp directories for filesystem isolation
**By:** Livingston
**What:** `score.test.ts` uses `mkdtempSync`/`rmSync` in `beforeEach`/`afterEach` for tests that need filesystem access (`checkModuleCount`, `scoreSkill`). Pure function checks (`classifyComplexity`, `checkProceduralContent`, `checkOverSpecificity`, `checkNegativeDeltaRisk`) take strings/numbers directly — no filesystem mocking needed. All 40 tests pass alongside the existing 12 in `types.test.ts`.
**Why:** Temp directories are more reliable than `vi.mock('node:fs')` for integration-level checks that actually read directory listings. Pure function testing for the remaining checks keeps tests fast and deterministic. This pattern should be followed for any future filesystem-dependent scoring checks.

### 2026-02-18: SkillsBench advisory scoring checks added
**By:** Rusty
**What:** Added 5 advisory checks (11–15) to `references/scoring.md` based on SkillsBench paper findings. Checks cover module count optimization (2–3 optimal), complexity classification (detailed > comprehensive), negative delta risk detection, procedural content quality, and over-specificity warnings. These are advisory-only — they do not change the existing Low/Medium/Medium-High/High scoring levels. Includes a summary table mapping each check to paper evidence.
**Why:** SkillsBench (arXiv:2602.12670) provides the first large-scale empirical evidence on what makes skills effective vs harmful. Key finding: excessive documentation actually hurts performance (−2.9pp for comprehensive skills). These checks encode those findings so Sensei can warn users before they over-engineer their skills. Kept file at 1996/2000 tokens through aggressive compression.

### 2026-02-17: Blog post examples must use generic/themed references, not internal Azure tools
**By:** Basher
**What:** INVOKES and FOR SINGLE OPERATIONS examples in sensei-launch.md must use the pdf-processor theme (pdf-tools MCP, file-system) — not Azure-specific MCP tools (azure-azd, azure-deploy). The Anthropic reference uses "informed by" framing, not "builds on."
**Why:** The blog post is public-facing. Azure-internal MCP tool names mean nothing to external readers and create a false impression that Sensei is Azure-specific. All examples in a post should use a consistent theme — the pdf-processor skill is the running example throughout, so INVOKES/FOR SINGLE OPERATIONS must match. The Anthropic framing matters because Sensei draws from multiple specification influences; over-crediting one source misrepresents the project's origins. These fixes were approved once and lost to a rewrite — this decision prevents a third occurrence.

### 2026-02-17: docs/README.md documents actual project, not Astro boilerplate
**By:** Basher
**What:** Replaced the default Astro Starter Kit README with project-specific documentation covering structure, commands, deployment, design system (palette tokens, typography, spacing conventions), component inventory, and implementation notes. No emoji section headers — clean, scannable, developer-focused.
**Why:** The boilerplate README was actively misleading — it described a generic Astro project, not the Sensei site. Any contributor opening `docs/` would get zero useful context about the palette, the deployment pipeline, or why Tailwind v4 uses `@tailwindcss/vite` instead of the Astro integration. The new README pulls from decisions.md so the documented design system matches what was actually decided and built.

### 2026-02-18: Score subcommand documented in README.md and AGENTS.md
**By:** Basher
**What:** Added `npm run tokens -- score [skillDir]` to both README.md (Using Scripts Directly + Token Budget sections) and AGENTS.md (repo tree, Testing Changes, CLI Reference). README.md now at 4074/4200 tokens; AGENTS.md at 1553/2000 tokens.
**Why:** Pre-PR documentation polish. The `score` command runs 5 SkillsBench-informed advisory checks (module count, complexity, negative delta risk, procedural content, over-specificity). Developers need to discover it alongside the existing `count`/`check`/`suggest`/`compare` commands. Kept additions minimal — README has only ~126 tokens of remaining headroom, so any future README additions need to be offset by trimming elsewhere.

### 2026-02-18: v1.0.0 release created
**By:** Basher
**What:** Created v1.0.0 GitHub Release at https://github.com/spboyer/sensei/releases/tag/v1.0.0 with structured release notes covering all Sensei capabilities. Advisory scoring checks (module count, complexity, procedural quality, over-specificity, negative delta risk) presented as Sensei's built-in intelligence — not as external integration or paper reference.
**Why:** Per Shayne's directive, features are framed as what Sensei does natively. The release notes use a clean developer-focused tone: intro → 7 feature bullets → quick start → Anthropic spec note. This framing decision applies to all future public-facing content about Sensei's advisory checks.

### 2026-02-18: Sensei audit of agent-customization (microsoft/vscode-copilot-chat)
**By:** Rusty
**What:** Audited VS Code's agent-customization skill and identified three frontmatter additions to reach High score: (1) add `**WORKFLOW SKILL**` type prefix, (2) add INVOKES clause (Git, shell, YAML parser), (3) add FOR SINGLE OPERATIONS fallback guidance (~15 min combined effort). Secondary finding: 6 reference modules (14.4KB) incurs −2.9pp SkillsBench penalty; consolidation to 2–3 modules would yield +13.7pp net gain (medium effort, future iteration).
**Why:** Sensei's scoring methodology and SkillsBench-informed advisory checks are portable to external skills. Module count impact (Li et al. arXiv:2602.12670) is empirically validated; 6 refs → 2–3 refs is data-justified optimization. Knowledge capture: decision trees that burden users with task classification ("Instructions vs Skill?") harm performance (16/84 tasks); antidote is affirmative "Use when:" guidance before anti-patterns.
