---
paths:
  - "**/*.c"
---

# C Hooks

> This file extends [common/hooks.md](../common/hooks.md) with C specific content.

## Auto-Format on Edit

After editing any `.c` file, `clang-format` runs automatically:

```bash
clang-format -i --style=file "$FILE"
```

`clang-format` reads `.clang-format` from the project root (or ancestor directory). Falls back to `--style=LLVM` if no config is found.

## Recommended `.clang-format`

```yaml
BasedOnStyle: LLVM
IndentWidth: 4
ColumnLimit: 100
AllowShortFunctionsOnASingleLine: None
BreakBeforeBraces: Attach
SpaceBeforeParens: ControlStatements
```

## Static Analysis

Run `clang-tidy` for lint beyond formatting:

```bash
clang-tidy src/*.c -- -std=c11 -Isrc
```

Common checks: `clang-analyzer-*`, `cert-*`, `misc-*`

Run `cppcheck` for additional static analysis:

```bash
cppcheck --enable=all --std=c11 src/
```

## Pre-commit Checks

```bash
clang-format --dry-run --Werror src/*.c  # fail on format violations
clang-tidy src/*.c -- -std=c11           # fail on lint violations
make test                                 # run tests with ASan
valgrind ./build/test_runner             # optional: deep memory check
```
