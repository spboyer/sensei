# SkillsBench: Evidence Base

> Li et al., "SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks," [arXiv:2602.12670](https://arxiv.org/abs/2602.12670), Feb 2026. 86 tasks, 11 domains, 7 agent-model configs, 7,308 trajectories.

## Key Findings

| # | Finding | Delta |
|---|---------|-------|
| F1 | Curated Skills raise pass rate | **+16.2pp** avg (range: +13.6pp to +23.3pp) |
| F2 | Best config: Gemini CLI + Gemini 3 Flash | **48.7%** with Skills |
| F3 | Self-generated Skills provide NO benefit | **-1.3pp** avg |
| F4 | Domain variance: Healthcare +51.9pp, Manufacturing +41.9pp, SWE +4.5pp, Math +6.0pp | Varies |
| F5 | 2–3 Skills modules optimal | **+18.6pp** vs +5.9pp for 4+ |
| F6 | Detailed (+18.8pp) and compact (+17.1pp) outperform comprehensive (-2.9pp) | See below |
| F7 | Smaller model + Skills > larger model without | Haiku 4.5 w/ Skills 27.7% > Opus 4.5 w/o 22.0% |

## Design Principles for Skill Authors

These are dataset-level observations, not per-skill guarantees. Sensei's
pattern-based advisories do not reproduce the benchmark or measure host routing.
See [scoring](scoring.md) and [behavioral evaluation](evaluation.md).

1. **Keep it focused.** Review whether every reference adds value. F5 is not a universal maximum of three reference files.
2. **Token budget matters.** F6 motivates concise instructions, not deleting necessary detail to hit a score.
3. **Procedural, not declarative.** Write HOW-TO guidance — steps, decision trees, error handling. Not descriptions of what a tool is.
4. **Avoid over-specification.** Guide a *class* of tasks, not solve specific instances. Solution leakage degrades generalization.

## Self-Generation Warning

Self-generated skills had a -1.3pp average in this study (F3). That result does
not establish what every model or task will do.

**Failure modes:**
- Imprecise procedures — models generate vague instructions that omit critical edge cases
- Failure to recognize specialized knowledge gaps — models don't know what they don't know
- Tendency toward comprehensive documentation — exactly the format that hurts (F6)

**Implication:** Review generated suggestions and evaluate outcomes. Sensei can
propose edits (optionally with GEPA proxy optimization), but static scores do not
establish that those edits help a host.

## Domain Context

**When Skills help most:** Specialized procedural knowledge underrepresented in pretraining.
- Healthcare: +51.9pp — clinical protocols, regulatory procedures
- Manufacturing: +41.9pp — domain-specific workflows, safety procedures

**When Skills help least:** Domains with strong pretraining coverage.
- SWE: +4.5pp — coding patterns saturate training data
- Math: +6.0pp — reasoning well-represented in pretraining

**Implication for Sensei:** Preserve task-relevant procedural value and compare
against a baseline. Domain averages do not establish that an individual skill
helps, hurts, or changes routing.

## Anti-Patterns from Paper

| Anti-Pattern | Impact | Why It Hurts |
|---|---|---|
| Comprehensive over-documentation | **-2.9pp** harmful | Floods context window, buries actionable guidance |
| Conflicting guidance | Negative delta on 16/84 tasks | Multiple contradictory procedures cause agent hesitation |
| Solution leakage | Degrades generalization | Encoding specific answers prevents transfer to novel tasks |
| 4+ skill modules | Only +5.9pp vs +18.6pp for 2–3 | Context fragmentation; agent can't synthesize scattered guidance |

**16 of 84 tasks showed negative deltas** — Skills can HURT when poorly authored. This is Sensei's reason for existence.
