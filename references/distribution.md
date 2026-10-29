# Skill Distribution

The [Package Sensei skill workflow](../.github/workflows/package-skill.yml) checks
the distribution contract on pull requests and publishes an Actions artifact
after payload changes reach `main`. It can also be run manually on `main`. It uses
only `contents: read`; it does not push to another repository, create PRs, or
require a custom secret. This is separate from the npm package and the compliance
Action. In an installed bundle, repository workflow files are intentionally absent;
see the [source workflow](https://github.com/spboyer/sensei/blob/main/.github/workflows/package-skill.yml).

## Bundle Contract

The artifact is named `sensei-skill-<full-source-SHA>` and retained for 30 days:

| File | Contract |
|------|----------|
| `sensei.tar.gz` | Committed files under a single `sensei/` directory |
| `source.json` | Schema version 1, skill name, canonical source URL, full commit SHA/URL, payload paths, archive filename and SHA-256 |
| `SHA256SUMS` | Archive checksum, verifiable with `sha256sum --check SHA256SUMS` |

The explicit payload is root `SKILL.md`, full `references/` and `scripts/`,
`package.json`, `.token-limits.json`, `agent-registry.json`, `README.md`, and
`LICENSE.txt`. Repository workflows/team scaffolding and untracked files are not
included. Packaging rejects symlinks/submodules and missing payload paths.
It reads the committed tree, not local edits. To create a bundle locally:

```bash
node --test scripts/package-skill.test.mjs
node scripts/package-skill.mjs /tmp/sensei-bundle
```

The output directory must not already exist. These are **source bundles**, not
ready-built CLI installations. After extraction, `npm ci --prefix scripts`
installs the locked tooling dependencies; `npm run build` produces the compiled
CLI. Optional GEPA dependencies and LLM credentials must be provisioned separately.
Packaging checks the payload and checksum, not CLI behavior or frontmatter quality.
The checksum and provenance are not a signed attestation; obtain them from a
trusted source run and check the commit before installing.

## Pull-based Dotfiles Integration

`spboyer/agent-dotfiles` can continue fetching this **public** repository without
a source-read credential. Its biweekly workflow should resolve `main` to an exact
commit, import the payload above, record that SHA and file checksums, and propose
a reviewable PR. It does not depend on these Actions artifacts: artifact downloads
require suitable GitHub authentication and expire with retention. A successful
source bundle run does not mean downstream changes have been reviewed or merged.

If a source becomes private, its reader needs an authorized credential scoped to
that source repository with **Contents: read**. A private target's own workflow
uses its own `GITHUB_TOKEN` with **Contents: write** and **Pull requests: write**
to open update PRs, subject to repository/organization policy allowing Actions to
create PRs. Sensei's `GITHUB_TOKEN` cannot access private `agent-dotfiles`.
No cross-repository dispatch or credential is configured here.
