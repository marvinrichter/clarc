---
paths:
  - "**/*.c"
globs:
  - "**/*.{c,h}"
  - "**/Makefile"
  - "**/CMakeLists.txt"
alwaysApply: false
---

# C Patterns

> This file extends [common/patterns.md](../common/patterns.md) with C specific content.

## Opaque Pointer — Encapsulation

Hide implementation details behind an opaque pointer in the public header:

```c
// user.h — public interface
typedef struct User User;

User    *user_new(const char *name, int age);
void     user_free(User *u);
int      user_get_age(const User *u);
const char *user_get_name(const User *u);

// user.c — private implementation
struct User {
    char name[64];
    int  age;
    time_t created_at;
    /* internal fields hidden from callers */
};

User *user_new(const char *name, int age) {
    User *u = malloc(sizeof(User));
    if (!u) return NULL;
    strncpy(u->name, name, sizeof(u->name) - 1);
    u->name[sizeof(u->name) - 1] = '\0';
    u->age = age;
    u->created_at = time(NULL);
    return u;
}
```

## Error Handling — Return Codes + Out-Parameters

```c
typedef enum {
    ERR_OK        = 0,
    ERR_NOMEM     = -1,
    ERR_INVALID   = -2,
    ERR_NOT_FOUND = -3,
    ERR_IO        = -4
} ErrorCode;

// Primary result via out-parameter; error code as return value
ErrorCode config_parse(const char *path, Config *out);

// Usage
Config cfg;
ErrorCode rc = config_parse("app.conf", &cfg);
if (rc != ERR_OK) {
    log_error("config_parse failed: %d", rc);
    return rc;
}
```

## Resource Cleanup: goto pattern

Avoids deeply nested cleanup logic:

```c
ErrorCode process(const char *input_path, const char *output_path) {
    FILE     *in  = NULL;
    FILE     *out = NULL;
    char     *buf = NULL;
    ErrorCode rc  = ERR_OK;

    in = fopen(input_path, "r");
    if (!in) { rc = ERR_IO; goto cleanup; }

    out = fopen(output_path, "w");
    if (!out) { rc = ERR_IO; goto cleanup; }

    buf = malloc(BUF_SIZE);
    if (!buf) { rc = ERR_NOMEM; goto cleanup; }

    /* ... processing ... */

cleanup:
    free(buf);
    if (out) fclose(out);
    if (in)  fclose(in);
    return rc;
}
```

## Safe String Handling

Always use length-limited variants:

```c
// WRONG — no bounds check
strcpy(dst, src);
sprintf(buf, "Hello %s", name);
gets(line);  // NEVER use — removed in C11

// CORRECT
strncpy(dst, src, sizeof(dst) - 1);
dst[sizeof(dst) - 1] = '\0';

snprintf(buf, sizeof(buf), "Hello %s", name);

fgets(line, sizeof(line), stdin);
```

## Bit Manipulation

Use explicit types and masks:

```c
#include <stdint.h>

#define FLAG_READ    (1u << 0)
#define FLAG_WRITE   (1u << 1)
#define FLAG_EXECUTE (1u << 2)

void set_flag(uint32_t *flags, uint32_t flag)   { *flags |= flag; }
void clear_flag(uint32_t *flags, uint32_t flag) { *flags &= ~flag; }
bool has_flag(uint32_t flags, uint32_t flag)    { return (flags & flag) != 0; }
```

## Makefile Conventions

```makefile
CC      = gcc
CFLAGS  = -std=c11 -Wall -Wextra -Wpedantic -Werror
CFLAGS += -MMD -MP  # auto-generate dependency files

SRCS    = $(wildcard src/*.c)
OBJS    = $(patsubst src/%.c, build/%.o, $(SRCS))
DEPS    = $(OBJS:.o=.d)

-include $(DEPS)

.PHONY: all clean test

all: build/app

build/%.o: src/%.c | build
	$(CC) $(CFLAGS) -Isrc -c $< -o $@

build/app: $(OBJS)
	$(CC) $(CFLAGS) $^ -o $@

build:
	mkdir -p build

test: CFLAGS += -fsanitize=address,undefined -g
test: build/test_runner
	./build/test_runner

clean:
	rm -rf build
```

## Reference

For memory safety and sanitizers see `skills/c-patterns`.
For Unity and CMocka testing see `skills/c-testing`.
