---
paths:
  - "**/*.c"
---

# C Testing

> This file extends [common/testing.md](../common/testing.md) with C specific content.

## Test Framework: Unity

Lightweight, header-only framework — no dependencies.

```c
#include "unity.h"
#include "user.h"

void setUp(void)    { /* called before each test */ }
void tearDown(void) { /* called after each test  */ }

void test_user_create_valid(void) {
    UserRecord user;
    int rc = user_create("Alice", 30, &user);
    TEST_ASSERT_EQUAL(ERR_OK, rc);
    TEST_ASSERT_EQUAL_STRING("Alice", user.name);
    TEST_ASSERT_EQUAL_INT(30, user.age);
}

void test_user_create_null_name(void) {
    UserRecord user;
    int rc = user_create(NULL, 30, &user);
    TEST_ASSERT_EQUAL(ERR_INVALID, rc);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_user_create_valid);
    RUN_TEST(test_user_create_null_name);
    return UNITY_END();
}
```

### Unity Assertions

```c
TEST_ASSERT_EQUAL(expected, actual)
TEST_ASSERT_EQUAL_INT(expected, actual)
TEST_ASSERT_EQUAL_STRING(expected, actual)
TEST_ASSERT_EQUAL_FLOAT(expected, actual, delta)
TEST_ASSERT_NULL(ptr)
TEST_ASSERT_NOT_NULL(ptr)
TEST_ASSERT_TRUE(condition)
TEST_ASSERT_FALSE(condition)
TEST_FAIL_MESSAGE("explicit failure")
```

## Mocking with CMocka

CMocka supports function mocking via `--wrap` linker flag or mock functions:

```c
#include <stdarg.h>
#include <setjmp.h>
#include <cmocka.h>

// Mock the network call
int __wrap_http_get(const char *url, char *out, size_t max) {
    check_expected(url);
    char *resp = mock_ptr_type(char *);
    strncpy(out, resp, max);
    return mock_type(int);
}

static void test_fetch_user(void **state) {
    expect_string(__wrap_http_get, url, "https://api.example.com/users/1");
    will_return(__wrap_http_get, "{\"name\":\"Alice\"}");
    will_return(__wrap_http_get, 200);

    User user;
    int rc = fetch_user(1, &user);
    assert_int_equal(0, rc);
    assert_string_equal("Alice", user.name);
}
```

## Memory Safety Checks

### Valgrind (Linux/macOS)

```bash
valgrind --leak-check=full --error-exitcode=1 ./test_runner
```

Check for:
- Memory leaks (`definitely lost`, `indirectly lost`)
- Invalid reads/writes
- Use-after-free
- Uninitialized memory

### AddressSanitizer (fast, compile-time)

```makefile
CFLAGS_TEST = -fsanitize=address,undefined -g -O1
```

```bash
./test_runner  # ASan reports errors at runtime with stack traces
```

Use ASan in CI — it's faster than Valgrind and catches most issues.

## Test Organization

```
project/
  src/
    user.c
    user.h
  tests/
    test_user.c
    test_parser.c
    unity/        # Unity source
    CMakeLists.txt
```

## CMake Test Integration

```cmake
enable_testing()
add_executable(test_user tests/test_user.c src/user.c unity/unity.c)
target_include_directories(test_user PRIVATE src unity)
target_compile_options(test_user PRIVATE -fsanitize=address,undefined)
target_link_options(test_user PRIVATE -fsanitize=address,undefined)
add_test(NAME UserTests COMMAND test_user)
```

```bash
cmake -B build && cmake --build build && ctest --test-dir build -V
```
