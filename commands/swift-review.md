---
description: Comprehensive Swift code review for concurrency safety, SwiftUI best practices, protocol-based architecture, memory management, and security. Invokes the swift-reviewer agent.
---

# Swift Code Review

Invoke the **swift-reviewer** agent to perform a comprehensive review of recent Swift changes.

## What Gets Reviewed

- Swift 6 concurrency safety: actors, Sendable, data races
- SwiftUI state management and view composition
- Protocol-based architecture and dependency injection
- Memory management: retain cycles, weak/unowned references
- Security: keychain usage, certificate pinning, input validation

## Instructions

Delegate immediately to the **swift-reviewer** agent with full context of:
1. The files changed (run `git diff --name-only` to determine scope)
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. Target iOS/macOS deployment version if relevant

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.

## When to Use This vs /code-review

| | `/swift-review` | `/code-review` |
|---|---|---|
| **Use when** | Swift/SwiftUI/iOS project | Multi-language project or unsure |
| **Reviewer** | swift-reviewer (specialist) | code-reviewer → routes to swift-reviewer automatically |
| **Output** | Swift-specific: concurrency, actors, SwiftUI patterns | Combined report across all changed languages |

Both invoke the same specialist. Use `/code-review` when changes span multiple languages.

## After This

- `/swift-build` — rebuild after addressing compilation errors
- `/tdd` — add tests if coverage gaps were flagged
- `/commit-push-pr` — commit and open PR after CRITICAL/HIGH are resolved
