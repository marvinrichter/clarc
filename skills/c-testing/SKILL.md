---
name: c-testing
description: "C testing patterns: Unity framework (TEST_ASSERT_*), CMocka mocking with __wrap_ and linker flag, Valgrind leak checking, AddressSanitizer, CMake CTest integration, test organization, and running tests with sanitizers. Use when writing or reviewing C tests."
---

# C Testing

## When to Activate

- Writing C unit tests with Unity or CMocka
- Setting up CMake CTest integration
- Running tests with AddressSanitizer or Valgrind
- Mocking C functions for isolation testing

---

## Unity — Minimal Unit Testing

Unity is a single-file C test framework — no dependencies.

```c
/* tests/test_queue.c */
#include "unity.h"
#include "queue.h"

void setUp(void)    { /* called before each test */ }
void tearDown(void) { /* called after each test  */ }

void test_queue_push_and_pop(void) {
    Queue *q = queue_new(4);
    TEST_ASSERT_NOT_NULL(q);

    int val = 42;
    TEST_ASSERT_EQUAL(ERR_OK, queue_push(q, &val, sizeof(val)));
    TEST_ASSERT_EQUAL(1, (int)queue_size(q));

    int out = 0;
    TEST_ASSERT_EQUAL(ERR_OK, queue_pop(q, &out, sizeof(out)));
    TEST_ASSERT_EQUAL_INT(42, out);
    TEST_ASSERT_EQUAL(0, (int)queue_size(q));

    queue_free(q);
}

void test_queue_overflow(void) {
    Queue *q = queue_new(1);
    int a = 1, b = 2;
    TEST_ASSERT_EQUAL(ERR_OK,       queue_push(q, &a, sizeof(a)));
    TEST_ASSERT_EQUAL(ERR_OVERFLOW, queue_push(q, &b, sizeof(b)));
    queue_free(q);
}

void test_queue_null_arg(void) {
    TEST_ASSERT_EQUAL(ERR_INVALID, queue_push(NULL, NULL, 0));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_queue_push_and_pop);
    RUN_TEST(test_queue_overflow);
    RUN_TEST(test_queue_null_arg);
    return UNITY_END();
}
```

### Unity Assertion Reference

```c
TEST_ASSERT_EQUAL(expected, actual)          /* generic equality */
TEST_ASSERT_EQUAL_INT(expected, actual)
TEST_ASSERT_EQUAL_UINT(expected, actual)
TEST_ASSERT_EQUAL_STRING(expected, actual)
TEST_ASSERT_EQUAL_FLOAT(expected, actual, delta)
TEST_ASSERT_EQUAL_MEMORY(expected, actual, len)
TEST_ASSERT_EQUAL_INT_ARRAY(expected, actual, n)
TEST_ASSERT_NULL(ptr)
TEST_ASSERT_NOT_NULL(ptr)
TEST_ASSERT_TRUE(condition)
TEST_ASSERT_FALSE(condition)
TEST_FAIL_MESSAGE("explicit failure reason")
TEST_IGNORE_MESSAGE("skipped — known flake")
```

---

## CMocka — Mocking with `__wrap_`

CMocka enables function mocking via the `--wrap` linker flag.

```c
/* tests/test_http_client.c */
#include <stdarg.h>
#include <setjmp.h>
#include <cmocka.h>
#include "http_client.h"

/* Wrap the real http_get — linker replaces calls with __wrap_http_get */
int __wrap_http_get(const char *url, char *out, size_t max) {
    check_expected(url);
    const char *resp = mock_ptr_type(const char *);
    strncpy(out, resp, max - 1);
    out[max - 1] = '\0';
    return mock_type(int);
}

static void test_fetch_user_success(void **state) {
    (void)state;

    expect_string(__wrap_http_get, url, "https://api.example.com/users/1");
    will_return(__wrap_http_get, "{\"name\":\"Alice\",\"age\":30}");
    will_return(__wrap_http_get, 200);

    User user;
    int rc = fetch_user(1, &user);
    assert_int_equal(0, rc);
    assert_string_equal("Alice", user.name);
    assert_int_equal(30, user.age);
}

static void test_fetch_user_network_error(void **state) {
    (void)state;

    expect_any(__wrap_http_get, url);
    will_return(__wrap_http_get, "");
    will_return(__wrap_http_get, -1);

    User user;
    int rc = fetch_user(1, &user);
    assert_int_equal(ERR_IO, rc);
}

int main(void) {
    const struct CMUnitTest tests[] = {
        cmocka_unit_test(test_fetch_user_success),
        cmocka_unit_test(test_fetch_user_network_error),
    };
    return cmocka_run_group_tests(tests, NULL, NULL);
}
```

