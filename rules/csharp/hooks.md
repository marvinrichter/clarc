---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.razor"
globs:
  - "**/*.{cs,csx,razor}"
  - "**/*.csproj"
  - "**/*.sln"
alwaysApply: false
---

# C# Hooks

> This file extends [common/hooks.md](../common/hooks.md) with C# specific content.

## Auto-Format on Edit

After editing any `.cs`, `.csx`, or `.razor` file, `csharpier` runs automatically:

```bash
dotnet csharpier "$FILE"
```

Falls back silently if `csharpier` is not installed. Install globally:

```bash
dotnet tool install -g csharpier
```

## Recommended `.editorconfig`

```ini
root = true

[*.cs]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
max_line_length = 120

# Roslyn analyzers
dotnet_diagnostic.CA1062.severity = error   # validate non-null args
dotnet_diagnostic.CA2007.severity = error   # use ConfigureAwait
```

## Static Analysis

```bash
# Run Roslyn analyzers
dotnet build /p:TreatWarningsAsErrors=true

# Run dotnet format for style enforcement
dotnet format --verify-no-changes

# Run csharpier check
dotnet csharpier --check .
```

## Pre-commit Checks

```bash
dotnet csharpier --check .         # format check
dotnet build /warnaserror          # warnings as errors
dotnet test --no-build             # run tests
dotnet format --verify-no-changes  # style check
```
