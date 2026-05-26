# Canvas

Sensei ships an optional Copilot CLI canvas at `.canvas/`. When trusted,
the Copilot CLI runtime opens it in the side panel during a sensei run so
the user sees live Ralph-loop progress and a browsable report afterward.

## What the user sees

| Phase | View |
|---|---|
| Idle | Empty state with instructions to start a run. |
| Running | Per-step list (timestamp, step tag, skill, message, score) that streams as the agent works. |
| Complete | Rendered markdown report (per-skill before/after scores, decisions, notes). |

The phase auto-switches based on what's on disk — the iframe never has to
poll, and reopening the canvas mid-run replays the in-progress state.

## How it works

```
chat agent ──▶ npx @spboyer/sensei step  ──┐
chat agent ──▶ npx @spboyer/sensei report ─┤
                                            ▼
                          $COPILOT_HOME/extensions/
                            skill__github.com_spboyer_sensei__sensei/
                            artifacts/runs/<ULID>/{steps.ndjson, report.md}
                                            ▲
                          .canvas/extension.mjs (fs.watch + HTTP/SSE)
                                            ▼
                                    iframe (index.html + app.js)
```

There is **no RPC contract** between the agent and the canvas. The agent
writes NDJSON via the CLI; the canvas provider tails the file and
broadcasts via Server-Sent Events. This means:

- The agent never branches on "is the canvas open and trusted?" — it just
  runs the CLI. If no canvas is watching, the writes are still durable on
  disk (useful for replay later) and chat output is unchanged.
- Any future writer (CI, a headless script, GEPA) can feed the canvas
  without learning a new API.

## The CLI surface

### `sensei step --run-id <ulid> --append <json|->`

Append one Ralph-step record to the active run's `steps.ndjson` and
update `runs/latest.txt`. On the first call for a run, the run directory
and `manifest.json` are seeded.

Use `-` to read JSON from stdin (useful for large records):

```bash
echo '{"step":"SCORE","skill":"pdf","score":"Medium-High","message":"trigger phrases added"}' \
  | npx @spboyer/sensei step --run-id "$RUN_ID" --append -
```

The `t` field is auto-stamped with the current ISO timestamp if absent.
The payload must be a JSON object; arrays and primitives are rejected.

### `sensei report --finalize --run-id <ulid> --input <path|->`

Render the final markdown report and mark the run complete. The input is
a JSON `RunSummary` (see `scripts/src/tokens/commands/report.ts` for the
type). On finalize, `manifest.json` is updated with `finishedAt` and the
input summary, `report.md` is written, and `runs/latest.txt` points at
this run.

## Artifact layout

```
$COPILOT_HOME/extensions/<encoded-id>/artifacts/
└── runs/
    ├── 01ABCDEF.../
    │   ├── manifest.json   # { runId, startedAt, finishedAt, schemaVersion, summary }
    │   ├── steps.ndjson    # append-only, one JSON object per line
    │   └── report.md       # written at finalize
    └── latest.txt          # text file containing the most recent ULID
```

`<encoded-id>` is the canonical extension id (`skill:github.com/spboyer/sensei:sensei`)
with `:` replaced by `__`, `/` by `_`, and lowercased. The encoding
keeps the path valid on Windows NTFS (`:` is illegal), macOS APFS, and
Linux ext4, and is reversible. The CLI helper lives in
`scripts/src/tokens/commands/artifacts.ts` and is pinned by a unit test;
an identical copy lives in `.canvas/extension.mjs`.

`latest.txt` is a plain file, not a symlink, because Windows symlinks
require elevated privileges by default.

## Overriding the artifact path

The provider and the CLI both honor `COPILOT_EXTENSION_ARTIFACTS_DIR`. The
Copilot CLI runtime sets this when it spawns the provider so the writer
and reader always agree on the path. The CLI also accepts
`--artifacts-dir <path>` for tests and local development.

## SDK integration (pending)

`.canvas/extension.mjs` runs as a standalone HTTP + SSE + watcher process
today so the iframe and watcher can be iterated on independently of the
`@github/copilot-sdk/extension` package. When the SDK ships, three things
change at the bottom of the file:

1. Wrap the registration in `joinSession({ canvases: [createCanvas(...)] })`.
2. Return `{ url, title }` (with a per-instance loopback token) from the
   canvas's `open()` handler instead of logging the URL.
3. Validate the loopback token on every request via
   `validateLoopbackToken(req, instanceId)`.

The watcher, SSE, and file format do not change.
