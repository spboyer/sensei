#!/bin/bash
# Sensei Demo Script
# Run this to demonstrate Sensei's capabilities
#
# Usage: ./run-demo.sh [--reset]
#   --reset  Restore sample skill to "bad" state before demo

set -e

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
if [[ "$1" == "--reset" ]]; then
    print_header "RESETTING SAMPLE SKILL"
    cat > "$SAMPLE_SKILL" << 'EOF'
---
name: file-utils
description: 'Utility for working with files'
---

# File Utils

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
echo "to prevent skill collision and improve agent accuracy."
pause

# Step 1: Show the problem
print_header "1. THE PROBLEM - Poor Frontmatter"

print_step "Current skill description:"
echo ""
grep -A1 "^description:" "$SAMPLE_SKILL" || cat "$SAMPLE_SKILL" | head -10
echo ""

print_step "Problems with this skill:"
echo "  • Only ~30 characters in description"
echo "  • No trigger phrases (USE FOR)"
echo "  • No anti-triggers (DO NOT USE FOR)"
echo "  • Agent doesn't know when to activate it"
pause

# Step 2: Check tokens
print_header "2. CHECK CURRENT STATE"

print_step "Running token count..."
cd "$SENSEI_ROOT"
npm run tokens -- count "$SAMPLE_SKILL" 2>/dev/null | grep -v "^>" | grep -v "^$" | tail -5
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
echo "  • 7 trigger phrases (USE FOR)"
echo "  • 4 anti-triggers (DO NOT USE FOR)"
echo "  • Agent knows exactly when to use/not use"
pause

# Step 4: Compare
print_header "4. BEFORE vs AFTER"

BEFORE_CHARS=$(wc -c < "$SAMPLE_SKILL" | tr -d ' ')
AFTER_CHARS=$(wc -c < "$SAMPLE_AFTER" | tr -d ' ')
BEFORE_TRIGGERS=$(grep -c "USE FOR\|TRIGGERS" "$SAMPLE_SKILL" 2>/dev/null || echo "0")
AFTER_TRIGGERS=$(grep -o '"[^"]*"' "$SAMPLE_AFTER" 2>/dev/null | wc -l | tr -d ' ')

echo "┌─────────────────┬──────────┬──────────┐"
echo "│ Metric          │  Before  │  After   │"
echo "├─────────────────┼──────────┼──────────┤"
printf "│ %-15s │ %8s │ %8s │\n" "Characters" "$BEFORE_CHARS" "$AFTER_CHARS"
printf "│ %-15s │ %8s │ %8s │\n" "Triggers" "$BEFORE_TRIGGERS" "$AFTER_TRIGGERS"
printf "│ %-15s │ %8s │ %8s │\n" "Score" "Low" "Med-High"
echo "└─────────────────┴──────────┴──────────┘"
pause

# Step 5: How to use
print_header "5. HOW TO USE SENSEI"

echo "In Copilot CLI, say:"
echo ""
echo -e "  ${GREEN}Run sensei on <skill-name>${NC}"
echo -e "  ${GREEN}Run sensei on <skill-name> --fast${NC}  (skip tests)"
echo -e "  ${GREEN}Run sensei on all Low-adherence skills${NC}"
echo ""
echo "Sensei will:"
echo "  1. Read your skill"
echo "  2. Score compliance"
echo "  3. Improve frontmatter"
echo "  4. Check token budget"
echo "  5. Ask: Commit, Create Issue, or Skip?"
echo ""

print_header "DEMO COMPLETE"

echo "Install Sensei:"
echo -e "  ${BLUE}git clone https://github.com/spboyer/sensei.git ~/.copilot/skills/sensei${NC}"
echo ""
echo "Questions? See README.md or run 'sensei help' in Copilot CLI."
echo ""
