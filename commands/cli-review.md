---
description: Review a CLI tool implementation for ergonomics, error handling, exit codes, help text quality, and Unix composability. Applies cli-patterns and cli-ux skills.
---

# CLI Review

Review a CLI tool's implementation for UX quality, composability, and correctness.

## What This Command Checks

**Argument design**
- Required inputs use positional args; optional settings use flags
- Every option has a documented default in `--help`
- Env-var overrides exist for config values

**Error message quality**
- Errors go to stderr, not stdout
- Error messages have an `error:` line and a `hint:` line
- No raw stack traces in user-facing output
- Exit code 2 for usage errors, 1 for runtime errors

**Help text completeness**
- Usage line, one-sentence description, options table with defaults, examples
- Autocomplete command documented

**Unix composability**
- `--json` flag outputs valid JSON to stdout
- `--quiet` suppresses non-error output
- Progress indicators skip when stdout is not a TTY or `--no-progress` is set
- `NO_COLOR` env var is honoured

**Interactive prompt safety**
- TTY check before invoking any interactive prompt
- Non-interactive mode available via flags for CI use

## Steps

1. Identify the entry-point file(s) from `$ARGUMENTS` or by detecting `package.json` scripts, `pyproject.toml`, `main.go`, or `Cargo.toml`
2. Read the entry point and any subcommand files
3. Review against the checklist above
4. Report findings as `[HIGH]`, `[MEDIUM]`, or `[LOW]` with file:line references and fix suggestions
5. Summarize with a verdict

## Reference Skills

- `cli-patterns` — argument design, subcommands, exit codes, testing
- `cli-ux` — error messages, help text, config hierarchy, autocomplete, progress

## After This

- `/tdd` — add tests for CLI commands flagged in review
- `/code-review` — review CLI implementation fixes
