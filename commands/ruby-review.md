---
description: Comprehensive Ruby/Rails code review for idiomatic Ruby, Rails best practices, security (Brakeman), performance, and N+1 detection. Invokes the ruby-reviewer agent.
---

# Ruby Code Review

Invoke the **ruby-reviewer** agent to perform a comprehensive review of recent Ruby changes.

## What Gets Reviewed

- Rails conventions: ActiveRecord, callbacks, concerns, service objects
- N+1 query detection and eager loading with `includes`/`preload`
- Security: Brakeman findings, mass assignment, CSRF, unsafe redirects
- RuboCop style compliance
- Performance: query optimization, caching opportunities, memory allocations

## Instructions

Delegate immediately to the **ruby-reviewer** agent with full context of:
1. The files changed (run `git diff --name-only` to determine scope)
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. Rails version and relevant gem context if applicable

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.

## When to Use This vs /code-review

| | `/ruby-review` | `/code-review` |
|---|---|---|
| **Use when** | Ruby/Rails project | Multi-language project or unsure |
| **Reviewer** | ruby-reviewer (specialist) | code-reviewer → routes to ruby-reviewer automatically |
| **Output** | Ruby-specific: Rails conventions, N+1, Brakeman security | Combined report across all changed languages |

Both invoke the same specialist. Use `/code-review` when changes span multiple languages.

## After This

- `/tdd` — add tests if coverage gaps were flagged
