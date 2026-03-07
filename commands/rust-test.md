---
description: Run Rust tests with coverage. Enforces TDD workflow with table-driven tests and 80%+ coverage via cargo test and cargo tarpaulin.
---

# Rust Test

Run the full Rust test suite with coverage reporting.

## What This Command Does

1. **Run Tests**: Execute `cargo test` with output capture
2. **Race Detection**: Run with `--test-threads=1` if race conditions suspected
3. **Coverage**: Measure coverage with `cargo tarpaulin` if installed
4. **Property Tests**: Identify and run proptest/quickcheck suites

## Diagnostic Commands

```bash
# Run all tests
cargo test 2>&1

# Run specific test
cargo test test_name 2>&1

# Run with output shown (don't capture stdout)
cargo test -- --nocapture 2>&1

# Coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Stdout 2>/dev/null || cargo test

# Race detection (nightly only)
# cargo +nightly test -Z sanitizer=thread 2>&1 | head -40

# Next test runner (faster parallel execution)
cargo nextest run 2>/dev/null || cargo test
```

## TDD Workflow

1. Write failing test first (RED)
2. Run: `cargo test test_name` — must FAIL
3. Implement minimal code (GREEN)
4. Run: `cargo test test_name` — must PASS
5. Refactor and run full suite
6. Verify coverage ≥ 80%

## Test Organization

```
src/
  lib.rs           # Module code
  ...
  #[cfg(test)]
  mod tests {      # Co-located unit tests
    use super::*;
  }

tests/
  integration.rs   # Integration tests (public API only)
```

## Coverage Requirements

- Target: **80%+ line coverage**
- Configure with `cargo-tarpaulin`: `cargo tarpaulin --fail-under 80`

## Approval Criteria

- **Approve**: All tests pass, coverage ≥ 80%
- **Warning**: All tests pass, coverage 70–79%
- **Block**: Any test failures

## Related

- Agent: `agents/rust-reviewer.md`
- Skills: `skills/rust-testing/`, `skills/rust-patterns/`
- Use `/rust-build` if compilation fails first
- Use `/rust-review` for a full code quality review
