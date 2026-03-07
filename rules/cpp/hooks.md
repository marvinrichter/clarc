---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/CMakeLists.txt"
  - "**/Makefile"
---
> This file extends [common/hooks.md](../common/hooks.md) with C++ specific hook configuration.

# C++ Hooks

## Auto-format with clang-format

Add to `hooks.json` PostToolUse for Edit on `.cpp`/`.h` files:

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-edit-format-dispatch.js\""
  }]
}
```

The dispatch hook routes `.cpp`/`.cc`/`.cxx`/`.h`/`.hpp` files to `scripts/hooks/post-edit-format-cpp.js`, which calls `clang-format -i` when a `.clang-format` config is found in the directory tree. Formatting is skipped silently if `clang-format` is not installed or no config exists.

## clang-tidy (optional, slower)

For deeper static analysis — run as async hook or in CI only:

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"...clang-tidy check...\"",
    "async": true,
    "timeout": 30
  }]
}
```

## Recommended toolchain

| Tool | Purpose | Install |
|------|---------|---------|
| `clang-format` | Auto-formatting | `brew install clang-format` |
| `clang-tidy` | Static analysis | `brew install llvm` |
| `cppcheck` | Additional linting | `brew install cppcheck` |
| `valgrind` | Memory leak detection | Linux only |
| `address sanitizer` | Runtime memory errors | `-fsanitize=address` CMake flag |
