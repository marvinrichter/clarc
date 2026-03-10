---
name: rust-web-patterns
description: Axum HTTP handlers, Serde serialization, async channels, iterator patterns, trait objects, configuration, and WebAssembly target for Rust web services.
---

# Rust Web Patterns

Reference for Rust patterns specific to web services and system integration: iterator adaptors, trait objects, async message passing with Tokio channels, Axum HTTP handlers, Serde serialization, configuration loading, and WASM compilation targets.

## When to Activate

- Building HTTP APIs with Axum
- Designing async message passing with Tokio channels
- Serializing/deserializing data with Serde
- Using iterator adaptors (filter_map, flat_map, partition, custom Iterator)
- Choosing between `dyn Trait` and generics (static vs dynamic dispatch)
- Compiling Rust to WebAssembly (wasm-bindgen, WASI)
- Loading app configuration from files + environment variables

> For ownership, error handling, builder pattern, async runtime setup (Tokio), repository pattern, and testing — see skill `rust-patterns`.

## Iterator Patterns

Rust iterators are lazy, zero-cost abstractions. Prefer them over explicit loops.

```rust
// Chaining iterator adaptors
let active_emails: Vec<String> = users
    .iter()
    .filter(|u| u.is_active)
    .filter_map(|u| u.email.as_deref())  // skip None, unwrap Some
    .map(|e| e.to_lowercase())
    .collect();

// fold — reduce to single value
let total: f64 = orders
    .iter()
    .map(|o| o.amount)
    .fold(0.0, |acc, x| acc + x);

// zip — combine two iterators
let pairs: Vec<_> = names.iter().zip(scores.iter()).collect();

// flat_map — flatten nested iterables
let all_tags: Vec<&str> = posts
    .iter()
    .flat_map(|p| p.tags.iter().map(|t| t.as_str()))
    .collect();

// partition — split into two Vecs
let (active, inactive): (Vec<_>, Vec<_>) = users
    .into_iter()
    .partition(|u| u.is_active);

// Custom iterator
struct Counter { count: usize, max: usize }

impl Iterator for Counter {
    type Item = usize;
    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}
```

## Trait Objects vs Generics

```rust
// Static dispatch (generics): monomorphized, zero overhead, larger binary
fn notify_all<N: Notifier>(notifiers: &[N], msg: &str) {
    for n in notifiers { n.notify(msg); }
}

// Dynamic dispatch (trait objects): flexible, one runtime vtable lookup per call
fn notify_all(notifiers: &[Box<dyn Notifier>], msg: &str) {
    for n in notifiers { n.notify(msg); }  // dyn dispatch
}

// When to use dyn Trait:
// - Collection of heterogeneous types (Vec<Box<dyn Notifier>>)
// - Return type where concrete type varies at runtime
// - Reducing compile time / binary size for complex generics

// Object-safe trait requirements:
// - No associated types that vary per impl (unless via where clauses)
// - No Self in return position (unless behind pointer)
// - No generics on methods (use Box<dyn Fn(...)> instead)

// Service registry pattern
struct App {
    handlers: HashMap<String, Box<dyn Handler>>,
}

impl App {
    fn register(&mut self, route: &str, handler: impl Handler + 'static) {
        self.handlers.insert(route.to_string(), Box::new(handler));
    }
}
```

## Channels and Message Passing

```rust
use tokio::sync::{mpsc, oneshot, broadcast};

// mpsc — multi-producer, single-consumer (work queue)
async fn worker_pool() {
    let (tx, mut rx) = mpsc::channel::<Job>(100);

    for id in 0..4 {
        let mut rx_clone = tx.clone();  // Each worker gets a sender
        tokio::spawn(async move {
            while let Some(job) = rx.recv().await {
                process_job(job).await;
            }
        });
    }

    tx.send(Job::new()).await.unwrap();
}

// oneshot — single response channel (request-response)
async fn request_response() {
    let (resp_tx, resp_rx) = oneshot::channel::<String>();

    tokio::spawn(async move {
        let result = do_work().await;
        resp_tx.send(result).ok();
    });

    let response = resp_rx.await.unwrap();
}

// broadcast — fan-out to multiple consumers
async fn event_bus() {
    let (tx, _) = broadcast::channel::<Event>(32);
    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tokio::spawn(async move {
        while let Ok(event) = rx1.recv().await { handle(event); }
    });

    tx.send(Event::UserCreated { id: 1 }).unwrap();
}
```

