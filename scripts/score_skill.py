#!/usr/bin/env python3
"""Score skill frontmatter compliance."""

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class ScoreResult:
    """Result of scoring a skill."""
    skill_name: str
    score: str  # Low, Medium, Medium-High, High
    description_length: int
    has_triggers: bool
    has_anti_triggers: bool
    has_compatibility: bool
    issues: list[str]
    
    def to_dict(self) -> dict:
        return {
            "skill_name": self.skill_name,
            "score": self.score,
            "description_length": self.description_length,
            "has_triggers": self.has_triggers,
            "has_anti_triggers": self.has_anti_triggers,
            "has_compatibility": self.has_compatibility,
            "issues": self.issues,
        }


def parse_frontmatter(content: str) -> Optional[dict]:
    """Extract YAML frontmatter from SKILL.md content."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None
    
    frontmatter = {}
    yaml_content = match.group(1)
    
    # Simple YAML parsing for name, description, compatibility
    name_match = re.search(r'^name:\s*["\']?([^"\'\n]+)["\']?', yaml_content, re.MULTILINE)
    if name_match:
        frontmatter["name"] = name_match.group(1).strip()
    
    # Handle multi-line description
    desc_match = re.search(
        r'^description:\s*[|>]?\s*["\']?(.*?)(?=\n[a-z]+:|\n---|\Z)',
        yaml_content,
        re.MULTILINE | re.DOTALL
    )
    if desc_match:
        desc = desc_match.group(1).strip().strip('"\'')
        # Clean up multi-line
        desc = re.sub(r'\n\s+', ' ', desc)
        frontmatter["description"] = desc
    
    # Check for compatibility field
    if re.search(r'^compatibility:', yaml_content, re.MULTILINE):
        frontmatter["compatibility"] = True
    
    return frontmatter


def has_trigger_phrases(description: str) -> bool:
    """Check if description contains trigger phrases."""
    patterns = [
        r'\bUSE FOR:',
        r'\bUSE THIS SKILL\b',
        r'\bTRIGGERS:',
        r'\bTrigger phrases include\b',
        r'\bActivate when\b',
    ]
    return any(re.search(p, description, re.IGNORECASE) for p in patterns)


def has_anti_trigger_phrases(description: str) -> bool:
    """Check if description contains anti-trigger phrases."""
    patterns = [
        r'\bDO NOT USE FOR:',
        r'\bNOT FOR:',
        r"\bDon't use this skill\b",
        r'\bInstead use\b',
        r'\bDefer to\b',
    ]
    return any(re.search(p, description, re.IGNORECASE) for p in patterns)


def validate_name(name: str) -> list[str]:
    """Validate skill name format."""
    issues = []
    
    if not name:
        issues.append("Missing name field")
        return issues
    
    if name != name.lower():
        issues.append(f"Name must be lowercase: '{name}'")
    
    if '_' in name:
        issues.append(f"Use hyphens instead of underscores: '{name}'")
    
    if len(name) > 64:
        issues.append(f"Name too long ({len(name)} chars, max 64)")
    
    if not re.match(r'^[a-z][a-z0-9-]*$', name):
        issues.append(f"Invalid name format: '{name}' (use lowercase, hyphens, numbers)")
    
    return issues


def score_skill(filepath: Path) -> ScoreResult:
    """Score a skill's frontmatter compliance."""
    content = filepath.read_text()
    frontmatter = parse_frontmatter(content)
    
    if not frontmatter:
        return ScoreResult(
            skill_name=filepath.parent.name,
            score="Low",
            description_length=0,
            has_triggers=False,
            has_anti_triggers=False,
            has_compatibility=False,
            issues=["No valid frontmatter found"],
        )
    
    name = frontmatter.get("name", filepath.parent.name)
    description = frontmatter.get("description", "")
    has_compat = frontmatter.get("compatibility", False)
    
    issues = []
    
    # Validate name
    issues.extend(validate_name(name))
    
    # Check description length
    desc_len = len(description)
    if desc_len < 150:
        issues.append(f"Description too short ({desc_len} chars, need 150+)")
    elif desc_len > 1024:
        issues.append(f"Description too long ({desc_len} chars, max 1024)")
    
    # Check triggers
    triggers = has_trigger_phrases(description)
    if not triggers:
        issues.append("No trigger phrases found (add 'USE FOR:')")
    
    # Check anti-triggers
    anti_triggers = has_anti_trigger_phrases(description)
    if not anti_triggers:
        issues.append("No anti-triggers found (add 'DO NOT USE FOR:')")
    
    # Calculate score
    if desc_len < 150 or not triggers:
        score = "Low"
    elif not anti_triggers:
        score = "Medium"
    elif not has_compat:
        score = "Medium-High"
    else:
        score = "High"
    
    return ScoreResult(
        skill_name=name,
        score=score,
        description_length=desc_len,
        has_triggers=triggers,
        has_anti_triggers=anti_triggers,
        has_compatibility=has_compat,
        issues=issues,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Score skill frontmatter compliance"
    )
    parser.add_argument(
        "files",
        nargs="+",
        type=Path,
        help="SKILL.md file(s) to score"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    parser.add_argument(
        "--min-score",
        choices=["low", "medium", "medium-high", "high"],
        help="Minimum required score (exit 1 if not met)"
    )
    
    args = parser.parse_args()
    
    score_order = ["low", "medium", "medium-high", "high"]
    results = []
    
    for filepath in args.files:
        if not filepath.exists():
            print(f"❌ File not found: {filepath}", file=sys.stderr)
            continue
        
        result = score_skill(filepath)
        results.append(result)
    
    if args.json:
        print(json.dumps([r.to_dict() for r in results], indent=2))
    else:
        for result in results:
            score_icons = {
                "Low": "🔴",
                "Medium": "🟡", 
                "Medium-High": "🟢",
                "High": "⭐",
            }
            icon = score_icons.get(result.score, "❓")
            
            print(f"{icon} {result.skill_name}: {result.score}")
            print(f"   Description: {result.description_length} chars")
            print(f"   Triggers: {'✓' if result.has_triggers else '✗'}")
            print(f"   Anti-triggers: {'✓' if result.has_anti_triggers else '✗'}")
            print(f"   Compatibility: {'✓' if result.has_compatibility else '✗'}")
            
            if result.issues:
                print("   Issues:")
                for issue in result.issues:
                    print(f"     - {issue}")
            print()
    
    # Check minimum score
    if args.min_score:
        min_idx = score_order.index(args.min_score)
        for result in results:
            result_idx = score_order.index(result.score.lower())
            if result_idx < min_idx:
                print(
                    f"❌ {result.skill_name} score ({result.score}) "
                    f"below minimum ({args.min_score})",
                    file=sys.stderr
                )
                sys.exit(1)


if __name__ == "__main__":
    main()
