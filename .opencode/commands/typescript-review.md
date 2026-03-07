---
description: Comprehensive TypeScript code review for hexagonal architecture, DDD patterns, type safety, security, and performance. Invokes the typescript-reviewer agent.
---

# TypeScript Code Review

Invoke the **typescript-reviewer** agent to perform a comprehensive review of recent TypeScript changes.

## What Gets Reviewed

- Type safety and strict mode compliance
- Hexagonal architecture and DDD patterns
- Security: SQL injection, XSS, input validation
- Performance: unnecessary re-renders, N+1 queries
- ESLint / Biome rule violations

## Instructions

Delegate immediately to the **typescript-reviewer** agent with full context of:
1. The files changed (run `git diff --name-only` to determine scope)
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. The current branch and PR context if available

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.
