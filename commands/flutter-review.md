---
description: Flutter/Dart code review for widget architecture, performance, null safety, and accessibility. Invokes the flutter-reviewer agent.
---

# Flutter Code Review

This command invokes the **flutter-reviewer** agent for Flutter/Dart-specific code review.

## What This Command Does

1. **Identify Flutter Changes**: Find modified `.dart` files via `git diff`
2. **Widget Architecture**: Check `const` constructors, unnecessary rebuilds, `RepaintBoundary`
3. **Performance Review**: Detect rebuild hotspots, heavy `build()` methods, missing `const`
4. **Null Safety**: Find unsafe `!` operators, nullable API misuse
5. **Async Review**: Check `mounted` checks after `await`, `BuildContext` across async gaps
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying Flutter/Dart code
- Before committing widget or state management changes
- Reviewing pull requests with Flutter code
- Checking accessibility and platform-specific issues

## Review Categories

### CRITICAL (Must Fix)
- `BuildContext` used across async gaps (missing `mounted` check)
- Hardcoded credentials or API keys in Dart files
- Memory leaks (listeners not disposed, StreamSubscriptions uncancelled)

### HIGH (Should Fix)
- Missing `const` constructors on stateless widgets
- Heavy `initState` with blocking I/O
- Platform-specific code without fallback
- Missing `dispose()` for controllers

### MEDIUM (Consider)
- `RepaintBoundary` not used around animation-heavy subtrees
- `setState()` called with no actual state change
- Non-semantic accessibility labels

## Related

- Agent: `agents/flutter-reviewer.md`
- Skills: `skills/flutter-patterns/`, `skills/flutter-testing/`, `skills/dart-patterns/`
