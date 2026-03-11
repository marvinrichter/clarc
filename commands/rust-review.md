---
description: Comprehensive Rust code review for ownership, borrowing, async correctness (Tokio), error handling (thiserror/anyhow), and performance. Invokes the rust-reviewer agent.
---

# Rust Code Review

Invoke the **rust-reviewer** agent to perform a comprehensive review of recent Rust changes.

## What Gets Reviewed

- Memory safety: ownership, borrowing, lifetimes, unsafe blocks
- Async correctness: blocking in async, Mutex across await, untracked spawns
- Error handling: `unwrap()` usage, `thiserror`/`anyhow` patterns, error context
- Performance: unnecessary clones, string allocations, missing preallocation
- Idiomatic Rust: iterator chains, derive macros, API design

## Instructions

Delegate immediately to the **rust-reviewer** agent with full context of:
1. The files changed (run `git diff --name-only` to determine scope)
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. Whether this is a library crate or application binary (affects error handling expectations)

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.

## When to Use This vs /code-review

| | `/rust-review` | `/code-review` |
|---|---|---|
| **Use when** | Rust project or Rust is primary language | Multi-language project or unsure |
| **Reviewer** | rust-reviewer (specialist) | code-reviewer → routes to rust-reviewer automatically |
| **Output** | Rust-specific: ownership, borrowing, async safety | Combined report across all changed languages |

Both invoke the same specialist. Use `/code-review` when changes span multiple languages.

## After This

- `/rust-build` — rebuild after addressing borrow errors
- `/rust-test` — run tests with coverage after fixing issues
- `/tdd` — add tests if coverage gaps were flagged
- `/commit-push-pr` — commit and open PR after CRITICAL/HIGH are resolved