## Axum HTTP Patterns

```rust
use axum::{
    extract::{Path, Query, State, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

// Shared application state
#[derive(Clone)]
struct AppState {
    db: PgPool,
    config: Arc<Config>,
}

// Route setup
fn router(state: AppState) -> Router {
    Router::new()
        .route("/users",     get(list_users).post(create_user))
        .route("/users/:id", get(get_user).delete(delete_user))
        .with_state(state)
}

// Handler — returns impl IntoResponse
async fn get_user(
    Path(id): Path<i64>,
    State(state): State<AppState>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await
        .map_err(AppError::Db)?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user))
}

// Typed error response
#[derive(Debug)]
enum AppError {
    NotFound,
    Db(sqlx::Error),
    Validation(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound      => (StatusCode::NOT_FOUND, "not found".to_string()),
            AppError::Db(e)         => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::Validation(m) => (StatusCode::UNPROCESSABLE_ENTITY, m),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}
```

## Serde Patterns

```rust
use serde::{Deserialize, Serialize};

// Rename fields for JSON
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateUserRequest {
    first_name: String,  // serialized as "firstName"
    last_name:  String,  // serialized as "lastName"
    email_address: String,
}

// Skip fields, defaults, aliases
#[derive(Serialize, Deserialize)]
struct User {
    id: i64,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    bio: Option<String>,
    #[serde(default = "default_role")]
    role: String,
    #[serde(skip)]
    password_hash: String,
}

fn default_role() -> String { "user".to_string() }

// Tagged enums — great for discriminated unions in JSON
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum Event {
    UserCreated { user_id: i64, email: String },
    OrderPlaced { order_id: i64, amount: f64 },
    OrderShipped { order_id: i64, tracking: String },
}

// JSON: { "type": "user_created", "user_id": 1, "email": "..." }

// Custom serialization
use serde::{Serializer, Deserializer};

fn serialize_money<S: Serializer>(cents: &i64, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&format!("{:.2}", *cents as f64 / 100.0))
}
```

## Configuration Pattern

```rust
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub server: ServerConfig,
    pub log_level: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        let cfg = Config::builder()
            .add_source(File::with_name("config/default"))
            .add_source(File::with_name("config/local").required(false))
            // Environment variables override: APP_DATABASE_URL → database_url
            .add_source(Environment::with_prefix("APP").separator("_"))
            .build()?;
        cfg.try_deserialize()
    }
}
```

## WebAssembly Target

When compiling Rust to WASM, these patterns apply:

```toml
# Cargo.toml — WASM library
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"

[profile.release]
opt-level = "s"    # Size over speed
lto = true
panic = "abort"    # No unwinding — required for WASM
```

```rust
use wasm_bindgen::prelude::*;

// Mark public API for JS export
#[wasm_bindgen]
pub fn process(data: &[u8]) -> Result<Vec<u8>, JsError> {
    // Return Result — wasm-bindgen converts Err to JS exception
    inner_process(data).map_err(|e| JsError::new(&e.to_string()))
}

// Set up panic hook in init (panics show as useful messages in JS console)
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}
```

**Key differences from native Rust:**
- No threads by default (use `wasm-bindgen-rayon` for threading)
- `panic = "abort"` — no stack unwinding, `.unwrap()` crashes the whole module
- `std::time` unavailable — use `js-sys::Date` or inject time via JS
- File system unavailable in browser (use WASI for CLI/server WASM)

> Full patterns, JS integration, WASI, and Component Model: see skill `wasm-patterns`.

## Dependency Quick Reference

| Need | Crate |
|------|-------|
| Async runtime | `tokio` |
| HTTP server | `axum` |
| HTTP client | `reqwest` |
| Database (Postgres) | `sqlx` |
| Serialization | `serde`, `serde_json` |
| Typed errors | `thiserror` |
| Application errors | `anyhow` |
| Logging | `tracing`, `tracing-subscriber` |
| Config | `config`, `dotenvy` |
| Property tests | `proptest` |
| Mocking | `mockall` |
| Benchmarks | `criterion` |
| Security audit | `cargo-audit` |
| Faster test runner | `cargo-nextest` |
| Formatting | `rustfmt` |
| Linting | `clippy` |

> For testing patterns — unit tests with mockall, integration tests with sqlx, HTTP handler testing (axum), benchmarks (criterion), fuzzing (cargo-fuzz), and CI/CD — see skill: `rust-testing`.
