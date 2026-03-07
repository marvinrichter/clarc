---
description: Build Rust code and run Clippy lints. Catches compilation errors and lint warnings with minimal, surgical fixes.
---

# Rust Build and Fix

Run `cargo build` and `cargo clippy` to surface compilation errors and lint warnings.

## What This Command Does

1. **Build**: Run `cargo build` to catch compilation errors
2. **Clippy**: Run `cargo clippy -- -D warnings` to catch lint issues
3. **Fix Incrementally**: Address one error at a time
4. **Verify**: Re-run build after each fix

## Diagnostic Commands

```bash
# Compilation check
cargo build 2>&1 | head -60

# Lints (warnings as errors)
cargo clippy -- -D warnings 2>&1 | head -40

# Check without building binaries (faster)
cargo check 2>&1 | head -40

# Security audit
cargo audit 2>/dev/null || true

# Dependency verification
cargo verify-project 2>/dev/null || true
```

## When to Use

- When `cargo build` fails with errors
- When `cargo clippy` reports warnings
- After pulling changes that break compilation
- Before committing Rust changes

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `cannot find type 'X' in this scope` | Missing import | Add `use module::X;` |
| `mismatched types` | Wrong type passed | Fix caller or update function signature |
| `the trait 'X' is not implemented for 'Y'` | Missing trait impl | Implement trait or use different type |
| `borrow of moved value` | Ownership error | Clone, borrow, or restructure data flow |
| `cannot borrow as mutable` | Mutability violation | Add `mut` or use interior mutability |
| `lifetime may not live long enough` | Lifetime mismatch | Add lifetime annotations or restructure |

## Key Principles

- **Surgical fixes only** — don't refactor, just fix the error
- **Never** add `#[allow(unused)]` without explicit approval
- **Always** run `cargo check` after adding/removing imports
- Fix root cause over suppressing with `#[allow(...)]`

## Related

- Agent: `agents/rust-reviewer.md`
- Skills: `skills/rust-patterns/`, `skills/rust-testing/`
- Use `/rust-review` for a full code quality review
- Use `/rust-test` to run the full test suite
