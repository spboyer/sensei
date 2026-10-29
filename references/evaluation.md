# Optional behavioral evaluation

`sensei eval manifest.json --format=json` runs a trusted external host adapter.
No provider, paid API, Python, or GEPA dependency is added. Static `score` checks
frontmatter; GEPA's keyword fitness estimates matching, **not observed host
activation**. Neither proves behavioral quality.

## Manifest v1

```json
{
  "version": 1,
  "adapter": ["node", "host-adapter.mjs"],
  "skill": "skills/example/SKILL.md",
  "baseline": { "kind": "without-skill" },
  "repetitions": 3,
  "timeoutMs": 30000,
  "cases": [
    {
      "id": "trigger",
      "prompt": "Generate a deployment plan for this service",
      "shouldActivate": true,
      "assertions": [{ "id": "plan", "contains": "Deployment plan" }]
    },
    {
      "id": "near-miss",
      "prompt": "Explain what a deployment is without planning one",
      "shouldActivate": false,
      "assertions": [{ "id": "explanation", "contains": "deployment" }]
    }
  ]
}
```

Replace prompts and assertions with realistic tasks and discriminating expected
artifacts for your skill. Assertions are case-sensitive literal substring checks
on the adapter's actual output, not model judgments or adapter-provided pass
flags. They are deliberately limited: a matching phrase does not establish
semantic correctness. For file-based tasks, the adapter should collect the
relevant artifact contents into `output`.

Both positive and near-miss cases are required. Case IDs and per-case assertion
IDs must be unique; every case requires a prompt, boolean expectation, and at
least one nonempty assertion. `repetitions` is required (1–100).
`timeoutMs` defaults to 30000 (1–120000). Maximum: 200 total adapter calls and a
10-minute overall execution budget. Manifest size is limited to 1 MiB.

For comparison against a previous version, use
`"baseline": { "kind": "prior-version", "skill": "baseline/SKILL.md" }`.
Both skill paths must exist as files, identify distinct files for prior-version
mode (symlink and hard-link aliases are rejected), and remain
inside `--root` (default: current directory). Manifest paths resolve from
`--root`; skill paths resolve from the manifest directory. Adapter argv and its
working directory are relative to the manifest directory; executables also use
normal PATH lookup.

## Adapter contract

Each subprocess receives one JSON request on stdin:

```json
{
  "version": 1,
  "requestId": "unique-run-uuid",
  "caseId": "trigger",
  "prompt": "Generate a deployment plan for this service",
  "repetition": 1,
  "variant": "candidate",
  "skill": "/absolute/skills/example/SKILL.md"
}
```

`variant` is `candidate` or `baseline`; without-skill baselines receive
`skill: null`. The adapter must configure the host accordingly, run the prompt
in a fresh isolated session, and return **one JSON object only** on stdout:

```json
{
  "version": 1,
  "requestId": "unique-run-uuid",
  "caseId": "trigger",
  "repetition": 1,
  "variant": "candidate",
  "activation": {
    "invoked": true,
    "evidence": {
      "source": "host-trace://session/event-42",
      "excerpt": "Host recorded loading skills/example/SKILL.md"
    }
  },
  "output": "Deployment plan: ...",
  "tokens": 123
}
```

All correlation fields must match the request. `activation.invoked` must be
boolean or null. Both true and false require nonempty `source` and `excerpt`:
false means a complete trace was inspected and the target skill was absent,
not that the adapter guessed non-activation. If the host cannot expose reliable
activation, return `"activation": {"invoked": null, "reason": "Host does not expose a skill trace"}`.
Never infer activation from output wording, keywords, or a checklist.

`output` is required, including when empty. `tokens` is optional and must be an
observed nonnegative integer; omit it when unknown. Runner-measured
`durationMs` includes process startup and host work, not model-only latency.
Diagnostics belong on stderr; nonzero exit means command failure.

**Trust boundary:** Sensei checks structure and evaluates assertions; it cannot
authenticate trace text or verify that an adapter actually configured a host.
Observation honesty, complete traces (especially negative evidence), accurate
token counts, and session isolation are the adapter author's responsibility.
Use auditable host traces and review raw outputs. Fixed fixtures are protocol
tests, not live model results. No recorded-evidence or optimization mode is
provided.

Only run trusted adapters: this is arbitrary local code with inherited
environment/credentials, not a sandbox. Execution uses argv with `shell: false`,
per-call timeout, SIGKILL, and a 1 MiB stdout/stderr buffer limit. The direct
adapter process is bounded; adapters must manage their own descendant/remote
jobs and cancellation. Candidate/baseline order alternates per repetition to
reduce order bias, but does not substitute for isolation.

## Reports and exit codes

```bash
sensei eval manifest.json
sensei eval manifest.json --root=/path/to/project --format=json
```

Only `--root` and `--format=table|json` are supported. Reports retain each run's
request ID, variant, skill path, expectation, trace evidence, output, assertion
results, duration, and optional tokens. Summary rates are fractions (0–1):
activation rate and routing accuracy use **observed** runs as denominator;
assertion pass rate uses evaluated assertions. Unavailable/error counts are
separate; empty denominators are null, never zero or success.

Without-skill baseline routing expects no activation. Prior-version baseline
routing uses each case's expectation. Candidate-minus-baseline deltas are
descriptive: routing deltas compare these variant-specific expectations, and
neither positive deltas nor improvement are required for a pass. Equal quality
can pass; passing does **not** establish that the skill improves the host.
Choose realistic assertions and inspect baseline results.

| Exit | Meaning |
|---|---|
| 0 | All candidate routing/assertions pass; both variants have observations |
| 1 | Candidate routing or task assertion failed |
| 2 | Invalid input, missing files/evidence, unobservable activation, process failure, timeout, or malformed JSON |

Baseline quality/routing failures remain comparison data. Null activation in
either variant prevents a pass. Execution/protocol failures stop immediately
and preserve partial runs with an error; invalid manifests produce an error
object in JSON mode. Never treat a partial report as a complete comparison.

## Reproducible protocol smoke test

From a repository checkout with script dependencies installed:

```bash
npm run build
node scripts/dist/tokens/cli.js eval scripts/src/evals/fixtures/smoke.json --format=json
```

Expect exit 0, eight synthetic runs, candidate activation rate 0.5, baseline
activation rate 0, and assertion pass rates 1. The Node fixture explicitly
emits synthetic traces and fixed output; it validates subprocess plumbing only.
For live evaluation replace the adapter with your host integration, retain
trace sources, and independently inspect observed runs.
