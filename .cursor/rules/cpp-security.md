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
> This file extends [common/security.md](../common/security.md) with C++ specific security guidance.

# C++ Security

## Memory Safety

NEVER use:
- Raw `new`/`delete` (use smart pointers)
- `reinterpret_cast` without justification
- C-style arrays with manual size tracking (use `std::array` or `std::vector`)
- `strcpy`, `sprintf`, `gets` — use safe alternatives

```cpp
// WRONG — buffer overflow risk
char buf[64];
strcpy(buf, user_input.c_str());

// CORRECT
std::string buf = user_input.substr(0, 63);
```

## Integer Overflow

Use checked arithmetic for security-sensitive code:

```cpp
#include <stdexcept>
#include <limits>

int safeAdd(int a, int b) {
    if (a > 0 && b > std::numeric_limits<int>::max() - a)
        throw std::overflow_error("integer overflow");
    return a + b;
}
```

## Input Validation

Always validate at system boundaries (file I/O, network, user input):

```cpp
void processInput(const std::string& input) {
    if (input.empty() || input.size() > MAX_INPUT_SIZE)
        throw std::invalid_argument("invalid input size");
    // validate content...
}
```

## Secrets

- Never hardcode API keys, passwords, or tokens
- Use environment variables: `std::getenv("API_KEY")`
- Validate secrets are present at startup

## Static Analysis in CI

```yaml
# GitHub Actions example
- name: clang-tidy
  run: |
    cmake -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
    clang-tidy src/**/*.cpp -- -p build

- name: cppcheck
  run: cppcheck --error-exitcode=1 --enable=all src/
```

## Sanitizers (Debug/Test builds)

```cmake
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
  target_compile_options(mylib PRIVATE
    -fsanitize=address,undefined
    -fno-omit-frame-pointer
  )
  target_link_options(mylib PRIVATE -fsanitize=address,undefined)
endif()
```
