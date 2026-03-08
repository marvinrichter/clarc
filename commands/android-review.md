---
description: Android code review — Compose best practices, Hilt scoping, Room migrations, ViewModel/UiState patterns, Coroutine Dispatchers. Invokes the android-reviewer agent.
---

# Android Code Review

Invoke the **android-reviewer** agent to perform a comprehensive review of recent Android/Kotlin changes.

## What Gets Reviewed

1. **Architecture**: Unidirectional Data Flow (UDF) present? Layer separation clean? (UI → Domain → Data)
2. **Compose Patterns**: State hoisting applied? Side effects in correct handlers (`LaunchedEffect`, `DisposableEffect`)? `collectAsStateWithLifecycle()` used (not `collectAsState()`)?
3. **Hilt Scoping**: Correct component scope for each binding? No Singleton leaks for short-lived objects?
4. **Room Schema**: Migration present for every version increment? `exportSchema = true`? Indices on frequently queried columns?
5. **Coroutines**: Correct Dispatcher? `viewModelScope` (not `GlobalScope`)? Dispatcher injected (not hardcoded)?
6. **Testing**: Compose testTags present on all interactive elements? ViewModel tests with Turbine + MockK?
7. **ProGuard / R8**: Minification rules present for reflection-dependent libraries (Room, Hilt, Retrofit)?

## Instructions

Delegate immediately to the **android-reviewer** agent with full context of:
1. The Kotlin files changed — run `git diff --name-only -- '*.kt' '*.kts'` to determine scope
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. Target Android API level and Compose version if known

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.

## Quick Self-Check (before invoking agent)

Run these checks locally to catch obvious issues:

```bash
# Lint — Android-specific checks
./gradlew lint

# Type checking + Hilt annotation processing
./gradlew :app:kspDebugKotlin

# All unit tests
./gradlew testDebugUnitTest

# Check for collectAsState() usage (should be collectAsStateWithLifecycle)
grep -rn "\.collectAsState()" --include="*.kt" app/src/main/

# Check for GlobalScope usage (should never appear in app code)
grep -rn "GlobalScope" --include="*.kt" app/src/main/

# Check for missing testTags on Button/TextField
grep -rn "Button\|TextField\|Switch\|Checkbox" --include="*.kt" app/src/main/ | grep -v testTag | grep -v "\/\/"
```
