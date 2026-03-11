---
description: Comprehensive code review — delegates to code-reviewer agent which routes to language specialists (typescript, go, python, java, swift, rust, cpp, ruby, elixir).
---

# Code Review

Review changed files for correctness, security, and quality.

## Usage

```
/code-review                  — review all staged + unstaged changes
/code-review src/auth/        — review a specific directory
/code-review user.ts order.go — review specific files
```

## Step 1 — Collect Changed Files

Run `git diff --staged --name-only` and `git diff --name-only` to identify changed files.
If `$ARGUMENTS` is provided, use those file paths instead.

## Step 2 — Invoke code-reviewer

Use the **code-reviewer** agent with the file list and scope from Step 1.

The agent:
- Detects each file's language and routes to the appropriate specialist reviewer
- Runs parallel reviews when multiple languages are changed
- Falls back to universal security + quality checks for unsupported languages
- Returns a combined report with severity ratings: CRITICAL / HIGH / MEDIUM / LOW

## Step 3 — Interpret the Report

- **CRITICAL / HIGH**: Block merge. Fix before continuing.
- **MEDIUM**: Address where possible; document exceptions.
- **LOW / INFO**: Discretionary. Note for future improvement.
- **Approve**: No CRITICAL or HIGH issues — safe to commit or open PR.

## After This

- `/security-review` — deeper security scan targeting OWASP Top 10
- `/tdd` — if test coverage issues were flagged in the review
