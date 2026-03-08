---
name: c-patterns
description: "C programming patterns (C11/C17): opaque pointer encapsulation, error handling via return codes and out-parameters, resource cleanup with goto, memory management discipline (malloc/free pairing, double-free prevention), safe string functions (snprintf, fgets, strncpy), Makefile patterns with auto-dependencies, bit manipulation, and AddressSanitizer/Valgrind integration. Use when writing or reviewing C code."
---

# C Patterns

## When to Activate

- Writing C source files (`.c`, `.h`)
- Designing C module APIs (opaque pointers, error codes)
- Reviewing C code for memory safety
- Setting up a C project with Makefile or CMake

---

## Opaque Pointer — Module Encapsulation

The fundamental C encapsulation pattern. Callers see the type name but not its fields.

```c
/* --- queue.h (public API) --- */
#ifndef QUEUE_H
#define QUEUE_H

#include <stddef.h>
#include "errors.h"

typedef struct Queue Queue;

Queue    *queue_new(size_t capacity);
void      queue_free(Queue *q);
ErrorCode queue_push(Queue *q, const void *item, size_t item_size);
ErrorCode queue_pop(Queue *q, void *out, size_t max_size);
size_t    queue_size(const Queue *q);

#endif

/* --- queue.c (private implementation) --- */
struct Queue {
    void   **items;
    size_t   capacity;
    size_t   head;
    size_t   tail;
    size_t   count;
};

Queue *queue_new(size_t capacity) {
    Queue *q = malloc(sizeof(Queue));
    if (!q) return NULL;

    q->items = malloc(capacity * sizeof(void *));
    if (!q->items) { free(q); return NULL; }

    q->capacity = capacity;
    q->head = q->tail = q->count = 0;
    return q;
}

void queue_free(Queue *q) {
    if (!q) return;
    free(q->items);
    free(q);
}
```

---

## Error Code Pattern

Define an enum for all error states; return it from every fallible function:

```c
/* errors.h */
typedef enum {
    ERR_OK        =  0,
    ERR_NOMEM     = -1,   /* malloc returned NULL */
    ERR_INVALID   = -2,   /* bad argument */
    ERR_NOT_FOUND = -3,
    ERR_IO        = -4,
    ERR_OVERFLOW  = -5,
    ERR_TIMEOUT   = -6
} ErrorCode;

const char *err_str(ErrorCode rc);  /* human-readable string */
```

```c
/* Usage pattern — check every return value */
Config cfg;
ErrorCode rc = config_parse("app.conf", &cfg);
if (rc != ERR_OK) {
    fprintf(stderr, "config_parse: %s\n", err_str(rc));
    return rc;
}
```

---

## goto cleanup — Multi-Resource Cleanup

The idiomatic C pattern for safe multi-resource cleanup. Label at the end; jump on failure:

```c
ErrorCode connect_and_send(const char *host, int port, const char *data) {
    int       fd  = -1;
    char     *buf = NULL;
    ErrorCode rc  = ERR_OK;

    fd = socket_connect(host, port);
    if (fd < 0) { rc = ERR_IO; goto cleanup; }

    buf = malloc(SEND_BUF_SIZE);
    if (!buf) { rc = ERR_NOMEM; goto cleanup; }

    if (prepare_packet(data, buf, SEND_BUF_SIZE) != ERR_OK) {
        rc = ERR_INVALID;
        goto cleanup;
    }

    if (send(fd, buf, strlen(buf), 0) < 0) {
        rc = ERR_IO;
        goto cleanup;
    }

cleanup:
    free(buf);          /* free(NULL) is safe */
    if (fd >= 0) close(fd);
    return rc;
}
```

---

## Memory Management Discipline

### malloc / free Pairing Rules

1. Every `malloc` has exactly one matching `free`
2. After `free(ptr)`, immediately set `ptr = NULL` to prevent double-free
3. `free(NULL)` is a no-op — safe to call unconditionally in cleanup
4. Always check `malloc` return value before use

```c
char *buf = malloc(size);
if (!buf) { return ERR_NOMEM; }

/* ... use buf ... */

free(buf);
buf = NULL;   /* prevent dangling pointer */
```

### calloc for Zero-Initialized Memory

```c
/* calloc zeros memory — prefer over malloc+memset for structs */
Node *node = calloc(1, sizeof(Node));
if (!node) return ERR_NOMEM;
```

