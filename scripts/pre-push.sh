#!/usr/bin/env bash
# Pre-push hook — runs all CI checks locally before pushing.
# Install: cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PASS=0
FAIL=0
ERRORS=()

run() {
  local label="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✓ $label"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label"
    FAIL=$((FAIL + 1))
    ERRORS+=("$label")
  fi
}

echo ""
echo "▶ Pre-push checks"
echo ""

run "ESLint"        npx eslint "scripts/**/*.js" "tests/**/*.js"
run "markdownlint"  npx markdownlint "agents/**/*.md" "skills/**/*.md" "commands/**/*.md" "rules/**/*.md"
run "Agents"        node scripts/ci/validate-agents.js
run "Hooks"         node scripts/ci/validate-hooks.js
run "Commands"      node scripts/ci/validate-commands.js
run "Skills"        node scripts/ci/validate-skills.js
run "Rules"         node scripts/ci/validate-rules.js
run "Wiring"        node scripts/ci/validate-wiring.js
run "Naming"        node scripts/ci/validate-naming.js
run "Tests"         node tests/run-all.js

echo ""
echo "  ${PASS} passed, ${FAIL} failed"

if [ ${FAIL} -gt 0 ]; then
  echo ""
  echo "  Failed checks:"
  for e in "${ERRORS[@]}"; do
    echo "    - $e"
  done
  echo ""
  echo "  Push blocked. Fix the issues above, then push again."
  echo "  To skip (emergency only): git push --no-verify"
  echo ""
  exit 1
fi

echo ""
