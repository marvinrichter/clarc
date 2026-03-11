---
name: rust-testing-advanced
description: Advanced Rust testing anti-patterns and corrections — cfg(test) placement, expect() over unwrap(), mockall expectation ordering, executor mixing (#[tokio::test] vs block_on), PgPool isolation with #[sqlx::test].
---

# Rust Testing — Advanced Patterns

This skill extends `rust-testing` with anti-patterns and corrections. Load `rust-testing` first.

## When to Activate

- Reviewing Rust test code for common mistakes
- Debugging flaky tests caused by shared pool state
- Diagnosing mock setup ordering errors (already-moved mock)
- Fixing async test executor mismatches
- Reducing release binary size from mis-placed test code

---

## Anti-Patterns

### Placing Tests Outside #[cfg(test)] in Source Files

**Wrong:**
```rust
// src/domain/discount.rs
pub fn apply_discount(price: f64, tier: CustomerTier) -> f64 { /* ... */ }

#[test]  // Compiles into release builds — wastes binary size
fn standard_no_discount() {
    assert_eq!(apply_discount(100.0, CustomerTier::Standard), 100.0);
}
```

**Correct:**
```rust
pub fn apply_discount(price: f64, tier: CustomerTier) -> f64 { /* ... */ }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_no_discount() {
        assert_eq!(apply_discount(100.0, CustomerTier::Standard), 100.0);
    }
}
```

**Why:** Without `#[cfg(test)]`, test code and its dependencies are compiled into release binaries, increasing binary size and compile time.

### Using unwrap() in Tests Instead of Descriptive Assertions

**Wrong:**
```rust
#[test]
fn save_user() {
    let user = repo.save(&new_user()).await.unwrap(); // Panic message is useless
    assert_eq!(user.email, "alice@test.com");
}
```

**Correct:**
```rust
#[test]
async fn save_user() {
    let user = repo.save(&new_user()).await
        .expect("saving a valid user should not fail");
    assert_eq!(user.email, "alice@test.com");
}
```

**Why:** `expect("context")` produces a meaningful panic message that explains what went wrong at the test boundary, making failures far easier to diagnose.

### Setting Up Mock Expectations After Creating the Service

**Wrong:**
```rust
let service = UserService::new(Arc::new(mock)); // mock moved in
mock.expect_save().returning(|_| Ok(saved_user())); // compile error: already moved
```

**Correct:**
```rust
let mut mock = MockUserRepository::new();
mock.expect_save()
    .times(1)
    .returning(|_| Ok(saved_user()));

let service = UserService::new(Arc::new(mock)); // move after setup
```

**Why:** Expectations must be configured before the mock is moved into the service under test; setting them up first also makes the test intent readable at a glance.

### Running Async Tests with std::thread::block_on Instead of #[tokio::test]

**Wrong:**
```rust
#[test]
fn fetch_returns_user() {
    let result = futures::executor::block_on(service.fetch(1)); // Wrong executor
    assert!(result.is_ok());
}
```

**Correct:**
```rust
#[tokio::test]
async fn fetch_returns_user() {
    let result = service.fetch(1).await;
    assert!(result.is_ok());
}
```

**Why:** Mixing executors causes panics or silent hangs; `#[tokio::test]` provides a proper single-threaded Tokio runtime that matches the runtime used in production.

### Sharing a Single PgPool Across All Integration Tests

**Wrong:**
```rust
// tests/common/mod.rs
static POOL: Lazy<PgPool> = Lazy::new(|| { /* ... */ });
// Tests share state — inserts from one test pollute another
```

**Correct:**
```rust
#[sqlx::test]  // sqlx::test injects a fresh, isolated pool per test
async fn find_by_id_returns_none(pool: PgPool) {
    let repo = PostgresUserRepo::new(pool);
    assert!(repo.find_by_id(9999).await.unwrap().is_none());
}
```

**Why:** `#[sqlx::test]` wraps each test in its own transaction that is rolled back after the test, guaranteeing isolation without manual cleanup.

## Reference

- `rust-testing` — core testing patterns (unit, mocks, integration, benchmarks, CI)
