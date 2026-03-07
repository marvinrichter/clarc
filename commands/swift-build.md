---
description: Build Swift/Xcode projects and run static analysis. Catches compilation errors, warnings, and analyzer issues.
---

# Swift Build and Fix

Build Swift/Xcode projects and run static analysis to surface compilation errors and code issues.

## What This Command Does

1. **Build**: Run `swift build` or `xcodebuild`
2. **Static Analysis**: Run Xcode Analyzer (`xcodebuild analyze`)
3. **Warnings**: Treat warnings as errors where possible
4. **Fix Incrementally**: Address one error at a time

## Diagnostic Commands

```bash
# Swift Package Manager build
swift build 2>&1 | head -60

# Swift Package Manager (release)
swift build -c release 2>&1 | head -60

# Xcode build (replace MyApp and MyScheme)
xcodebuild -scheme MyApp -configuration Debug build 2>&1 | head -60

# Xcode analyze (static analysis)
xcodebuild -scheme MyApp analyze 2>&1 | grep -E "(warning|error):" | head -40

# Run tests
swift test 2>&1 | head -60

# Resolve dependencies
swift package resolve 2>&1

# Show build errors only
swift build 2>&1 | grep -E "^.*error:" | head -20
```

## When to Use

- When `swift build` or `xcodebuild` fails
- After pulling changes that break compilation
- Before committing Swift changes
- When Xcode shows red errors but you want CLI output

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `error: cannot find type 'X' in scope` | Missing import or typo | Add `import ModuleName` or fix name |
| `error: value of type 'X' has no member 'Y'` | API mismatch or wrong type | Check correct type/API version |
| `error: cannot convert value of type 'X' to expected argument type 'Y'` | Type mismatch | Use explicit cast or fix type |
| `error: 'async' call in a function that does not support concurrency` | Calling async without await context | Add `async` to function or use `Task {}` |
| `error: actor-isolated property 'X' can not be referenced from a non-isolated context` | Actor isolation violation | Access via `await` or `@MainActor` |
| `error: product 'X' required by package 'Y' target 'Z' not found` | Missing dependency | Add to `Package.swift` dependencies |

## Key Principles

- **Surgical fixes only** — don't refactor, just fix the error
- Fix root cause: actor isolation errors often indicate architectural issues
- Always verify with a clean build after fixes (`swift package clean && swift build`)
- Concurrency errors: prefer structured concurrency (`async let`, `TaskGroup`) over `Task.detached`

## Related

- Agent: `agents/swift-reviewer.md`
- Skills: `skills/swift-patterns/`, `skills/swift-patterns-advanced/`, `skills/swift-concurrency-6-2/`
- Use `/swift-review` for a full code quality review
