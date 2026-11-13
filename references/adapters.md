# Behavioral adapter mappings

Sensei's evaluator remains provider- and framework-neutral. An adapter starts a
fresh host session, configures the candidate or baseline skill, and returns the
normalized protocol documented in [evaluation](evaluation.md).

## Copilot and Vally

Aspire Skills should continue using Vally as its native Copilot evaluation
runner. Replacing its suites, graders, fixtures, retries, or redaction pipeline
would lose domain evidence.

A Vally-to-Sensei adapter maps one completed Vally trial as follows:

| Vally evidence | Sensei observation |
|---|---|
| stimulus `name` and `prompt` | `caseId` and prompt |
| skill-invocation grader trace | `activation` evidence and `trajectory` events named `skill:<skill-name>` |
| output-contains | `contains` assertion |
| output-not-contains | `notContains` assertion |
| diff-empty | artifact assertion over a normalized workspace-diff artifact |
| file-contains or file-exists | adapter-returned artifact assertion |
| prompt grader | retained grader result artifact; do not convert it to deterministic truth |
| repeated `runs` | Sensei repetitions |
| p0/p1 versus p2 suites | train versus holdout only when the repository declares that intent |

The adapter must retain Vally's raw trial and trajectory artifact URI in
activation evidence. A grader pass alone is not activation evidence. Vally's
model-backed prompt graders remain model judgments and should report their
grader identity and limitations.

## Promptfoo

A Promptfoo adapter maps:

| Promptfoo evidence | Sensei observation |
|---|---|
| provider response | output |
| `skill-used` or host trace | activation evidence |
| `contains` / `not-contains` / `javascript` | corresponding deterministic or executable assertion |
| tool-call assertions | trajectory events |
| latency and token metadata | duration and tokens |
| repeated tests | repetitions |

Sensei does not require Promptfoo as a dependency. The adapter owns provider
configuration and must return unavailable activation when the provider exposes
no auditable skill trace.

## Trust boundary

Adapters and executable assertions are arbitrary local code with inherited
environment and credentials. Use only reviewed adapters, isolate host sessions,
bound descendants and remote jobs, and preserve raw evidence. Sensei validates
the protocol but cannot authenticate an adapter's claims.
