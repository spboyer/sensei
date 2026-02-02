#!/usr/bin/env python3
"""Count tokens in SKILL.md files using tiktoken or fallback estimation."""

import argparse
import json
import re
import sys
from pathlib import Path

# Token limits
SOFT_LIMIT = 500
HARD_LIMIT = 5000


def count_tokens_tiktoken(text: str, model: str = "gpt-4") -> int:
    """Count tokens using tiktoken library."""
    try:
        import tiktoken
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except ImportError:
        return None


def count_tokens_estimate(text: str) -> int:
    """Estimate tokens using character/word heuristics.
    
    Approximation: ~4 characters per token for English text.
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Estimate: average of char-based and word-based
    char_estimate = len(text) / 4
    word_estimate = len(text.split()) * 1.3
    
    return int((char_estimate + word_estimate) / 2)


def count_tokens(text: str) -> tuple[int, str]:
    """Count tokens, returning (count, method_used)."""
    tiktoken_count = count_tokens_tiktoken(text)
    if tiktoken_count is not None:
        return tiktoken_count, "tiktoken"
    
    return count_tokens_estimate(text), "estimate"


def analyze_file(filepath: Path) -> dict:
    """Analyze a SKILL.md file for token usage."""
    if not filepath.exists():
        return {"error": f"File not found: {filepath}"}
    
    content = filepath.read_text()
    tokens, method = count_tokens(content)
    
    # Extract frontmatter
    frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    frontmatter_tokens = 0
    if frontmatter_match:
        fm_tokens, _ = count_tokens(frontmatter_match.group(0))
        frontmatter_tokens = fm_tokens
    
    # Calculate body tokens
    body_tokens = tokens - frontmatter_tokens
    
    # Determine status
    if tokens > HARD_LIMIT:
        status = "error"
        message = f"Exceeds hard limit ({tokens} > {HARD_LIMIT})"
    elif tokens > SOFT_LIMIT:
        status = "warning"
        message = f"Exceeds soft limit ({tokens} > {SOFT_LIMIT})"
    else:
        status = "ok"
        message = f"Under budget ({tokens} < {SOFT_LIMIT})"
    
    return {
        "file": str(filepath),
        "tokens": tokens,
        "frontmatter_tokens": frontmatter_tokens,
        "body_tokens": body_tokens,
        "method": method,
        "status": status,
        "message": message,
        "soft_limit": SOFT_LIMIT,
        "hard_limit": HARD_LIMIT,
    }


def main():
    global SOFT_LIMIT
    
    parser = argparse.ArgumentParser(
        description="Count tokens in SKILL.md files"
    )
    parser.add_argument(
        "files",
        nargs="+",
        type=Path,
        help="SKILL.md file(s) to analyze"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    parser.add_argument(
        "--soft-limit",
        type=int,
        default=SOFT_LIMIT,
        help=f"Soft token limit (default: {SOFT_LIMIT})"
    )
    
    args = parser.parse_args()
    SOFT_LIMIT = args.soft_limit
    
    results = []
    for filepath in args.files:
        result = analyze_file(filepath)
        results.append(result)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for result in results:
            if "error" in result:
                print(f"❌ {result['error']}")
                continue
            
            status_icon = {"ok": "✅", "warning": "⚠️", "error": "❌"}[result["status"]]
            print(f"{status_icon} {result['file']}")
            print(f"   Tokens: {result['tokens']} ({result['method']})")
            print(f"   Frontmatter: {result['frontmatter_tokens']}, Body: {result['body_tokens']}")
            print(f"   Status: {result['message']}")
            print()
    
    # Exit with error if any file exceeds hard limit
    if any(r.get("status") == "error" for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
