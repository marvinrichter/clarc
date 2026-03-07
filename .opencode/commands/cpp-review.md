---
description: Comprehensive C++ code review for C++ Core Guidelines, memory safety, RAII, modern C++20/23, concurrency, and performance. Invokes the cpp-reviewer agent.
---

# C++ Code Review

Invoke the **cpp-reviewer** agent to perform a comprehensive review of recent C++ changes.

## What Gets Reviewed

- Memory safety: raw owning pointers, manual delete, buffer overflows, use-after-free
- Modern C++: C-style casts, missing `const`, `std::move` correctness
- Resource management: RAII, Rule of Five, `shared_ptr` cycles
- Concurrency: data races, deadlocks, missing `std::atomic`
- Performance: pass-by-value for large types, `push_back` vs `emplace_back`, `std::endl`

## Instructions

Delegate immediately to the **cpp-reviewer** agent with full context of:
1. The files changed (run `git diff --name-only` to determine scope)
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. The C++ standard version in use (C++17/20/23)

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.
