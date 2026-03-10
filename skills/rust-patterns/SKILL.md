---
name: rust-patterns
description: Idiomatic Rust patterns, ownership idioms, async with Tokio, error handling with thiserror/anyhow, testing strategies, and hexagonal architecture in Rust.
---

# Rust Patterns

Comprehensive reference for idiomatic Rust covering ownership, error handling, async, architecture, and testing patterns.

## When to Activate

- Writing new Rust code or reviewing existing code
- Designing error handling strategy (thiserror vs anyhow)
- Setting up async with Tokio
- Structuring a Rust application (hexagonal, domain-driven)
- Writing tests (unit, integration, property-based)
- Optimizing performance (avoiding clones, choosing data structures)

> For Axum HTTP, Serde, async channels, iterators, trait objects, and WASM — see skill `rust-web-patterns`.

## Core Ownership Patterns

### Borrowing Over Cloning

```rust
// WRONG: unnecessary allocation in hot path
fn process(data: Vec<u8>) -> usize { data.len() }

// CORRECT: borrow — zero cost
fn process(data: &[u8]) -> usize { data.len() }

// CORRECT: Cow when sometimes you own, sometimes you borrow
use std::borrow::Cow;
fn normalize(s: &str) -> Cow<str> {
    if s.contains(' ') { Cow::Owned(s.replace(' ', "_")) }
    else               { Cow::Borrowed(s) }
}
```

### Interior Mutability

```rust
use std::cell::RefCell;
use std::sync::{Arc, Mutex, RwLock};

// Single-threaded shared mutation
let shared = Rc::new(RefCell::new(vec![1, 2, 3]));
shared.borrow_mut().push(4);

// Multi-threaded: prefer RwLock for read-heavy workloads
let config: Arc<RwLock<Config>> = Arc::new(RwLock::new(Config::default()));
let value = config.read().unwrap().timeout;
```

## Error Handling

### Library vs Application Errors

```rust
// Library crate: typed errors with thiserror
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("invalid token: {0}")]
    InvalidToken(String),
    #[error("token expired at {expired_at}")]
    Expired { expired_at: chrono::DateTime<chrono::Utc> },
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

// Application crate: anyhow for ergonomic error propagation
fn run() -> anyhow::Result<()> {
    let config = load_config().context("failed to load config")?;
    start_server(config).context("server failed")?;
    Ok(())
}
```

### Error Conversion Hierarchy

```
User-facing (anyhow::Error)
  └── Domain (thiserror enums — typed, structured)
       └── Infrastructure (sqlx::Error, reqwest::Error via #[from])
```

### Never Unwrap in Production

```rust
// WRONG: panics in production, confusing error messages
let val = map.get("key").unwrap();
let n: i32 = "42".parse().unwrap();

// CORRECT: propagate with context
let val = map.get("key").context("missing required config key 'key'")?;
let n: i32 = s.parse().with_context(|| format!("invalid number: {s}"))?;
```

## Builder Pattern

```rust
#[derive(Default)]
pub struct ClientBuilder {
    base_url: String,
    timeout_secs: u64,
    retries: u32,
    api_key: Option<String>,
}

impl ClientBuilder {
    pub fn base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into(); self
    }
    pub fn timeout(mut self, secs: u64) -> Self {
        self.timeout_secs = secs; self
    }
    pub fn api_key(mut self, key: impl Into<String>) -> Self {
        self.api_key = Some(key.into()); self
    }
    pub fn build(self) -> Result<Client, BuildError> {
        if self.base_url.is_empty() {
            return Err(BuildError::MissingBaseUrl);
        }
        Ok(Client { inner: self })
    }
}

// Usage — fluent, compile-time checked
let client = ClientBuilder::default()
    .base_url("https://api.example.com")
    .timeout(30)
    .build()?;
```

## Newtype Pattern

Make invalid states unrepresentable at zero runtime cost:

```rust
pub struct UserId(u64);
pub struct OrderId(u64);

impl UserId {
    pub fn new(id: u64) -> Self { Self(id) }
    pub fn value(&self) -> u64 { self.0 }
}

// Compiler prevents: get_order(order_id, user_id)  ← argument order mistake
fn get_order(user: UserId, order: OrderId) -> Result<Order, Error> { ... }
```

## State Machine via Type System

