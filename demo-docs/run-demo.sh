#!/bin/bash
# Sensei Demo Script
# Run this to demonstrate Sensei's capabilities
#
# Usage: ./run-demo.sh [--reset]
#   --reset  Restore sample skill to "bad" state before demo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SENSEI_ROOT="$(dirname "$SCRIPT_DIR")"
SAMPLE_SKILL="$SCRIPT_DIR/sample-skill/SKILL.md"
SAMPLE_AFTER="$SCRIPT_DIR/sample-skill/SKILL-after.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

pause() {
    echo ""
    read -p "Press Enter to continue..."
    echo ""
}

# Reset sample skill if requested
if [[ "${1:-}" == "--reset" ]]; then
    print_header "RESETTING SAMPLE SKILL"
    cat > "$SAMPLE_SKILL" << 'EOF'
---
name: sample-skill
description: 'Utility for working with files'
---

# Sample Skill

This skill helps with file operations.

## Commands

- Read files
- Write files
- Delete files
- List directory contents
EOF
    echo -e "${GREEN}✓ Sample skill reset to 'bad' state${NC}"
    exit 0
fi

# ============================================================
# DEMO START
# ============================================================

print_header "SENSEI DEMO - Skill Frontmatter Compliance"

echo "This demo shows how Sensei improves skill frontmatter"
echo "using fixed before/after fixtures, not a live host evaluation."
pause

# Step 1: Show the problem
print_header "1. THE PROBLEM - Poor Frontmatter"

print_step "Current skill description:"
echo ""
grep -A1 "^description:" "$SAMPLE_SKILL" || cat "$SAMPLE_SKILL" | head -10
echo ""

print_step "Problems with this skill:"
echo "  • Vague purpose and ambiguous scope"
echo "  • No distinctive positive use cases"
echo "  • Short descriptions are not automatically invalid"
pause

# Step 2: Check tokens
print_header "2. CHECK CURRENT STATE"

print_step "Running static checks and token counts..."
cd "$SENSEI_ROOT"
npm run tokens -- score "$SCRIPT_DIR/sample-skill"
npm run tokens -- count "$SAMPLE_SKILL" "$SAMPLE_AFTER"
pause

# Step 3: Show the solution
print_header "3. THE SOLUTION - Improved Frontmatter"

print_step "After Sensei improvement:"
echo ""
cat "$SAMPLE_AFTER" | head -20
echo "..."
echo ""

print_step "Improvements:"
echo "  • Clear description with skill type prefix"
echo "  • Three distinctive WHEN phrases"
echo "  • Positive scope; no mandatory negative clause"
echo "  • Host activation still requires observed evidence"
pause

# Step 4: Compare
print_header "4. BEFORE vs AFTER"

BEFORE_CHARS=$(wc -c < "$SAMPLE_SKILL" | tr -d ' ')
AFTER_CHARS=$(wc -c < "$SAMPLE_AFTER" | tr -d ' ')

echo "┌─────────────────┬──────────┬──────────┐"
echo "│ Metric          │  Before  │  After   │"
echo "├─────────────────┼──────────┼──────────┤"
printf "│ %-15s │ %8s │ %8s │\n" "File bytes" "$BEFORE_CHARS" "$AFTER_CHARS"
echo "└─────────────────┴──────────┴──────────┘"
echo "Medium-High is an authoring target, not a computed CLI level."
echo "Static checks and GEPA proxy fitness do not prove host activation."
pause

# Step 5: How to use
print_header "5. HOW TO USE SENSEI"

echo "In Copilot CLI, say:"
echo ""
echo -e "  ${GREEN}Run sensei on sample-skill in demo-docs/sample-skill${NC}"
echo -e "  ${GREEN}Run sensei on sample-skill in demo-docs/sample-skill --fast${NC}  (skip tests)"
echo -e "  ${GREEN}Run sensei on all Low-adherence skills${NC}"
echo ""
echo "Sensei will:"
echo "  1. Read your skill"
echo "  2. Separate portable diagnostics from optional advice"
echo "  3. Improve frontmatter"
echo "  4. Check token budget"
echo "  5. Ask: Commit, Create Issue, or Skip?"
echo ""

print_header "DEMO COMPLETE"

echo "Install Sensei:"
echo -e "  ${BLUE}git clone https://github.com/spboyer/sensei.git ~/.copilot/skills/sensei${NC}"
echo ""
echo "See README.md for release status, host setup, and optional evaluation."
echo ""
