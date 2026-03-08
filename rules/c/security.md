---
paths:
  - "**/*.c"
---

# C Security Guidelines

> This file extends [common/security.md](../common/security.md) with C specific content.

## Buffer-Safe String Functions

The function `gets` is removed in C11 and must never be used. Use `fgets` instead:

```c
// NEVER — no bounds checking, undefined behavior on overflow
gets(buffer);

// CORRECT
fgets(buffer, sizeof(buffer), stdin);
```

Use `snprintf` instead of `sprintf`:

```c
// WRONG — no bounds checking
sprintf(msg, "Error: %s at line %d", text, line);

// CORRECT — always specify buffer size
snprintf(msg, sizeof(msg), "Error: %s at line %d", text, line);
```

Use `strncpy` and always NUL-terminate:

```c
// WRONG — no bounds checking
strcpy(dst, src);

// CORRECT
strncpy(dst, src, sizeof(dst) - 1);
dst[sizeof(dst) - 1] = '\0';
```

## Format String Attacks

Never pass user-controlled data directly as a printf format string:

```c
// WRONG — format string injection
printf(user_input);
fprintf(logfile, user_message);

// CORRECT — always use a literal format string
printf("%s", user_input);
fprintf(logfile, "%s", user_message);
```

## Integer Overflow

Check before arithmetic on untrusted values:

```c
#include <limits.h>

// WRONG — may overflow
int total = count * item_size;

// CORRECT — check before multiply
if (count > 0 && item_size > INT_MAX / count) {
    return ERR_OVERFLOW;
}
int total = count * item_size;
```

Use `size_t` for sizes; avoid signed/unsigned comparison warnings.

## malloc — Always Check Return Value

```c
// WRONG — NULL dereference on allocation failure
char *buf = malloc(size);
memcpy(buf, src, size);

// CORRECT
char *buf = malloc(size);
if (!buf) {
    log_error("malloc(%zu) failed", size);
    return ERR_NOMEM;
}
memcpy(buf, src, size);
```

## Paired malloc / free

Every `malloc` must have a corresponding `free`. Use the `goto cleanup` pattern to ensure cleanup on all exit paths (see `rules/c/patterns.md`).

Do not double-free: after `free(ptr)`, immediately set `ptr = NULL`.

```c
free(buf);
buf = NULL;
```

## Input Validation

Validate all externally-sourced values before use:

```c
ErrorCode process_age(int age) {
    if (age < 0 || age > 150) {
        return ERR_INVALID;
    }
    /* ... */
}
```

## Compiler Security Flags

Enable hardening flags for production builds:

```makefile
CFLAGS_RELEASE = -D_FORTIFY_SOURCE=2 -fstack-protector-strong \
                 -Wformat -Wformat-security -fPIE
LDFLAGS_RELEASE = -pie -Wl,-z,relro,-z,now
```

## Sanitizers

Enable in test/CI builds (see `rules/c/testing.md`):

```makefile
CFLAGS_TEST = -fsanitize=address,undefined -g -O1
```

Run `valgrind --leak-check=full` for comprehensive memory safety checking.
