---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/CMakeLists.txt"
  - "**/Makefile"
globs:
  - "**/*.{cpp,cc,cxx,h,hpp}"
  - "**/CMakeLists.txt"
  - "**/Makefile"
alwaysApply: false
---
> This file extends [common/coding-style.md](../common/coding-style.md) with C++ specific content.

# C++ Coding Style

## Formatting

Use **clang-format** with the project's `.clang-format` config (default: Google or LLVM style):

```bash
clang-format -i src/**/*.cpp src/**/*.h
```

## Modern C++ Standard

Target **C++17** minimum, **C++20** preferred:
- Structured bindings: `auto [x, y] = pair;`
- `if constexpr` over `#ifdef` for compile-time branches
- `std::optional`, `std::variant`, `std::string_view`
- Ranges (C++20): `std::ranges::sort`, `std::views::filter`

## Memory Management

NEVER use raw owning pointers. Use RAII and smart pointers:

```cpp
// WRONG
Foo* foo = new Foo();

// CORRECT
auto foo = std::make_unique<Foo>();
auto shared = std::make_shared<Bar>();
```

## Const Correctness

Mark everything `const` that should not change:

```cpp
std::string process(const std::string& input) const;
const auto result = compute();
```

## Error Handling

Prefer **exceptions for exceptional conditions**, **`std::expected`/`std::optional` for expected failures** (C++23/23):

```cpp
// Expected failure path — use optional/expected
std::optional<Config> parseConfig(std::string_view path);

// Truly exceptional — use exception
void openDatabase(const std::string& url); // throws on failure
```

## Naming Conventions

- Classes/Structs: `PascalCase`
- Functions/methods: `camelCase` or `snake_case` (pick one, be consistent)
- Constants: `kConstantName` or `CONSTANT_NAME`
- Member variables: `m_name` or `name_` (trailing underscore)
- Namespaces: `lowercase`

## Header Guards

Use `#pragma once` (universally supported, less error-prone than include guards):

```cpp
#pragma once
#include <string>
```

## File Organization

- `.h` / `.hpp` — declarations only
- `.cpp` — implementations
- One class per file (exceptions: small related helpers)
- Max 400 lines per file; extract when larger
