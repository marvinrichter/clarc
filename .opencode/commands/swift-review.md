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
