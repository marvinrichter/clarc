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
# Rust Security

> This file extends [common/security.md](../common/security.md) with Rust specific content.

## Secret Management

```rust
// WRONG: hardcoded secret
let api_key = "sk-abc123";

// CORRECT: environment variable with startup validation
let api_key = std::env::var("API_KEY")
    .expect("API_KEY environment variable must be set");
```

## Unsafe Code

- **Never use `unsafe` without a documented safety invariant**
- Every `unsafe` block must have a `// SAFETY:` comment explaining why it is sound
- Prefer safe abstractions from the standard library or well-audited crates

```rust
// CORRECT: documented safety invariant
// SAFETY: ptr is non-null, properly aligned, and we hold the only reference
let value = unsafe { &*ptr };
```

## Dependency Auditing

```bash
# Install cargo-audit
cargo install cargo-audit

# Check for known vulnerabilities in Cargo.lock
cargo audit

# Check for outdated dependencies
cargo install cargo-outdated
cargo outdated
```

Run `cargo audit` in CI on every PR.

## Integer Overflow

In release builds, integer overflow wraps silently. Use checked arithmetic for user-controlled values:

```rust
// WRONG: panics in debug, wraps silently in release
let result = user_value + offset;

// CORRECT: explicit overflow handling
let result = user_value
    .checked_add(offset)
    .ok_or(AppError::Overflow)?;
```

## Input Validation

- Validate all external input at system boundaries (HTTP handlers, CLI args, file parsing)
- Use strong types to make invalid states unrepresentable:

```rust
// WRONG: raw string passed everywhere
fn create_user(email: String) { ... }

// CORRECT: validated newtype
pub struct Email(String);
impl Email {
    pub fn parse(s: &str) -> Result<Self, ValidationError> {
        if s.contains('@') { Ok(Email(s.to_owned())) }
        else { Err(ValidationError::InvalidEmail) }
    }
}
```

## Cryptography

- Never roll your own crypto
- Use **`ring`** or **`rustls`** for TLS/crypto primitives
- Use **`argon2`** (via `password-hash`) for password hashing
