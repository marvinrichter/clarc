---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "**/Cargo.lock"
---
# Rust Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Rust specific content.

## Builder Pattern

Use the builder pattern for structs with many optional fields:

```rust
#[derive(Default)]
pub struct RequestBuilder {
    url: String,
    timeout_secs: u64,
    retries: u32,
}

impl RequestBuilder {
    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = url.into();
        self
    }
    pub fn timeout(mut self, secs: u64) -> Self {
        self.timeout_secs = secs;
        self
    }
    pub fn build(self) -> Result<Request, BuildError> { ... }
}

// Usage
let req = RequestBuilder::default()
    .url("https://api.example.com")
    .timeout(30)
    .build()?;
```

## Newtype Pattern

Wrap primitives to enforce domain invariants at compile time:

```rust
pub struct UserId(u64);
pub struct OrderId(u64);

// Compiler prevents mixing up IDs — no runtime cost
fn get_order(user: UserId, order: OrderId) -> Result<Order, Error> { ... }
```

## State Machine via Enums

Encode state transitions in the type system:

```rust
pub enum Connection {
    Disconnected,
    Connecting { addr: SocketAddr },
    Connected { stream: TcpStream },
}

impl Connection {
    pub fn connect(addr: SocketAddr) -> Self {
        Connection::Connecting { addr }
    }
    // Only valid transition: Connecting -> Connected
    pub fn establish(self) -> Result<Self, Error> {
        match self {
            Connection::Connecting { addr } => Ok(Connection::Connected { stream: TcpStream::connect(addr)? }),
            _ => Err(Error::InvalidState),
        }
    }
}
```

## Repository Pattern

```rust
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: UserId) -> Result<Option<User>, DbError>;
    async fn save(&self, user: &User) -> Result<User, DbError>;
}

pub struct PostgresUserRepository { pool: PgPool }

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn find_by_id(&self, id: UserId) -> Result<Option<User>, DbError> {
        sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id.0)
            .fetch_optional(&self.pool)
            .await
            .map_err(DbError::from)
    }
    // ...
}
```

## Error Handling Hierarchy

```
Application (anyhow::Error — wraps everything)
  └── Domain errors (thiserror — typed, structured)
       └── Infrastructure errors (sqlx::Error, reqwest::Error — wrapped via From)
```

## Async Runtime

Use **Tokio** as the async runtime for applications. Avoid mixing runtimes.

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Application entry point
    Ok(())
}
```

## Module Structure

```
src/
  main.rs          # Entry point, DI wiring
  lib.rs           # Re-exports public API (for library crates)
  domain/          # Pure domain types and logic
    mod.rs
    user.rs
    order.rs
  application/     # Use cases / services (depend on domain + port traits)
    mod.rs
    user_service.rs
  infrastructure/  # Adapters: DB, HTTP clients, external APIs
    mod.rs
    postgres/
    http_client/
  handler/         # Inbound adapters: HTTP routes, CLI commands
    mod.rs
    user_handler.rs
```

## WebAssembly (WASM) Targets

When the crate targets `wasm32-unknown-unknown` or `wasm32-wasi`:

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]  # Required for wasm-pack / browser targets

[profile.release]
opt-level = "s"    # Optimize for binary size
lto = true         # Cross-crate dead code elimination
panic = "abort"    # No unwinding — ~50KB savings, required for WASM targets
```

```rust
use wasm_bindgen::prelude::*;

// Expose to JavaScript
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}

// Return errors as JS exceptions (not panics)
#[wasm_bindgen]
pub fn parse(input: &str) -> Result<JsValue, JsError> {
    let val: serde_json::Value = serde_json::from_str(input)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(serde_wasm_bindgen::to_value(&val)?)
}
```

**WASM-specific rules:**
- Never `.unwrap()` in `#[wasm_bindgen]` functions — panics kill the whole module
- Batch data across the JS↔Wasm boundary — avoid per-element calls in loops
- Memory passed via raw pointer must have a matching `free` export

> For full wasm-pack build workflow, optimization, and JS integration: see `commands/wasm-build.md` and skills `wasm-patterns`, `wasm-performance`.

## Reference

See the [Rust Book](https://doc.rust-lang.org/book/), [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/), and [Tokio docs](https://tokio.rs) for deeper coverage.