```rust
pub struct Pending;
pub struct Approved;
pub struct Rejected;

pub struct Order<State> {
    id: OrderId,
    amount: Money,
    _state: std::marker::PhantomData<State>,
}

impl Order<Pending> {
    pub fn approve(self, by: UserId) -> Order<Approved> {
        Order { id: self.id, amount: self.amount, _state: PhantomData }
    }
    pub fn reject(self, reason: String) -> Order<Rejected> { ... }
}

// Only approved orders can be fulfilled — enforced at compile time
impl Order<Approved> {
    pub fn fulfill(&self) -> Result<Shipment, Error> { ... }
}
```

## Async with Tokio

```rust
// Entry point
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pool = PgPool::connect(&std::env::var("DATABASE_URL")?).await?;
    let app = build_router(pool);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}

// Concurrent tasks — run independently
let (users, products) = tokio::join!(
    fetch_users(&pool),
    fetch_products(&pool),
);

// Spawn background task
tokio::spawn(async move {
    loop {
        cleanup_expired_sessions(&pool).await.ok();
        tokio::time::sleep(Duration::from_secs(300)).await;
    }
});

// Timeout
use tokio::time::{timeout, Duration};
let result = timeout(Duration::from_secs(5), fetch_user(id))
    .await
    .context("request timed out")?;
```

## Repository Pattern

```rust
use async_trait::async_trait;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: UserId) -> Result<Option<User>, DbError>;
    async fn find_by_email(&self, email: &Email) -> Result<Option<User>, DbError>;
    async fn save(&self, user: &User) -> Result<User, DbError>;
    async fn delete(&self, id: UserId) -> Result<(), DbError>;
}

pub struct PostgresUserRepo { pool: PgPool }

#[async_trait]
impl UserRepository for PostgresUserRepo {
    async fn find_by_id(&self, id: UserId) -> Result<Option<User>, DbError> {
        sqlx::query_as!(User,
            "SELECT id, email, name, created_at FROM users WHERE id = $1",
            id.value() as i64
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(DbError::from)
    }
    // ...
}
```

## Module & Package Structure

```
src/
  main.rs              # DI wiring: connect everything, start server
  lib.rs               # Public API (re-exports for integration tests)
  domain/              # Pure types + behavior — zero infrastructure imports
    mod.rs
    user.rs            # User struct, domain methods, validation
    order.rs
  application/         # Use cases — depend on domain + port traits
    mod.rs
    user_service.rs    # UserService uses UserRepository trait
    order_service.rs
  infrastructure/      # Adapters — implement port traits
    mod.rs
    db/
      postgres_user_repo.rs
    http/
      reqwest_client.rs
  handler/             # Inbound adapters — HTTP routes, CLI
    mod.rs
    user_handler.rs
    health_handler.rs
```

## Testing Patterns

### Unit Tests (co-located)

```rust
pub fn calculate_discount(price: f64, tier: CustomerTier) -> f64 {
    match tier {
        CustomerTier::Standard => price,
        CustomerTier::Premium  => price * 0.9,
        CustomerTier::Vip      => price * 0.8,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vip_gets_20_percent_discount() {
        assert_eq!(calculate_discount(100.0, CustomerTier::Vip), 80.0);
    }

    #[test]
    fn standard_gets_no_discount() {
        assert_eq!(calculate_discount(100.0, CustomerTier::Standard), 100.0);
    }
}
```

### Integration Tests (tests/ directory)

```rust
// tests/user_api.rs — tests public API only
use myapp::UserService;
use myapp::infrastructure::InMemoryUserRepo;

#[tokio::test]
async fn create_user_returns_id() {
    let repo = Arc::new(InMemoryUserRepo::new());
    let svc = UserService::new(repo);
    let user = svc.create(NewUser { email: "test@example.com".into() }).await.unwrap();
    assert!(user.id.value() > 0);
}
```

### Property-Based Tests

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn email_roundtrip(local in "[a-z]{1,20}", domain in "[a-z]{2,10}") {
        let s = format!("{local}@{domain}.com");
        let email = Email::parse(&s).unwrap();
        assert_eq!(email.as_str(), s);
    }
}
```

## Performance Checklist

- [ ] Avoid `.clone()` in hot paths — use borrows (`&T`, `&str`, `&[T]`)
- [ ] Use `String::with_capacity(n)` when final size is known
- [ ] Prefer `Vec::with_capacity(n)` over repeated `push()`
- [ ] Use `Arc<T>` only when shared ownership is genuinely needed
- [ ] Profile with `cargo flamegraph` before optimizing
- [ ] Use `criterion` for micro-benchmarks

> For Axum HTTP handlers, Serde, async channels, iterator patterns, trait objects, and WASM — see skill `rust-web-patterns`.
> For advanced async patterns (cancellation, select!, actor model, backpressure) — see skill `async-patterns`.
