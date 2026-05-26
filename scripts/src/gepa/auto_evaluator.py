#!/usr/bin/env python3
"""
GEPA auto-evaluator for sensei.

Discovers a skill's existing test harness at runtime and builds a GEPA-compatible
evaluator. Zero manual configuration — reads triggers.test.ts to extract trigger
prompts and construct the fitness function.

Usage:
    # Score a skill (no optimization, no LLM calls)
    python auto_evaluator.py score --skill azure-deploy --skills-dir skills --tests-dir tests

    # Optimize a skill (requires LLM API)
    python auto_evaluator.py optimize --skill azure-deploy --skills-dir skills --tests-dir tests

    # Score all skills
    python auto_evaluator.py score-all --skills-dir skills --tests-dir tests

    # JSON output
    python auto_evaluator.py score --skill azure-deploy --json
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


# ── Keyword matching (mirrors trigger-matcher.ts) ──────────────────────────

AZURE_KEYWORDS = [
    "azure", "storage", "cosmos", "sql", "redis", "keyvault", "key vault",
    "function", "app service", "container", "aks", "kubernetes", "bicep",
    "terraform", "deploy", "monitor", "diagnostic", "security", "rbac",
    "identity", "entra", "authentication", "cli", "mcp", "validation",
    "networking", "observability", "foundry", "agent", "model",
]

STOP_WORDS = {
    "the", "and", "for", "with", "this", "that", "from", "have", "has",
    "are", "was", "were", "been", "being", "will", "would", "could",
    "should", "may", "might", "can", "shall", "not", "use", "when",
    "what", "how", "why", "who", "which", "where", "does", "don",
    "your", "its", "our", "their", "these", "those", "some", "any",
    "all", "each", "every", "both", "such", "than", "also", "only",
}


def stem(word: str) -> str:
    """Minimal stemmer for keyword matching."""
    for suffix in ("ation", "ting", "ing", "ies", "ied", "es", "ed", "ly", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def extract_keywords(skill_name: str, description: str) -> list[str]:
    """Extract keywords from skill name + description."""
    keywords = set()
    for part in skill_name.split("-"):
        if len(part) > 2:
            keywords.add(part.lower())
    desc_lower = description.lower()
    for word in re.split(r"\s+", desc_lower):
        clean = re.sub(r"[^a-z0-9-]", "", word)
        if clean == "ai" or len(clean) > 3:
            if clean not in STOP_WORDS:
                keywords.add(clean)
    for kw in AZURE_KEYWORDS:
        if kw in desc_lower:
            keywords.add(kw)
    return sorted(keywords)


def check_trigger(prompt: str, keywords: list[str]) -> tuple[bool, list[str], float]:
    """Check if a prompt triggers based on keyword matching with stemming."""
    prompt_lower = prompt.lower()
    matched = []
    for kw in keywords:
        kw_stem = stem(kw)
        if kw in prompt_lower or kw_stem in prompt_lower:
            matched.append(kw)
            continue
        for word in re.split(r"\s+", prompt_lower):
            clean = re.sub(r"[^a-z0-9-]", "", word)
            if clean and stem(clean) == kw_stem:
                matched.append(kw)
                break
    confidence = len(matched) / max(len(keywords), 1)
    triggered = len(matched) >= 2 or confidence >= 0.2
    return triggered, matched, confidence


# ── Test harness discovery ─────────────────────────────────────────────────

def parse_trigger_arrays(test_file: Path) -> dict:
    """Parse shouldTrigger/shouldNotTrigger arrays from a triggers.test.ts file.

    Uses regex to extract string arrays without needing a TS parser.
    """
    content = test_file.read_text()
    result = {"should_trigger": [], "should_not_trigger": []}

    # Match arrays like: shouldTrigger = ["...", "..."] or const shouldTriggerPrompts = [...]
    for var_pattern, key in [
        (r"shouldTrigger(?:Prompts)?(?:\s*:\s*\w+(?:\[\])?)?\s*=\s*\[", "should_trigger"),
        (r"shouldNotTrigger(?:Prompts)?(?:\s*:\s*\w+(?:\[\])?)?\s*=\s*\[", "should_not_trigger"),
    ]:
        match = re.search(var_pattern, content, re.IGNORECASE)
        if match:
            start = match.end()
            # Find the closing bracket, handling nested strings
            depth = 1
            i = start
            while i < len(content) and depth > 0:
                if content[i] == "[":
                    depth += 1
                elif content[i] == "]":
                    depth -= 1
                i += 1
            array_text = content[start : i - 1]
            # Strip single-line comments to avoid extracting commented-out prompts
            array_text = re.sub(r"//.*$", "", array_text, flags=re.MULTILINE)
            # Strip block comments
            array_text = re.sub(r"/\*.*?\*/", "", array_text, flags=re.DOTALL)
            # Extract strings from the array — handle ", ', and ` delimiters
            # Use separate passes for each quote type to avoid apostrophe truncation
            strings = re.findall(r'"([^"]*)"', array_text)
            strings += re.findall(r"'([^']*)'", array_text)
            strings += re.findall(r"`([^`]*)`", array_text)
            # Deduplicate while preserving order
            seen = set()
            unique = []
            for s in strings:
                if s and s not in seen:
                    seen.add(s)
                    unique.append(s)
            result[key] = unique

    return result


def discover_test_harness(tests_dir: Path, skill_name: str) -> dict:
    """Discover available test files for a skill.

    Returns dict with:
      - has_triggers: bool
      - has_integration: bool
      - has_unit: bool
      - trigger_prompts: {should_trigger: [...], should_not_trigger: [...]}
    """
    skill_test_dir = tests_dir / skill_name
    result = {
        "has_triggers": False,
        "has_integration": False,
        "has_unit": False,
        "trigger_prompts": {"should_trigger": [], "should_not_trigger": []},
    }

    if not skill_test_dir.exists():
        return result

    # Check for test files (search recursively for nested dirs like microsoft-foundry/foundry-agent/)
    for trigger_file in skill_test_dir.rglob("triggers.test.ts"):
        result["has_triggers"] = True
        prompts = parse_trigger_arrays(trigger_file)
        result["trigger_prompts"]["should_trigger"].extend(prompts["should_trigger"])
        result["trigger_prompts"]["should_not_trigger"].extend(prompts["should_not_trigger"])

    for _ in skill_test_dir.rglob("integration.test.ts"):
        result["has_integration"] = True
        break

    for _ in skill_test_dir.rglob("unit.test.ts"):
        result["has_unit"] = True
        break

    return result


# ── Content quality scorer ─────────────────────────────────────────────────

def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter and return (metadata_dict, body).

    Returns empty dict and full content if no valid frontmatter found.
    """
    if not content.startswith("---"):
        return {}, content

    end_idx = content.find("---", 3)
    if end_idx == -1:
        return {}, content

    fm_text = content[3:end_idx].strip()
    body = content[end_idx + 3:].strip()

    metadata = {}
    for line in fm_text.split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            metadata[key.strip()] = value.strip().strip('"').strip("'")

    return metadata, body