### realloc Safely

```c
/* WRONG — leaks original buffer if realloc returns NULL */
buf = realloc(buf, new_size);

/* CORRECT — use temporary */
void *tmp = realloc(buf, new_size);
if (!tmp) { free(buf); return ERR_NOMEM; }
buf = tmp;
```

---

## Safe String Functions

| Unsafe | Safe Replacement |
|--------|-----------------|
| `gets` | `fgets(buf, sizeof(buf), stdin)` |
| `sprintf` | `snprintf(buf, sizeof(buf), ...)` |
| `strcpy` | `strncpy(dst, src, sizeof(dst)-1); dst[sizeof(dst)-1]='\0'` |
| `strcat` | `strncat(dst, src, sizeof(dst)-strlen(dst)-1)` |
| `strtok` | `strtok_r` (reentrant) |

```c
/* Safe string copy helper */
static void safe_strcpy(char *dst, const char *src, size_t dst_size) {
    strncpy(dst, src, dst_size - 1);
    dst[dst_size - 1] = '\0';
}
```

---

## Bit Manipulation

```c
#include <stdint.h>

#define BIT(n)          (1u << (n))
#define FLAG_READ       BIT(0)
#define FLAG_WRITE      BIT(1)
#define FLAG_EXECUTE    BIT(2)

/* Test, set, clear, toggle */
#define FLAG_IS_SET(f, flag)    (((f) & (flag)) != 0)
#define FLAG_SET(f, flag)       ((f) |= (flag))
#define FLAG_CLEAR(f, flag)     ((f) &= ~(flag))
#define FLAG_TOGGLE(f, flag)    ((f) ^= (flag))

/* Portable endian conversion */
uint32_t be32_to_cpu(uint32_t be) {
    const uint8_t *p = (const uint8_t *)&be;
    return ((uint32_t)p[0] << 24) |
           ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] <<  8) |
           ((uint32_t)p[3]);
}
```

---

## Makefile with Auto-Dependencies

```makefile
CC      = gcc
CFLAGS  = -std=c11 -Wall -Wextra -Wpedantic -Werror
CFLAGS += -MMD -MP           # generate .d dependency files

SRCS    = $(wildcard src/*.c)
OBJS    = $(SRCS:src/%.c=build/%.o)
DEPS    = $(OBJS:.o=.d)

-include $(DEPS)             # include generated dependencies

.PHONY: all test clean

all: build/app

build/%.o: src/%.c | build
	$(CC) $(CFLAGS) -Isrc -c $< -o $@

build/app: $(OBJS)
	$(CC) $(CFLAGS) $^ -o $@

# Test target with sanitizers
test: CFLAGS += -fsanitize=address,undefined -g -O1
test: build/test_runner
	./build/test_runner

build:
	@mkdir -p $@

clean:
	$(RM) -r build
```

---

## AddressSanitizer + Valgrind

### AddressSanitizer (compile-time, fast)

```makefile
CFLAGS_ASAN = -fsanitize=address,undefined -g -O1 -fno-omit-frame-pointer
```

Detects: heap-use-after-free, stack-buffer-overflow, global-buffer-overflow,
use-after-return, use-after-scope, undefined behavior.

### Valgrind (runtime, comprehensive)

```bash
valgrind \
  --leak-check=full \
  --show-leak-kinds=all \
  --track-origins=yes \
  --error-exitcode=1 \
  ./build/test_runner
```

Use ASan in CI (fast), Valgrind locally for deep debugging.

---

## Anti-Patterns

| Anti-Pattern | Problem | Better |
|---|---|---|
| `gets(buf)` | No bounds check, undefined behavior | `fgets(buf, sizeof(buf), stdin)` |
| `sprintf(buf, ...)` without size | Buffer overflow | `snprintf(buf, sizeof(buf), ...)` |
| Ignoring `malloc` return | NULL dereference | Always check, return `ERR_NOMEM` |
| Double-free | Undefined behavior, security hole | Set `ptr = NULL` after `free` |
| User input as `printf` format | Format string attack | `printf("%s", user_input)` |
| Signed/unsigned comparison | Subtle bugs | Use `size_t` for sizes throughout |
| Magic numbers | Unreadable | Named `#define` constants |
