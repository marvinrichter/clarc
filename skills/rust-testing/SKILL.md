---
name: rust-testing
description: Rust testing patterns — unit tests with mockall, integration tests with sqlx transactions, HTTP handler testing (axum), benchmarks (criterion), property tests (proptest), fuzzing, and CI with cargo-nextest.
---

# Rust Testing Patterns

Comprehensive testing strategies for Rust applications following TDD methodology.

## When to Activate

- Writing unit tests with mock dependencies
- Testing database-dependent code with sqlx
- Testing axum HTTP handlers
- Setting up benchmarks with criterion
- Configuring cargo-nextest in CI/CD

## TDD in Rust

```
RED   → Write a failing #[test]
GREEN → Write minimal implementation
REFACTOR → Improve while keeping tests green
```

## Unit Tests (Co-located)

The idiomatic Rust approach: unit tests live in the same file, in a `#[cfg(test)]` module.

```rust
// src/domain/discount.rs
pub fn apply_discount(price: f64, tier: CustomerTier) -> f64 {
    match tier {
        CustomerTier::Standard => price,
        CustomerTier::Silver   => price * 0.95,
        CustomerTier::Gold     => price * 0.90,
        CustomerTier::Platinum => price * 0.80,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_tier_no_discount() {
        assert_eq!(apply_discount(100.0, CustomerTier::Standard), 100.0);
    }

    #[test]
    fn platinum_tier_20_percent_off() {
        assert_eq!(apply_discount(100.0, CustomerTier::Platinum), 80.0);
    }

    #[test]
    fn discount_rounds_correctly() {
        let result = apply_discount(33.33, CustomerTier::Gold);
        assert!((result - 30.0).abs() < 0.01);
    }
}
```

## Mocking with mockall

```toml
# Cargo.toml
[dev-dependencies]
mockall = "0.13"
```

```rust
// Define trait with #[automock] in production code
use mockall::automock;

#[automock]  // Generates MockUserRepository
#[async_trait::async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, DbError>;
    async fn save(&self, user: &NewUser) -> Result<User, DbError>;
    async fn delete(&self, id: i64) -> Result<(), DbError>;
}

// Test using the generated mock
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;

    #[tokio::test]
    async fn register_user_saves_and_returns_user() {
        let mut mock = MockUserRepository::new();

        mock.expect_save()
            .with(predicate::function(|u: &NewUser| u.email == "alice@test.com"))
            .times(1)
            .returning(|u| Ok(User { id: 1, email: u.email.clone(), name: u.name.clone() }));

        let service = UserService::new(Arc::new(mock));
        let user = service.register("Alice", "alice@test.com").await.unwrap();

        assert_eq!(user.id, 1);
        assert_eq!(user.email, "alice@test.com");
    }

    #[tokio::test]
    async fn register_returns_error_on_db_failure() {
        let mut mock = MockUserRepository::new();

        mock.expect_save()
            .times(1)
            .returning(|_| Err(DbError::ConnectionFailed));

        let service = UserService::new(Arc::new(mock));
        let result = service.register("Alice", "alice@test.com").await;

        assert!(result.is_err());
    }
}
```

### mockall Predicates

```rust
use mockall::predicate::*;

// Exact value
.with(eq(42))
.with(eq("hello"))

// Custom predicate
.with(function(|x: &i32| *x > 0))

// String contains
.with(str::contains("@"))

// Multiple arguments
.with(eq(1), eq("name"))

// Any value (don't care)
.with(always())

// Call count
.times(1)            // exactly once
.times(2..=5)        // 2 to 5 times
.once()              // sugar for .times(1)
.never()             // must not be called
```

## Integration Tests with sqlx

```toml
# Cargo.toml
[dev-dependencies]
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio", "macros", "migrate"] }
tokio = { version = "1", features = ["full"] }
```

```rust
// tests/user_repository_test.rs
use sqlx::PgPool;

// Helper: create an isolated test transaction
async fn setup_db() -> PgPool {
    let url = std::env::var("TEST_DATABASE_URL")
        .expect("TEST_DATABASE_URL must be set for integration tests");
    let pool = PgPool::connect(&url).await.unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

#[sqlx::test]   // sqlx::test handles setup/teardown with isolated transactions
async fn find_user_by_id_returns_none_when_not_found(pool: PgPool) {
    let repo = PostgresUserRepo::new(pool);
    let result = repo.find_by_id(9999).await.unwrap();
    assert!(result.is_none());
}

#[sqlx::test]
async fn save_and_find_by_id(pool: PgPool) {
    let repo = PostgresUserRepo::new(pool);

    let saved = repo.save(&NewUser {
        name: "Alice".to_string(),
        email: "alice@test.com".to_string(),
    }).await.unwrap();

    assert!(saved.id > 0);

    let found = repo.find_by_id(saved.id).await.unwrap();
    assert_eq!(found.unwrap().email, "alice@test.com");
}

#[sqlx::test]
async fn delete_removes_user(pool: PgPool) {
    let repo = PostgresUserRepo::new(pool);

    let user = repo.save(&NewUser { name: "Bob".to_string(), email: "b@test.com".to_string() })
        .await.unwrap();

    repo.delete(user.id).await.unwrap();

    let result = repo.find_by_id(user.id).await.unwrap();
    assert!(result.is_none());
}
```

## HTTP Handler Testing (axum)

