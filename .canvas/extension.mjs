/**
 * Sensei canvas provider.
 *
 * Watches the sensei artifact directory for run progress (steps.ndjson)
 * and final reports (report.md), and serves an iframe view over a local
 * loopback HTTP server. The Copilot CLI runtime spawns this process when
 * a session asks to open the `sensei` canvas.
 *
 * Architecture:
 *   - HTTP server on 127.0.0.1:0 (OS-assigned port). Serves static assets
 *     plus three JSON/SSE endpoints (/state, /events, /report).
 *   - File watcher on the artifacts dir:
 *       runs/latest.txt        → tells us which run to tail
 *       runs/<id>/steps.ndjson → per-step append-only stream
 *       runs/<id>/report.md    → final report (when present)
 *   - SSE broadcasts the in-memory `state` object to all connected
 *     iframes on every change.
 *
 * Pending SDK integration:
 *   When @github/copilot-sdk/extension ships, the bottom of this file
 *   should call:
 *     await joinSession({ canvases: [createCanvas({ id: "sensei", ... })] });
 *   and the canvas's open() handler will return the base URL +
 *   per-instance loopback token. Until then, this file runs standalone
 *   so we can iterate on the iframe and watcher logic. See the README
 *   for the integration TODO.
 *
 * Cross-package note:
 *   `encodeExtensionId` here MUST match the CLI's helper in
 *   `scripts/src/tokens/commands/artifacts.ts`. The mapping is pinned by
 *   a unit test there.
 */

import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { watch, createReadStream, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Path resolution (mirror of scripts/src/tokens/commands/artifacts.ts)
// ---------------------------------------------------------------------------

const SENSEI_EXTENSION_ID = 'skill:github.com/spboyer/sensei:sensei';

function encodeExtensionId(id) {
  return encodeURIComponent(id);
}

function resolveCopilotHome() {
  return process.env.COPILOT_HOME ?? join(homedir(), '.copilot');
}

function resolveArtifactsDir() {
  if (process.env.COPILOT_EXTENSION_ARTIFACTS_DIR) {
    return process.env.COPILOT_EXTENSION_ARTIFACTS_DIR;
  }
  return join(
    resolveCopilotHome(),
    'extensions',
    encodeExtensionId(SENSEI_EXTENSION_ID),
    'artifacts'
  );
}

const ARTIFACTS_DIR = resolveArtifactsDir();
const RUNS_DIR = join(ARTIFACTS_DIR, 'runs');
const LATEST_PATH = join(RUNS_DIR, 'latest.txt');

// ---------------------------------------------------------------------------
// In-memory state + SSE subscribers
// ---------------------------------------------------------------------------

/**
 * Shape we broadcast to the iframe.
 *
 *   phase:
 *     "idle"     — no runs/latest.txt or it points at nothing renderable
 *     "running"  — the active run has steps.ndjson but no report.md yet
 *     "complete" — the active run has report.md
 */
const state = {
  phase: 'idle',
  runId: null,
  steps: [],
  hasReport: false,
  artifactsDir: ARTIFACTS_DIR,
};

/** Per-file offset bookkeeping so we don't re-broadcast already-seen lines. */
const tailOffsets = new Map();

/** Connected SSE clients. */
const subscribers = new Set();

function broadcast() {
  if (subscribers.size === 0) return;
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      /* client dropped; cleanup happens on req 'close' */
    }
  }
}

// ---------------------------------------------------------------------------
// File ingestion
// ---------------------------------------------------------------------------

/**
 * Read newly appended bytes from an NDJSON file and push parsed objects
 * into state.steps. Tolerates partial-line writes by leaving the trailing
 * non-newline-terminated fragment in the offset (we re-read it next time).
 */
async function tailStepsFile(path) {
  if (!existsSync(path)) return;
  const { size } = await stat(path);
  const prev = tailOffsets.get(path) ?? 0;
  if (size <= prev) return;
  const buf = await new Promise((resolve, reject) => {
    const chunks = [];
    createReadStream(path, { start: prev, end: size - 1 })
      .on('data', (c) => chunks.push(c))
      .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      .on('error', reject);
  });
  const lastNl = buf.lastIndexOf('\n');
  if (lastNl < 0) return; // no complete line yet
  const consumed = buf.slice(0, lastNl);
  tailOffsets.set(path, prev + Buffer.byteLength(consumed, 'utf8') + 1);
  for (const line of consumed.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      state.steps.push(JSON.parse(trimmed));
    } catch {
      /* defensive: skip malformed lines from a truncated write */
    }
  }
}