def score_content_quality(skill_md_content: str, frontmatter: dict | None = None) -> tuple[float, dict]:
    """Score SKILL.md content quality. Pure Python, no LLM calls.

    Returns (score, detail_scores).
    """
    scores = {}
    feedback = []
    content_lower = skill_md_content.lower()

    # Score the frontmatter description if available
    if frontmatter and frontmatter.get("description"):
        desc_text = frontmatter["description"]
    else:
        # Fallback: first non-heading paragraph from body
        lines = skill_md_content.strip().split("\n")
        desc_text = " ".join(l for l in lines[:5] if l.strip() and not l.startswith("#"))
    if 150 <= len(desc_text) <= 1024:
        scores["description_length"] = 1.0
    elif len(desc_text) < 150:
        scores["description_length"] = len(desc_text) / 150
        feedback.append(f"Description too short ({len(desc_text)} chars, need 150+)")
    else:
        scores["description_length"] = min(1.0, 1024 / len(desc_text))
        feedback.append(f"Description too long ({len(desc_text)} chars, max 1024)")

    # Required body sections (execution-focused, not routing)
    for section in ["rule", "step"]:
        if f"## {section}" in content_lower or f"# {section}" in content_lower:
            scores[f"has_{section}s"] = 1.0
        else:
            scores[f"has_{section}s"] = 0.0
            feedback.append(f"Missing '## {section.title()}s' section")

    # Routing patterns — check frontmatter description (where routing belongs)
    desc_lower = (frontmatter or {}).get("description", "").lower() if frontmatter else ""
    combined = desc_lower + " " + content_lower
    for pattern, label in [
        ("use for:", "has_use_for"),
        ("when:", "has_when"),
    ]:
        if pattern in combined:
            scores[label] = 1.0
        else:
            scores[label] = 0.0
            feedback.append(f"Missing '{pattern.upper()}' pattern (best in frontmatter description)")

    # DO NOT USE FOR: is contextual — not penalized or required.
    # In multi-skill environments (10+ skills), anti-triggers cause keyword
    # contamination on fast-pattern-matching models. Safe for small skill sets.
    if "do not use for:" in content_lower:
        feedback.append("Has 'DO NOT USE FOR:' — safe for small skill sets, risky for 10+ skills")

    # Bad patterns
    bad = [
        (r"api[_-]?key\s*[:=]", "Contains API key pattern"),
        (r"password\s*[:=]", "Contains password pattern"),
        (r"TODO|FIXME|HACK", "Contains TODO/FIXME markers"),
    ]
    for pat, msg in bad:
        if re.search(pat, skill_md_content, re.IGNORECASE):
            scores["no_bad_patterns"] = 0.0
            feedback.append(msg)
            break
    else:
        scores["no_bad_patterns"] = 1.0

    score = sum(scores.values()) / len(scores) if scores else 0.0
    return score, {"scores": scores, "feedback": feedback}