```rust
// tests/user_api_test.rs
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;  // oneshot()
use serde_json::{json, Value};

fn test_app() -> axum::Router {
    let state = AppState {
        repo: Arc::new(InMemoryUserRepo::new()),
        config: Arc::new(Config::test()),
    };
    router(state)
}

#[tokio::test]
async fn get_user_returns_200() {
    let app = test_app();

    // Pre-seed data
    let create_resp = app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/users")
                .header("content-type", "application/json")
                .body(Body::from(json!({"name": "Alice", "email": "a@test.com"}).to_string()))
                .unwrap()
        )
        .await
        .unwrap();
    assert_eq!(create_resp.status(), StatusCode::CREATED);
    let body: Value = serde_json::from_slice(
        &axum::body::to_bytes(create_resp.into_body(), usize::MAX).await.unwrap()
    ).unwrap();
    let user_id = body["id"].as_i64().unwrap();

    // Fetch
    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/users/{user_id}"))
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: Value = serde_json::from_slice(
        &axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap()
    ).unwrap();
    assert_eq!(body["name"], "Alice");
}

#[tokio::test]
async fn get_user_returns_404_when_not_found() {
    let app = test_app();
    let response = app
        .oneshot(Request::builder().uri("/users/9999").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
```

## Property-Based Tests (proptest)

```toml
[dev-dependencies]
proptest = "1"
```

```rust
use proptest::prelude::*;

proptest! {
    // Property: parse → serialize → parse is idempotent
    #[test]
    fn email_roundtrip(
        local in "[a-z]{1,20}",
        domain in "[a-z]{2,10}"
    ) {
        let raw = format!("{local}@{domain}.com");
        let email = Email::parse(&raw).unwrap();
        assert_eq!(email.as_str(), raw);
    }

    // Property: sorted is always ordered
    #[test]
    fn sort_is_ordered(mut values: Vec<i32>) {
        values.sort();
        for i in 1..values.len() {
            assert!(values[i-1] <= values[i]);
        }
    }

    // Property: discount never exceeds original price
    #[test]
    fn discount_never_exceeds_price(price in 0.01f64..1_000_000.0) {
        let discounted = apply_discount(price, CustomerTier::Platinum);
        assert!(discounted <= price);
        assert!(discounted >= 0.0);
    }
}
```

## Benchmarks (criterion)

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_bench"
harness = false
```

```rust
// benches/my_bench.rs
use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};

fn bench_sort(c: &mut Criterion) {
    let mut group = c.benchmark_group("sort");

    for size in [10, 100, 1000, 10_000].iter() {
        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, &size| {
            let data: Vec<i32> = (0..size).rev().collect();
            b.iter(|| {
                let mut v = data.clone();
                v.sort();
                black_box(v)
            });
        });
    }
    group.finish();
}

fn bench_string_format(c: &mut Criterion) {
    c.bench_function("format_email", |b| {
        b.iter(|| format!("{}@{}.com", black_box("alice"), black_box("example")))
    });
}

criterion_group!(benches, bench_sort, bench_string_format);
criterion_main!(benches);
```

```bash
# Run benchmarks
cargo bench

# Run specific benchmark
cargo bench -- bench_sort

# Save baseline
cargo bench -- --save-baseline before
# Make changes, then compare
cargo bench -- --baseline before
```

## Test Organization

```
src/
  lib.rs          # #[cfg(test)] mod tests { } — unit tests co-located
  domain/
    user.rs       # unit tests inside
    order.rs

tests/             # Integration tests — only use public API
  common/
    mod.rs        # Shared helpers: setup_db(), build_app()
  user_api.rs     # Full HTTP roundtrip tests
  user_repo.rs    # Repository integration tests

benches/           # criterion benchmarks
  throughput.rs
```

### Shared Test Helpers

```rust
// tests/common/mod.rs
use sqlx::PgPool;

pub async fn test_pool() -> PgPool {
    let url = std::env::var("TEST_DATABASE_URL").unwrap();
    let pool = PgPool::connect(&url).await.unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

pub fn test_user() -> NewUser {
    NewUser {
        name: "Test User".to_string(),
        email: format!("test-{}@example.com", uuid::Uuid::new_v4()),
    }
}
```

## CLI Quick Reference

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run tests in a module
cargo test domain::

# Show println! output
cargo test -- --nocapture

# Run only ignored tests
cargo test -- --ignored

# Parallel test count
cargo test -- --test-threads=4

# Using cargo-nextest (much faster in CI)
cargo nextest run
cargo nextest run --test-threads=8

# With test coverage (llvm-cov)
cargo llvm-cov
cargo llvm-cov --html

# Fuzzing
cargo fuzz add fuzz_target_1
cargo fuzz run fuzz_target_1

# Benchmark
cargo bench
```

## CI/CD with cargo-nextest

```yaml
# .github/workflows/test.yml
- name: Install nextest
  uses: taiki-e/install-action@nextest

- name: Run tests
  run: cargo nextest run --profile ci

- name: Run benchmarks (verify compile)
  run: cargo bench --no-run
```

```toml
# .config/nextest.toml
[profile.ci]
fail-fast = false
test-threads = "num-cpus"
status-level = "fail"
```

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
## Quick Reference
| Scenario | Tool/Pattern |
|----------|-------------|
| Unit test | `#[test]` in `#[cfg(test)]` module |
| Async test | `#[tokio::test]` |
| Mock trait | `mockall::automock` |
| DB integration | `#[sqlx::test]` (isolated transaction) |
| HTTP handler | `axum` + `tower::ServiceExt::oneshot` |
| Property test | `proptest!` macro |
| Benchmark | `criterion` with `criterion_group!` |
| Test output | `cargo test -- --nocapture` |
| Faster CI | `cargo nextest run` |
| Coverage | `cargo llvm-cov` |
