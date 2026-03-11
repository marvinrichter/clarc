---
description: Run Rust tests with coverage. Enforces TDD workflow with table-driven tests and 80%+ coverage via cargo test and cargo tarpaulin.
---

# Rust Test

Run the full Rust test suite with coverage reporting.

## Step 1 — Run Tests

```bash
cargo test 2>&1
```

For specific tests: `cargo test test_name -- --nocapture`

## Step 2 — Check Coverage

```bash
cargo tarpaulin --out Stdout 2>/dev/null || cargo test
```

Target: **80%+ line coverage**. If tarpaulin is not installed: `cargo install cargo-tarpaulin`.

## Step 3 — Interpret Results

- **All pass, coverage ≥ 80%** — Approve
- **All pass, coverage 70–79%** — Warning; add tests before merge
- **Compile errors** — Run `/rust-build` first
- **Test failures** — Fix root cause; do not skip tests

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

## After This

- `/rust-review` — review code quality after tests are green
- `/verify` — run full build + tests before committing