# ── Composite evaluator builder ────────────────────────────────────────────

def build_evaluator(skill_name: str, tests_dir: Path):
    """Auto-build a GEPA evaluator for a skill from its test harness.

    Returns a callable(candidate, example) -> (score, asi_dict).
    """
    harness = discover_test_harness(tests_dir, skill_name)

    def evaluator(candidate: str, example: dict) -> tuple[float, dict]:
        import gepa.optimize_anything as oa

        scores = {}
        asi = {}

        # 1. Content quality (always, fast)
        frontmatter, body = parse_frontmatter(candidate)
        quality_score, quality_detail = score_content_quality(body, frontmatter)
        scores["quality"] = quality_score
        if quality_detail["feedback"]:
            asi["QualityIssues"] = "\n".join(quality_detail["feedback"])

        # 2. Trigger accuracy (if tests discovered)
        if harness["has_triggers"] and harness["trigger_prompts"]["should_trigger"]:
            # Extract description from candidate for keyword matching
            desc_lines = []
            for line in candidate.split("\n"):
                if line.strip() and not line.startswith("#"):
                    desc_lines.append(line)
                if len(desc_lines) >= 5:
                    break
            desc_text = " ".join(desc_lines)
            keywords = extract_keywords(skill_name, desc_text + " " + candidate[:500])

            correct = 0
            total = 0
            trigger_failures = []

            for prompt in harness["trigger_prompts"]["should_trigger"]:
                triggered, matched, conf = check_trigger(prompt, keywords)
                total += 1
                if triggered:
                    correct += 1
                else:
                    trigger_failures.append(
                        f"FN: '{prompt[:60]}...' (matched: {matched}, conf: {conf:.1%})"
                    )

            for prompt in harness["trigger_prompts"]["should_not_trigger"]:
                triggered, matched, conf = check_trigger(prompt, keywords)
                total += 1
                if not triggered:
                    correct += 1
                else:
                    trigger_failures.append(
                        f"FP: '{prompt[:60]}...' (matched: {matched}, conf: {conf:.1%})"
                    )

            scores["triggers"] = correct / total if total else 1.0
            if trigger_failures:
                asi["TriggerFailures"] = "\n".join(trigger_failures[:5])

        # Aggregate
        final_score = sum(scores.values()) / len(scores) if scores else 0.0

        oa.log(
            f"[{skill_name}] quality={scores.get('quality', 0):.2f} "
            f"triggers={scores.get('triggers', 'N/A')}"
        )

        return final_score, asi

    return evaluator, harness


# ── Score command ──────────────────────────────────────────────────────────

