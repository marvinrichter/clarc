---
paths:
  - "**/*.scala"
  - "**/*.sc"
  - "**/build.sbt"
globs:
  - "**/*.{scala,sc}"
  - "**/build.sbt"
  - "**/settings.sbt"
alwaysApply: false
---

# Scala Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Scala specific content.

## Auto-Format on Edit

After editing any `.scala` or `.sc` file, `scalafmt` runs automatically:

```bash
scalafmt --non-interactive "$FILE"
```

`scalafmt` reads `.scalafmt.conf` from the project root. If no config is present, it uses defaults.

## Recommended `.scalafmt.conf`

```hocon
version = "3.8.1"
runner.dialect = scala3          # or scala213 for Scala 2
maxColumn = 120
align.preset = more
newlines.topLevelStatements = [before]
rewrite.rules = [SortImports, RedundantBraces]
```

## Static Analysis

Run `scalafix` for additional linting beyond formatting:

```bash
sbt scalafix
```

Common Scalafix rules:
- `RemoveUnused` — remove unused imports and local defs
- `OrganizeImports` — alphabetical import sorting
- `DisableSyntax` — flag `null`, `var`, Java-style returns

## Pre-commit Checks

```bash
sbt scalafmt --check   # fail if any file would be reformatted
sbt scalafix --check   # fail if any rule would apply
sbt test               # run full test suite
```
