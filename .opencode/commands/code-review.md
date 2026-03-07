---
description: Comprehensive code review — delegates to code-reviewer agent which routes to language specialists (typescript, go, python, java, swift, rust, cpp, ruby, elixir).
---

# Code Review

Immediately invoke the **code-reviewer** agent to review changed files.

The code-reviewer agent:
1. Detects changed file languages (`git diff --staged` + `git diff`)
2. Routes each language to its specialist reviewer (typescript-reviewer, go-reviewer, python-reviewer, java-reviewer, swift-reviewer, rust-reviewer, cpp-reviewer, ruby-reviewer, elixir-reviewer)
3. Runs parallel reviews when multiple languages are changed
4. Falls back to universal security + quality checks for unsupported languages
5. Produces a combined report with severity (CRITICAL / HIGH / MEDIUM / LOW) and verdict

If specific files or a scope are provided via `$ARGUMENTS`, pass them as context to the agent.
