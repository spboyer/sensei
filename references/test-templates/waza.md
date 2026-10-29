# Trigger prompt cases for Waza integrations

This is a prompt-case scaffold, not a claim that every Waza release consumes this
schema directly. Use your installed runner's documentation and adapter format.
Sensei does not bundle Waza or an automatic scaffold script.

```yaml
name: pdf-processor-triggers
skill: pdf-processor
shouldTriggerPrompts:
  - "Extract text from the attached PDF"
  - "Rotate page two of this PDF"
  - "Combine these two existing PDFs"
shouldNotTriggerPrompts:
  - "Create a new PDF invoice from this spreadsheet"
  - "OCR this scanned image"
  - "List the files in this folder"
```

Derive positive cases from actual intended use and natural paraphrases, not just
literal `WHEN:` / `USE FOR:` matching. Derive negatives from close scope
boundaries and competing workflows; `DO NOT USE FOR:` is not required in the
description. The PDF exclusions above apply only if those operations are outside
the skill's actual scope.

Start with at least five positives and five negatives, including close near-misses.
Repeat runs, compare no-skill or prior-version baselines, and record concrete
activation and output evidence. Missing activation observations are unavailable,
not passing. Keyword matching alone measures proxy fitness, not host invocation.

Keep the prompt set portable and adapt only the execution layer to the host.
See [portability](../portability.md) for runtime limitations.