### CMake with `--wrap` linker flag

```cmake
add_executable(test_http_client
    tests/test_http_client.c
    src/http_client.c
)
target_include_directories(test_http_client PRIVATE src)
target_link_libraries(test_http_client cmocka)
target_link_options(test_http_client PRIVATE
    -Wl,--wrap,http_get   # Linux (ld)
)
# macOS: use -Wl,-interposable,_http_get or compile with -DUNIT_TEST and #ifdef
```

---

## AddressSanitizer — Fast Compile-Time Detection

Catches: heap-use-after-free, stack-buffer-overflow, use-after-return, use-after-scope, undefined behavior.

```makefile
CFLAGS_TEST = -fsanitize=address,undefined -g -O1 -fno-omit-frame-pointer

test: build/test_queue
	ASAN_OPTIONS=detect_leaks=1 ./build/test_queue

build/test_queue: tests/test_queue.c src/queue.c unity/unity.c
	$(CC) $(CFLAGS_TEST) -Isrc -Iunity $^ -o $@
```

ASan outputs colorized stack traces with file:line references. Exit code is non-zero on any error.

---

## Valgrind — Deep Runtime Analysis

Catches: memory leaks, invalid reads/writes, uninitialized memory, overlapping memcpy.

```bash
valgrind \
  --leak-check=full \
  --show-leak-kinds=all \
  --track-origins=yes \
  --error-exitcode=1 \
  ./build/test_queue
```

Key output categories:
- `definitely lost` — classic leak (must fix)
- `indirectly lost` — pointer to leaked memory (fix root)
- `possibly lost` — pointer arithmetic made it look lost (review)
- `still reachable` — freed at exit, not a bug

---

## CMake CTest Integration

```cmake
cmake_minimum_required(VERSION 3.20)
project(mylib C)

set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra -Wpedantic -Werror)

enable_testing()

# Library under test
add_library(mylib src/queue.c src/user.c)
target_include_directories(mylib PUBLIC src)

# Unity (vendored)
add_library(unity unity/unity.c)
target_include_directories(unity PUBLIC unity)

# Test binary — queue
add_executable(test_queue tests/test_queue.c)
target_link_libraries(test_queue mylib unity)
target_compile_options(test_queue PRIVATE
    -fsanitize=address,undefined -g)
target_link_options(test_queue PRIVATE
    -fsanitize=address,undefined)
add_test(NAME QueueTests COMMAND test_queue)

# Test binary — user
add_executable(test_user tests/test_user.c)
target_link_libraries(test_user mylib unity)
target_compile_options(test_user PRIVATE
    -fsanitize=address,undefined -g)
target_link_options(test_user PRIVATE
    -fsanitize=address,undefined)
add_test(NAME UserTests COMMAND test_user)
```

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build -V           # verbose output
ctest --test-dir build --output-on-failure
```

---

## Project Structure

```
project/
  src/
    queue.c
    queue.h
    user.c
    user.h
  tests/
    test_queue.c
    test_user.c
  unity/
    unity.c
    unity.h
    unity_internals.h
  CMakeLists.txt
  Makefile              # optional, for simple projects
```

---

## Strategy: ASan in CI, Valgrind Locally

| Tool | Speed | Detection | Usage |
|------|-------|-----------|-------|
| AddressSanitizer | Fast (~2×) | Most heap/stack/UB errors | CI and local |
| Valgrind | Slow (~20×) | Full memory analysis + leaks | Local debugging |

Use ASan by default in CI (fast feedback). Run Valgrind locally when you suspect a leak that ASan misses, or for production pre-release verification.
