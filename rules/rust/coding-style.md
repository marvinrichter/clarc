---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "**/Cargo.lock"
---
# Rust Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Rust specific content.

## Formatting

- **rustfmt** is mandatory — run `cargo fmt` before every commit
- **clippy** is mandatory — run `cargo clippy -- -D warnings` (warnings as errors)

## Ownership & Borrowing

- Prefer borrowing (`&T`, `&mut T`) over cloning unless ownership transfer is semantically correct
- Avoid `clone()` in hot paths — profile first
- Use `Cow<str>` when a function sometimes borrows and sometimes owns

## Error Handling

Use `?` operator with typed errors — never `.unwrap()` in production code:

```rust
// WRONG: panics in production
let value = map.get("key").unwrap();

// CORRECT: propagate with context
use anyhow::Context;
let value = map.get("key").context("missing required key")?;
```

Prefer `thiserror` for library errors, `anyhow` for application errors:

```rust
// Library crate
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("invalid token: {0}")]
    InvalidToken(String),
    #[error("token expired")]
    Expired,
}

// Application crate
fn run() -> anyhow::Result<()> { ... }
```

## Immutability

Rust enforces immutability by default — lean into it:

```rust
// CORRECT: explicit mutation
let mut counter = 0;
counter += 1;

// Prefer iterator chains over mutable accumulation
let sum: i32 = values.iter().sum();
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Types, Traits, Enums | `UpperCamelCase` | `UserService` |
| Functions, methods, variables | `snake_case` | `get_user_by_id` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES` |
| Modules | `snake_case` | `auth_handler` |
| Lifetimes | short lowercase | `'a`, `'db` |

## Reference

See skill: `rust-patterns` for comprehensive Rust idioms, async patterns, and architectural guidance.
