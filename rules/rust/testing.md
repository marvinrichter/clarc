---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "**/Cargo.lock"
globs:
  - "**/*.rs"
  - "**/Cargo.{toml,lock}"
alwaysApply: false
---
# Rust Testing

> This file extends [common/testing.md](../common/testing.md) with Rust specific content.

## Framework

Use the built-in `#[test]` framework for unit tests. Use **`cargo nextest`** for faster parallel test execution in CI.

## Test Organization

Co-locate unit tests with the code they test in a `#[cfg(test)]` module:

```rust
pub fn add(a: i32, b: i32) -> i32 { a + b }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_positive_numbers() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn add_negative_numbers() {
        assert_eq!(add(-1, -1), -2);
    }
}
```

Integration tests go in `tests/` at the crate root (only test public API).

## Coverage

```bash
# Install tarpaulin (Linux/macOS)
cargo install cargo-tarpaulin

# Run with coverage report
cargo tarpaulin --out Html --output-dir coverage/
```

Minimum: **80%** line coverage.

## Async Tests

Use `tokio::test` for async code:

```rust
#[tokio::test]
async fn test_fetch_user() {
    let result = fetch_user(1).await;
    assert!(result.is_ok());
}
```

## Property-Based Testing

Use **`proptest`** or **`quickcheck`** for invariant testing:

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn parse_then_serialize_roundtrips(s in "[a-z]{1,20}") {
        let parsed = parse(&s).unwrap();
        assert_eq!(serialize(&parsed), s);
    }
}
```

## Race Detection

```bash
# Run with ThreadSanitizer (nightly only)
RUSTFLAGS="-Z sanitizer=thread" cargo +nightly test --target x86_64-unknown-linux-gnu
```

## Reference

See the [Rust Book — Testing](https://doc.rust-lang.org/book/ch11-00-testing.html) and `cargo nextest` docs for CI configuration.
