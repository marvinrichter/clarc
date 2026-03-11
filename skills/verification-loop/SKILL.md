---
name: verification-loop
description: "Run build → type-check → lint → tests in sequence; fail fast and fix each error before continuing; repeat until all quality gates pass. Use after significant code changes and before creating a PR."
---

# Verification Loop Skill

A comprehensive verification system for Claude Code sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring
- When CI is failing and the root cause spans multiple quality dimensions (build, types, lint, tests)
- Before a release to confirm no secrets, stray `console.log` calls, or unintended file changes are present
- After a merge conflict resolution to verify that the build and test suite are still green

## Verification Phases

### Phase 1: Build Verification
```bash
# Check if project builds
npm run build 2>&1 | tail -20
# OR
pnpm build 2>&1 | tail -20
```

If build fails, STOP and fix before continuing.

**Build-Failure Recovery — concrete steps:**
```
1. Read the first error in full (not just the last line — root cause is usually first)
2. Identify the file and line: grep the error message for a file path
3. Read that file section (offset + limit), fix the specific error
4. Re-run the build command — do NOT proceed to Phase 2–6 until Phase 1 is green
5. If the same error recurs after a fix, invoke the build-error-resolver agent:
   say "fix the build" — it auto-triggers with the full error context
```

### Phase 2: Type Check
```bash
# TypeScript projects
npx tsc --noEmit 2>&1 | head -30

# Python projects
pyright . 2>&1 | head -30
```

Report all type errors. Fix critical ones before continuing.

### Phase 3: Lint Check
```bash
# JavaScript/TypeScript
npm run lint 2>&1 | head -30

# Python
ruff check . 2>&1 | head -30
```

### Phase 4: Test Suite
```bash
# Run tests with coverage
npm run test -- --coverage 2>&1 | tail -50

# Check coverage threshold
# Target: 80% minimum
```

Report:
- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

### Phase 5: Security Scan
```bash
# Check for secrets
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10

# Check for console.log
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### Phase 6: Diff Review
```bash
# Show what changed
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

For long sessions, run verification every 15 minutes or after major changes:

```markdown
Set a mental checkpoint:
- After completing each function
- After finishing a component
- Before moving to next task

Run: /verify
```

## Integration with Hooks

This skill complements PostToolUse hooks but provides deeper verification.
Hooks catch issues immediately; this skill provides comprehensive review.

## Related Skills

This is the **general-purpose** verification loop for any project. Framework-specific variants know the exact build commands, test runners, and quality tools for their ecosystem:

- **`springboot-verification`** — Spring Boot projects: Maven/Gradle build, SpotBugs, JaCoCo coverage, OWASP dependency check
- **`django-verification`** — Django projects: migration safety, pylint/ruff, pytest-django, Bandit/Safety security scans, deployment readiness

Use this skill when none of the framework-specific variants apply.
