---
description: C code review for memory safety, C11/C17 idioms, opaque pointer patterns, and error handling. Invokes the c-reviewer agent.
---

# C Code Review

This command invokes the **c-reviewer** agent for C-specific code review.

## What This Command Does

1. **Identify C Changes**: Find modified `.c` and `.h` files via `git diff`
2. **Memory Safety**: malloc/free discipline, double-free, use-after-free, buffer overflows
3. **Error Handling**: Return code checking, goto-cleanup patterns
4. **API Design**: Opaque pointer encapsulation, header hygiene
5. **String Safety**: `strncpy`/`strncat` usage, format string vulnerabilities
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying C code
- Before committing C changes
- Reviewing systems or embedded code
- Checking memory management correctness

## Review Categories

### CRITICAL (Must Fix)
- Buffer overflows (fixed-size buffers with unbounded input)
- Double-free or use-after-free
- Format string vulnerabilities (`printf(user_input)`)
- Unchecked `malloc` return (null dereference on allocation failure)
- Integer overflow in size calculations

### HIGH (Should Fix)
- `strcpy`/`strcat` without bounds (use `strncpy`/`strncat` or `strlcpy`/`strlcat`)
- Missing `free` on error paths (resource leak)
- Functions with side effects in assert conditions (stripped in release)
- Ignoring return codes from system calls

### MEDIUM (Consider)
- Exposing struct internals in headers (break opaque pointer encapsulation)
- `malloc` + `memset` instead of `calloc`
- Missing `const` on pointer parameters that don't mutate

## Automated Checks

```bash
gcc -Wall -Wextra -fsanitize=address,undefined -o output source.c
valgrind --leak-check=full ./output
```

## When to Use This vs /code-review

| | `/c-review` | `/code-review` |
|---|---|---|
| **Use when** | C systems/embedded project | Multi-language project or unsure |
| **Reviewer** | c-reviewer (specialist) | code-reviewer → routes to c-reviewer automatically |
| **Output** | C-specific: memory safety, pointer discipline, goto-cleanup | Combined report across all changed languages |

Both invoke the same specialist. Use `/code-review` when changes span multiple languages.

## After This

- `/tdd` — add tests if coverage gaps were flagged

## Related

- Agent: `agents/c-reviewer.md`
- Skills: `skills/c-patterns/`, `skills/c-testing/`
