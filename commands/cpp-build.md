---
description: Build C++ code with CMake or Make and run static analysis. Catches compilation errors, warnings, and cppcheck issues.
---

# C++ Build and Fix

Build C++ code and run static analysis to surface compilation errors and code issues.

## What This Command Does

1. **Build**: Run CMake build or Make
2. **Static Analysis**: Run `cppcheck` if available
3. **Warnings**: Treat warnings as errors (`-Werror`)
4. **Fix Incrementally**: Address one error at a time

## Diagnostic Commands

```bash
# CMake build (if CMakeLists.txt exists)
cmake -B build -DCMAKE_BUILD_TYPE=Debug 2>&1 | head -20
cmake --build build 2>&1 | head -60

# Make build (if Makefile exists)
make -j$(nproc) 2>&1 | head -60

# Static analysis
cppcheck --enable=all --quiet src/ 2>&1 | head -40

# clang-tidy (if .clang-tidy exists)
clang-tidy src/**/*.cpp -- -p build 2>&1 | head -40

# Compilation with sanitizers (Debug)
cmake -B build-asan -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined" \
  && cmake --build build-asan 2>&1 | head -40
```

## When to Use

- When CMake or Make build fails
- When `cppcheck` reports issues
- After pulling changes that break compilation
- Before committing C++ changes

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `error: use of undeclared identifier 'X'` | Missing include or typo | Add `#include` or fix name |
| `error: no matching function for call to 'X'` | Wrong arguments | Check function signature and argument types |
| `error: cannot convert 'T*' to 'U*'` | Pointer type mismatch | Use proper cast or fix type |
| `undefined reference to 'X'` | Missing link target | Add library to CMakeLists.txt |
| `multiple definition of 'X'` | ODR violation | Use `inline`, move to `.cpp`, or use `#pragma once` |

## Key Principles

- **Surgical fixes only** — don't refactor, just fix the error
- **Never** suppress warnings with `#pragma warning(disable)` without justification
- Fix root cause, not symptoms
- Always verify with a clean build after fixes

## Related

- Agent: `agents/cpp-reviewer.md`
- Skills: `skills/cpp-patterns/`, `skills/cpp-patterns-advanced/`, `skills/cpp-testing/`
- Use `/cpp-review` for a full code quality review