async function readLatestRunId() {
  if (!existsSync(LATEST_PATH)) return null;
  try {
    return (await readFile(LATEST_PATH, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Re-sync state to whatever runs/latest.txt currently points at.
 * Idempotent; safe to spam.
 */
async function syncStateFromDisk() {
  const runId = await readLatestRunId();
  if (!runId) {
    state.phase = 'idle';
    state.runId = null;
    state.steps = [];
    state.hasReport = false;
    return;
  }
  if (runId !== state.runId) {
    state.runId = runId;
    state.steps = [];
    tailOffsets.clear();
  }
  const runDir = join(RUNS_DIR, runId);
  const stepsPath = join(runDir, 'steps.ndjson');
  const reportPath = join(runDir, 'report.md');
  await tailStepsFile(stepsPath);
  state.hasReport = existsSync(reportPath);
  state.phase = state.hasReport ? 'complete' : state.steps.length > 0 ? 'running' : 'idle';
}

/**
 * Debounce: fs.watch fires multiple events per write on most platforms;
 * coalesce them so we don't broadcast 5x for one append.
 */
let syncPending = null;
function scheduleSync() {
  if (syncPending) return;
  syncPending = setTimeout(async () => {
    syncPending = null;
    try {
      await syncStateFromDisk();
      broadcast();
    } catch (err) {
      console.error('[sensei-canvas] sync error:', err);
    }
  }, 50);
}

/**
 * Recursive watcher across the artifacts dir. Node 18+ `fs.watch` supports
 * `{ recursive: true }` on macOS and Windows; Linux does not — we fall
 * back to per-directory watchers and add child watchers as run dirs
 * appear.
 */
function startWatching() {
  if (!existsSync(RUNS_DIR)) {
    setTimeout(startWatching, 1000);
    return;
  }
  const isLinux = process.platform === 'linux';
  if (!isLinux) {
    watch(RUNS_DIR, { recursive: true }, scheduleSync);
    return;
  }
  const childWatchers = new Map();
  watch(RUNS_DIR, async () => {
    scheduleSync();
    try {
      const entries = await readdir(RUNS_DIR, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !childWatchers.has(e.name)) {
          const w = watch(join(RUNS_DIR, e.name), scheduleSync);
          childWatchers.set(e.name, w);
        }
      }
    } catch {
      /* directory disappeared mid-read; ignore */
    }
  });
}

// ---------------------------------------------------------------------------
// HTTP / SSE server
// ---------------------------------------------------------------------------

const ASSETS = {
  '/': { path: join(__dirname, 'index.html'), type: 'text/html; charset=utf-8' },
  '/index.html': { path: join(__dirname, 'index.html'), type: 'text/html; charset=utf-8' },
  '/app.js': { path: join(__dirname, 'app.js'), type: 'application/javascript' },
  '/styles.css': { path: join(__dirname, 'styles.css'), type: 'text/css' },
};

async function serveAsset(req, res, asset) {
  try {
    const body = await readFile(asset.path);
    res.writeHead(200, { 'Content-Type': asset.type });
    res.end(body);
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  // TODO(sdk): once @github/copilot-sdk/extension ships, gate every
  // request on validateLoopbackToken(req, instanceId). Today there's no
  // token because there's no runtime issuing one.
  const asset = ASSETS[url.pathname];
  if (req.method === 'GET' && asset) return serveAsset(req, res, asset);

  if (req.method === 'GET' && url.pathname === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    subscribers.add(res);
    req.on('close', () => subscribers.delete(res));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/report') {
    if (!state.runId || !state.hasReport) {
      res.writeHead(404);
      res.end('no report yet');
      return;
    }
    try {
      const md = await readFile(join(RUNS_DIR, state.runId, 'report.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      res.end(md);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main() {
  await syncStateFromDisk();
  startWatching();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  // The runtime would normally receive this URL via the SDK's open() return
  // value. For standalone runs we log it so a developer can open it directly.
  console.log(`[sensei-canvas] listening on http://127.0.0.1:${port}/`);
  console.log(`[sensei-canvas] artifacts: ${ARTIFACTS_DIR}`);
}

main().catch((err) => {
  console.error('[sensei-canvas] fatal:', err);
  process.exit(1);
});
