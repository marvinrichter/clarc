---
description: Kotlin code review for coroutines, null safety, sealed classes, and architecture patterns. Invokes the kotlin-reviewer agent.
---

# Kotlin Code Review

This command invokes the **kotlin-reviewer** agent for Kotlin-specific code review.

## What This Command Does

1. **Identify Kotlin Changes**: Find modified `.kt` and `.kts` files via `git diff`
2. **Null Safety Audit**: Detect `!!` operators, unsafe casts, nullable misuse
3. **Coroutine Review**: Check `CancellationException` handling, dispatcher correctness, structured concurrency
4. **Architecture Check**: val/var discipline, sealed classes, data classes, companion objects
5. **Security Scan**: SQL injection via Room, hardcoded secrets
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying Kotlin code
- Before committing Kotlin changes (Android or backend)
- Reviewing pull requests with Kotlin code
- Checking Jetpack Compose recomposition safety

## Review Categories

### CRITICAL (Must Fix)
- Unsafe `!!` operators that cause NPE in production
- `CancellationException` caught and swallowed
- Hardcoded credentials or API keys
- SQL injection via raw queries in Room

### HIGH (Should Fix)
- Dispatcher hardcoding (`Dispatchers.Main` in business logic)
- `GlobalScope` usage (memory leaks)
- Missing `coEvery`/`coVerify` in coroutine tests
- Mutable state exposed from ViewModel

### MEDIUM (Consider)
- `var` where `val` suffices
- Missing `data class` for value types
- Unsealed class hierarchies where sealed would be safer

## Related

- Agent: `agents/kotlin-reviewer.md`
- Skills: `skills/kotlin-patterns/`, `skills/kotlin-testing/`
- Android: use `/android-review` for Compose/Hilt/Room specifics
