/**
 * Sensei canvas iframe app.
 *
 * Subscribes to /events (SSE) and re-renders one of three views (idle,
 * running, report) per the broadcast state. Uses `marked` for the final
 * markdown report; the running view is plain DOM so it stays snappy
 * during high-frequency append events.
 */

import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12/lib/marked.esm.js';

const els = {
  status: document.getElementById('status'),
  views: {
    idle: document.getElementById('view-idle'),
    running: document.getElementById('view-running'),
    complete: document.getElementById('view-report'),
  },
  runningRunId: document.getElementById('running-run-id'),
  reportRunId: document.getElementById('report-run-id'),
  stepsList: document.getElementById('steps-list'),
  reportMd: document.getElementById('report-md'),
};

let lastReportRunId = null;
let lastStepCount = 0;

function setStatus(phase) {
  const label = phase === 'running' ? 'Running' : phase === 'complete' ? 'Complete' : 'Idle';
  els.status.textContent = label;
  els.status.className = `status status--${phase}`;
}

function show(view) {
  for (const [name, el] of Object.entries(els.views)) {
    el.hidden = name !== view;
  }
}

function escape(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderStep(step, idx) {
  const li = document.createElement('li');
  li.className = 'step';
  const time = step.t ? new Date(step.t).toLocaleTimeString() : '';
  const tag = step.step ?? step.phase ?? '·';
  const skill = step.skill ? ` [${step.skill}]` : '';
  const msg = step.message ?? step.lastAction ?? '';
  const score = step.score != null ? ` (score: ${step.score})` : '';
  li.innerHTML = `
    <span class="step-time">${escape(time)}</span>
    <span class="step-tag">${escape(tag)}</span>
    <span class="step-text">${escape(skill + (msg ? ' ' + msg : '') + score)}</span>
  `;
  li.dataset.idx = String(idx);
  return li;
}

/**
 * Loopback token plumbed from the page URL (the provider hands the
 * iframe a URL like `http://127.0.0.1:PORT/?t=...`). Every fetch and
 * the SSE EventSource forward this on the query string so the provider
 * can validate them.
 */
const TOKEN = new URLSearchParams(window.location.search).get('t') ?? '';
function withToken(path) {
  const sep = path.includes('?') ? '&' : '?';
  return TOKEN ? `${path}${sep}t=${encodeURIComponent(TOKEN)}` : path;
}

async function loadReport(runId) {
  if (runId === lastReportRunId) return;
  lastReportRunId = runId;
  try {
    const res = await fetch(withToken('/report'));
    if (!res.ok) return;
    const md = await res.text();
    els.reportMd.innerHTML = marked.parse(md);
  } catch (err) {
    els.reportMd.textContent = String(err);
  }
}

function apply(state) {
  setStatus(state.phase);

  if (state.phase === 'idle') {
    show('idle');
    lastStepCount = 0;
    lastReportRunId = null;
    return;
  }

  if (state.phase === 'running') {
    show('running');
    els.runningRunId.textContent = state.runId ?? '';
    if (state.steps.length < lastStepCount) {
      els.stepsList.innerHTML = '';
      lastStepCount = 0;
    }
    for (let i = lastStepCount; i < state.steps.length; i++) {
      els.stepsList.appendChild(renderStep(state.steps[i], i));
    }
    lastStepCount = state.steps.length;
    return;
  }

  show('complete');
  els.reportRunId.textContent = state.runId ?? '';
  if (state.runId) loadReport(state.runId);
}

const es = new EventSource(withToken('/events'));
es.onmessage = (e) => {
  try {
    apply(JSON.parse(e.data));
  } catch (err) {
    console.error('bad event payload', err);
  }
};
es.onerror = () => {
  els.status.textContent = 'Disconnected';
  els.status.className = 'status status--idle';
};
