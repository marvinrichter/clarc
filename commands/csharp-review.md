---
description: C# 12 / .NET 8 code review for nullable reference types, async/await, CQRS patterns, and security. Invokes the csharp-reviewer agent.
---

# C# Code Review

This command invokes the **csharp-reviewer** agent for C#/.NET-specific code review.

## What This Command Does

1. **Identify C# Changes**: Find modified `.cs` files via `git diff`
2. **Nullable Safety**: Check NRT annotations, `#nullable enable`, null-forgiving operator misuse
3. **Async Review**: `async void`, missing `ConfigureAwait`, deadlock patterns
4. **Architecture Check**: CQRS with MediatR, EF Core patterns, record/pattern matching usage
5. **Security Scan**: SQL injection, mass assignment, secret management
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying C# code
- Before committing .NET changes
- Reviewing pull requests with C# code
- Checking ASP.NET Core or Entity Framework patterns

## Review Categories

### CRITICAL (Must Fix)
- SQL injection (raw EF Core queries without parameterization)
- `async void` (unhandled exceptions crash the process)
- Hardcoded connection strings or API keys
- Missing authorization attributes on controllers

### HIGH (Should Fix)
- Missing `#nullable enable` in new files
- `ConfigureAwait(false)` missing in library code
- EF Core N+1 queries (missing `.Include()`)
- Missing cancellation token propagation

### MEDIUM (Consider)
- `string` where `record` or `enum` would be more precise
- Missing `init` setters on immutable properties
- Pattern matching opportunities not taken

## Automated Checks

```bash
dotnet build
dotnet test
dotnet format --verify-no-changes
```

## Related

- Agent: `agents/csharp-reviewer.md`
- Skills: `skills/csharp-patterns/`, `skills/csharp-testing/`
