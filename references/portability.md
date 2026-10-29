# Portable skills and host extensions

**Observed: 2026-10-29.** This is a sourced compatibility guide, not a promise
that every client version supports every feature. Recheck the linked host docs
before installation or deployment.

## Compatibility matrix

| Layer | Format/configuration | Discovery and execution limitations |
|---|---|---|
| [Agent Skills core](https://agentskills.io/specification.md) | `SKILL.md` with required string `name` and `description`; optional `license`, `compatibility`, string-map `metadata`, experimental string `allowed-tools` | The file format does not standardize installation paths, account sync, invocation UI, runtime permissions, or script environments |
| [Claude Code](https://code.claude.com/docs/en/skills) | Adds invocation controls such as `disable-model-invocation` / `user-invocable`, model selection, subagents, and dynamic context injection | Local personal `~/.claude/skills`, project/nested `.claude/skills`, enterprise and plugin scopes differ; account-synced skills are a separate source |
| [OpenAI ChatGPT/Codex](https://developers.openai.com/codex/skills/) | Optional `agents/openai.yaml` sidecar adds interface metadata, invocation policy (`allow_implicit_invocation`), and tool dependencies | Codex scans repo `.agents/skills` from CWD to repo root, personal `~/.agents/skills`, admin `/etc/codex/skills`, and bundled system skills; standalone versus plugin availability differs by product surface |
| [OpenAI API](https://developers.openai.com/api/docs/guides/tools-skills) | Uploads directory/ZIP as versioned bundles for Responses API hosted shell; Agents API discovers directories in sandboxes | Hosted shell accepts uploaded `skill_reference` attachments; local shell does not and must receive local skill files in the runtime you control |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/customizations/agent-skills) | Shared core with surface-specific discovery and invocation support | Project `.github/skills`, `.claude/skills`, `.agents/skills`; personal `~/.copilot/skills`, `~/.agents/skills`; verify the surface and version before assuming discovery |

These are host-specific capabilities observed in the cited documentation, not
portable frontmatter requirements. The base `allowed-tools` field is explicitly
experimental; a declaration is not a universal permission grant or sandbox policy.
`compatibility` describes prerequisites but does not install dependencies.

## Account, cloud, and local caveats

- Claude Code's local personal skills are not automatically available in Cowork
  or cloud sessions. Account-enabled skills sync separately; API-key and other
  authentication modes do not necessarily load account-synced skills. Project
  cloud threads also differ from ordinary repository/cloud sessions.
- OpenAI's guide distinguishes standalone skills (desktop, Codex CLI, IDE) from
  plugin-bundled distribution across additional ChatGPT surfaces. API bundles
  are a separate upload/versioning mechanism, not a local-directory sync.
- Copilot supports app, CLI, cloud agent, code review, and IDE agent surfaces,
  with version/location differences. Personal cloud-sandbox skills can be supplied
  through `.copilot/skills` in a dotfiles repository; that mechanism does not apply
  to GitHub Actions-based sessions. A local clone alone does not provision cloud skills.

## Keep portable examples minimal

```text
pdf-processing/
  SKILL.md
  references/
  agents/openai.yaml    # Optional OpenAI sidecar, not a core field
```

```yaml
---
name: pdf-processing
description: Extract text and merge existing PDFs when handling PDF documents.
metadata:
  version: "1.0"
---
```

The sidecar is optional and separate. Other hosts need not interpret it. Do not
copy Claude Code invocation/model controls into portable frontmatter and claim
every host honors them. A host may accept a skill that Sensei's strict portable
allowlist warns about.

Sensei currently checks the portable field set, not all host schemas.
[Open PR #5](https://github.com/spboyer/sensei/pull/5) owns Copilot extension-field
implementation; this guide does not duplicate that work or claim it has shipped.

## Before distributing

Choose the target surface, verify installation/discovery, inspect permissions and
dependency availability, then test realistic positive and near-miss requests.
Record activation only when the host exposes evidence. Static YAML compliance,
keyword fitness, and a proof artifact cannot certify invocation or output quality.
See [scoring](scoring.md) for what Sensei actually measures.