def score_skill(
    skill_name: str,
    skills_dir: Path,
    tests_dir: Path,
) -> dict:
    """Score a single skill's SKILL.md content quality + trigger accuracy."""
    skill_md = skills_dir / skill_name / "SKILL.md"
    if not skill_md.exists():
        return {"skill": skill_name, "error": f"SKILL.md not found at {skill_md}"}

    content = skill_md.read_text()
    # Parse frontmatter safely
    frontmatter, body = parse_frontmatter(content)

    # Build evaluator and score
    harness = discover_test_harness(tests_dir, skill_name)
    quality_score, quality_detail = score_content_quality(body, frontmatter)

    should_count = len(harness["trigger_prompts"]["should_trigger"])
    should_not_count = len(harness["trigger_prompts"]["should_not_trigger"])

    result = {
        "skill": skill_name,
        "quality_score": round(quality_score, 2),
        "quality_detail": quality_detail["scores"],
        "quality_feedback": quality_detail["feedback"],
        "has_triggers_test": harness["has_triggers"],
        "has_integration_test": harness["has_integration"],
        "has_unit_test": harness["has_unit"],
        "trigger_prompt_count": should_count + should_not_count,
    }

    # Trigger accuracy if test data available
    if harness["has_triggers"] and harness["trigger_prompts"]["should_trigger"]:
        # Use full content for keyword extraction
        keywords = extract_keywords(skill_name, body[:1000])
        correct = total = 0
        for p in harness["trigger_prompts"]["should_trigger"]:
            t, _, _ = check_trigger(p, keywords)
            total += 1
            correct += int(t)
        for p in harness["trigger_prompts"]["should_not_trigger"]:
            t, _, _ = check_trigger(p, keywords)
            total += 1
            correct += int(not t)
        result["trigger_accuracy"] = round(correct / total, 2) if total else None
    else:
        result["trigger_accuracy"] = None

    return result


# ── Optimize command ───────────────────────────────────────────────────────

def optimize_skill(
    skill_name: str,
    skills_dir: Path,
    tests_dir: Path,
    max_iterations: int = 80,
    model: str = "openai/gpt-4o",
) -> dict:
    """Run GEPA optimize_anything on a skill's SKILL.md body content."""
    import gepa.optimize_anything as oa

    skill_md = skills_dir / skill_name / "SKILL.md"
    if not skill_md.exists():
        return {"skill": skill_name, "error": f"SKILL.md not found at {skill_md}"}

    content = skill_md.read_text()
    frontmatter, body = parse_frontmatter(content)

    # Auto-build evaluator from test harness
    evaluator, harness = build_evaluator(skill_name, tests_dir)

    # Build dataset from discovered trigger prompts
    dataset = []
    if harness["has_triggers"]:
        for prompt in harness["trigger_prompts"]["should_trigger"]:
            dataset.append({"skill_name": skill_name, "prompt": prompt, "expected": True})
        for prompt in harness["trigger_prompts"]["should_not_trigger"]:
            dataset.append({"skill_name": skill_name, "prompt": prompt, "expected": False})

    if not dataset:
        dataset = [{"skill_name": skill_name, "aspect": "overall"}]

    # Configure LLM via GitHub Models
    try:
        token = subprocess.check_output(["gh", "auth", "token"]).decode().strip()
        # Validate token looks reasonable (not an error message)
        if token and len(token) >= 10 and not token.startswith("ERROR"):
            os.environ.setdefault("OPENAI_API_KEY", token)
            os.environ.setdefault("OPENAI_API_BASE", "https://models.github.ai/inference")
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass  # Let litellm find credentials from env

    proposer_lm = oa.make_litellm_lm(model)

    # Seed with full content so GEPA can optimize frontmatter + body
    seed = content

    result = oa.optimize_anything(
        seed_candidate=seed,
        evaluator=evaluator,
        dataset=dataset,
        objective=(
            f"Optimize the SKILL.md for the '{skill_name}' skill. "
            f"The frontmatter description is used for routing — include WHEN: triggers "
            f"and keep under 1024 chars. "
            f"The body is loaded after routing — focus on execution instructions: "
            f"## Rules (when to use/not use), ## Steps (how to execute), "
            f"## MCP Tools (tool dependencies). "
            f"Do NOT duplicate routing signals in the body."
        ),
        background=(
            f"This is a SKILL.md for GitHub Copilot. The LLM reads the frontmatter "
            f"description to decide which skill to invoke. It competes with ~24 other "
            f"skills for selection. The body is only read after loading, so it should "
            f"contain execution guidance, not routing signals."
        ),
        config=oa.GEPAConfig(
            engine=oa.EngineConfig(max_metric_calls=max_iterations),
            reflection=oa.ReflectionConfig(reflection_lm=proposer_lm),
        ),
    )

    return {
        "skill": skill_name,
        "original": body,
        "optimized": result.best_candidate,
        "best_score": getattr(result, "best_score", None),
    }


# ── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="GEPA auto-evaluator for sensei skill optimization"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # score command
    score_p = subparsers.add_parser("score", help="Score a skill's quality")
    score_p.add_argument("--skill", required=True)
    score_p.add_argument("--skills-dir", default="skills")
    score_p.add_argument("--tests-dir", default="tests")
    score_p.add_argument("--json", action="store_true")

    # score-all command
    all_p = subparsers.add_parser("score-all", help="Score all skills")
    all_p.add_argument("--skills-dir", default="skills")
    all_p.add_argument("--tests-dir", default="tests")
    all_p.add_argument("--json", action="store_true")
    all_p.add_argument("--sort", choices=["score", "name"], default="score")

    # optimize command
    opt_p = subparsers.add_parser("optimize", help="Optimize a skill with GEPA")
    opt_p.add_argument("--skill", required=True)
    opt_p.add_argument("--skills-dir", default="skills")
    opt_p.add_argument("--tests-dir", default="tests")
    opt_p.add_argument("--iterations", type=int, default=80)
    opt_p.add_argument("--model", default="openai/gpt-4o")
    opt_p.add_argument("--json", action="store_true")

    args = parser.parse_args()
    skills_dir = Path(args.skills_dir)
    tests_dir = Path(args.tests_dir)
    has_errors = False

    # Validate skills directory exists
    if not skills_dir.exists():
        print(f"Error: skills directory '{skills_dir}' not found", file=sys.stderr)
        sys.exit(1)

    if args.command == "score":
        result = score_skill(args.skill, skills_dir, tests_dir)
        if "error" in result:
            has_errors = True
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            _print_score(result)

    elif args.command == "score-all":
        skills = sorted(
            d.name for d in skills_dir.iterdir() if d.is_dir() and not d.name.startswith(".")
        )
        results = [score_skill(s, skills_dir, tests_dir) for s in skills]
        if args.sort == "score":
            results.sort(key=lambda r: r.get("quality_score", 0))
        if any("error" in r for r in results):
            has_errors = True
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            _print_score_table(results)

    elif args.command == "optimize":
        result = optimize_skill(
            args.skill, skills_dir, tests_dir, args.iterations, args.model
        )
        if "error" in result:
            has_errors = True
        if args.json:
            print(json.dumps(result, indent=2, default=str))
        else:
            if "error" in result:
                print(f"Error: {result['error']}")
            else:
                print(f"✓ Optimized {args.skill}")
                print(f"  Score: {result.get('best_score', 'N/A')}")
                print(f"  Original length: {len(result['original'])} chars")
                print(f"  Optimized length: {len(result['optimized'])} chars")
                print(f"\n--- Optimized content (first 500 chars) ---")
                print(result["optimized"][:500])

    if has_errors:
        sys.exit(1)


def _print_score(result: dict):
    """Pretty-print a single skill score."""
    if "error" in result:
        print(f"⚠ {result['skill']}: {result['error']}")
        return
    q = result["quality_score"]
    t = result.get("trigger_accuracy")
    icon = "✓" if q >= 0.8 else "✗"
    print(f"\n  {icon} {result['skill']}")
    print(f"    Quality:  {q:.2f}")
    if t is not None:
        print(f"    Triggers: {t:.2f}")
    print(f"    Tests:    {'T' if result['has_triggers_test'] else '-'}"
          f"{'I' if result['has_integration_test'] else '-'}"
          f"{'U' if result['has_unit_test'] else '-'}")
    if result["quality_feedback"]:
        for fb in result["quality_feedback"]:
            print(f"    ⚠ {fb}")


def _print_score_table(results: list[dict]):
    """Pretty-print score table for all skills."""
    print(f"\n{'Skill':<30} {'Quality':>8} {'Triggers':>9} {'Tests':>6}")
    print("─" * 56)
    for r in results:
        if "error" in r:
            print(f"{r['skill']:<30} {'ERROR':>8}")
            continue
        q = r["quality_score"]
        t = r.get("trigger_accuracy")
        tests = (
            f"{'T' if r['has_triggers_test'] else '-'}"
            f"{'I' if r['has_integration_test'] else '-'}"
            f"{'U' if r['has_unit_test'] else '-'}"
        )
        icon = "✓" if q >= 0.8 else "✗"
        t_str = f"{t:.2f}" if t is not None else "N/A"
        print(f"{icon} {r['skill']:<28} {q:>8.2f} {t_str:>9} {tests:>6}")

    passing = sum(1 for r in results if r.get("quality_score", 0) >= 0.8)
    print(f"\n  {passing}/{len(results)} skills at quality >= 0.80")


if __name__ == "__main__":
    main()
