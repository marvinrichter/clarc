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

The dispatch hook routes `.cpp`/`.cc`/`.h`/`.hpp` files to a clang-format script automatically if you add those extensions to `EXT_MAP` in `post-edit-format-dispatch.js`.

## Manual clang-format hook example

```bash
#!/usr/bin/env bash
# post-edit-format-cpp.sh
FILE=$(echo "$1" | jq -r '.tool_input.file_path // empty')
if [[ "$FILE" =~ \.(cpp|cc|cxx|h|hpp)$ ]]; then
  clang-format -i "$FILE" 2>/dev/null || true
fi
```

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
