---
paths:
  - "**/*.c"
globs:
  - "**/*.{c,h}"
  - "**/Makefile"
  - "**/CMakeLists.txt"
alwaysApply: false
---

# C Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with C specific content.

## Standard

Use C11 as the minimum standard: `-std=c11` (or `-std=c17` for new projects).

```makefile
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -Werror
```

## Naming Conventions

- Functions: `snake_case` — `parse_json`, `user_create`
- Types (typedef): `PascalCase` — `UserRecord`, `ParseResult`
- Constants/macros: `UPPER_SNAKE_CASE` — `MAX_BUFFER_SIZE`, `DEFAULT_TIMEOUT`
- Private (file-scope) functions: prefix with `_` — `_validate_header`

```c
#define MAX_PATH_LEN  256

typedef struct {
    char name[64];
    int  age;
} UserRecord;

static int _validate_age(int age);

int user_create(const char *name, int age, UserRecord *out);
```

## Function Design

- Maximum function length: 50 lines
- One function, one responsibility
- Declare local variables at the start of the block (C99+: declaration anywhere)
- Use `const` on pointer parameters that are not modified:

```c
// WRONG — misleading: caller can't tell if str is modified
int count_words(char *str);

// CORRECT — explicit read-only contract
int count_words(const char *str);
```

## Header / Source Split

- Declare prototypes in `.h` files; define in `.c` files
- Use include guards (or `#pragma once` for non-portable code):

```c
// my_module.h
#ifndef MY_MODULE_H
#define MY_MODULE_H

typedef struct MyModule MyModule;

MyModule *my_module_new(void);
void      my_module_free(MyModule *m);
int       my_module_process(MyModule *m, const char *input, size_t len);

#endif /* MY_MODULE_H */
```

## Error Handling

Return error codes from functions; use out-parameters for results:

```c
typedef enum {
    ERR_OK        = 0,
    ERR_NOMEM     = -1,
    ERR_INVALID   = -2,
    ERR_NOT_FOUND = -3
} ErrorCode;

// WRONG — caller has no way to distinguish error from result
char *find_user(int id);

// CORRECT — explicit error code + out-parameter
ErrorCode find_user(int id, UserRecord *out);
```

Check return values — never ignore them:

```c
// WRONG
fwrite(buf, 1, len, fp);

// CORRECT
if (fwrite(buf, 1, len, fp) != len) {
    log_error("write failed: %s", strerror(errno));
    return ERR_IO;
}
```

## Resource Cleanup: goto pattern

```c
int process_file(const char *path) {
    FILE     *fp  = NULL;
    char     *buf = NULL;
    ErrorCode rc  = ERR_OK;

    fp = fopen(path, "r");
    if (!fp) { rc = ERR_IO; goto cleanup; }

    buf = malloc(BUF_SIZE);
    if (!buf) { rc = ERR_NOMEM; goto cleanup; }

    /* ... use fp and buf ... */

cleanup:
    free(buf);
    if (fp) fclose(fp);
    return rc;
}
```

## Formatting

- 4-space indentation (or 2-space, be consistent)
- Enforced by `clang-format` with a `.clang-format` config
- Maximum line length: 100 characters
