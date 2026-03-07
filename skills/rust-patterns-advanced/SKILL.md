---
name: rust-patterns-advanced
description: "Advanced Rust patterns — zero-cost abstractions, proc macros, unsafe FFI, WASM, Axum web architecture, trait objects vs generics, and performance profiling."
---

# Rust Patterns Advanced

Advanced Rust patterns for performance-critical production systems, FFI, web services, and compile-time metaprogramming.

## When to Activate

- Designing Axum web service architecture (handlers, state, middleware)
- Writing or reviewing unsafe Rust code and FFI bindings
- Implementing proc macros for code generation
- Optimizing performance (flamegraph, criterion benchmarks, SIMD)
- Compiling Rust to WebAssembly (wasm-bindgen)
- Advanced trait patterns: object safety, specialization, sealed traits

## Axum Web Architecture

### Application State & Dependency Injection

```rust
// src/state.rs
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<PgPool>,
    pub redis: Arc<RedisPool>,
    pub config: Arc<Config>,
}

// src/main.rs
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let state = AppState {
        db: Arc::new(PgPoolOptions::new()
            .max_connections(20)
            .connect(&config.database_url).await?),
        redis: Arc::new(RedisPool::new(&config.redis_url)?),
        config: Arc::new(config),
    };

    let app = Router::new()
        .nest("/api/v1", api_router())
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
```

### Extractor Pattern

```rust
// Custom extractor for typed authentication
pub struct AuthenticatedUser {
    pub id: UserId,
    pub email: String,
    pub roles: Vec<Role>,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let token = extract_bearer_token(parts)?;
        let claims = verify_jwt(&token, &app_state.config.jwt_secret)?;
        Ok(AuthenticatedUser {
            id: claims.user_id,
            email: claims.email,
            roles: claims.roles,
        })
    }
}

// Handler using extractor — zero boilerplate
async fn get_profile(
    user: AuthenticatedUser,
    State(state): State<AppState>,
) -> Result<Json<UserProfile>, AppError> {
    let profile = state.db.find_user(user.id).await?;
    Ok(Json(profile.into()))
}
```

### RFC 7807 Error Responses

```rust
// src/errors.rs
use axum::response::{IntoResponse, Response};
use hyper::StatusCode;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ProblemDetails {
    #[serde(rename = "type")]
    pub problem_type: String,
    pub title: String,
    pub status: u16,
    pub detail: String,
    pub instance: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Validation failed")]
    Validation(Vec<ValidationError>),
    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, title, detail) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "Not Found", msg.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized", "Authentication required.".to_string()),
            AppError::Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, "Unprocessable Entity", "See 'errors' for details.".to_string()),
            AppError::Internal(e) => {
                tracing::error!(error = ?e, "Internal server error");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred.".to_string())
            }
        };

        let problem = ProblemDetails {
            problem_type: "about:blank".to_string(),
            title: title.to_string(),
            status: status.as_u16(),
            detail,
            instance: String::new(), // filled by middleware
        };

        (
            status,
            [("content-type", "application/problem+json")],
            axum::Json(problem),
        ).into_response()
    }
}
```

## Advanced Trait Patterns

### Sealed Traits

```rust
// Prevent external implementations of a trait
mod private {
    pub trait Sealed {}
}

pub trait DatabaseDriver: private::Sealed {
    fn connect(&self, url: &str) -> impl Future<Output = Result<Connection>>;
}

pub struct PostgresDriver;
impl private::Sealed for PostgresDriver {}
impl DatabaseDriver for PostgresDriver { /* ... */ }
```

### Trait Objects vs Generics

```rust
// Generics — monomorphized, zero-cost, compile-time dispatch
// Use when: performance critical, homogeneous collections
fn process_all<T: Processor>(items: &[T]) -> Vec<Output> {
    items.iter().map(|i| i.process()).collect()
}

// Trait objects — runtime dispatch, heap allocation
// Use when: heterogeneous collections, plugin systems, late binding
fn apply_middleware(middlewares: &[Box<dyn Middleware>], req: Request) -> Response {
    middlewares.iter().fold(
        Response::default(),
        |resp, mw| mw.handle(req.clone(), resp)
    )
}

// Return-position impl Trait — zero-cost but opaque
fn create_filter(config: &Config) -> impl Filter {
    match config.filter_type.as_str() {
        "bloom" => BloomFilter::new(config.capacity),
        _ => NullFilter,
    }
}
```

## Unsafe FFI

```rust
// src/ffi/crypto.rs — safe wrapper around unsafe C library
use std::ffi::{c_char, c_int, CString};

#[link(name = "sodium")]
extern "C" {
    fn crypto_secretbox_keygen(key: *mut u8);
    fn crypto_secretbox_easy(
        c: *mut u8,
        m: *const u8, mlen: u64,
        n: *const u8,
        k: *const u8,
    ) -> c_int;
}

const KEY_BYTES: usize = 32;
const NONCE_BYTES: usize = 24;

pub struct SecretBox {
    key: [u8; KEY_BYTES],
}

impl SecretBox {
    pub fn generate_key() -> Self {
        let mut key = [0u8; KEY_BYTES];
        // SAFETY: key is a valid, aligned buffer of KEY_BYTES bytes.
        unsafe { crypto_secretbox_keygen(key.as_mut_ptr()) };
        Self { key }
    }

    pub fn encrypt(&self, message: &[u8], nonce: &[u8; NONCE_BYTES]) -> Vec<u8> {
        let ciphertext_len = message.len() + 16; // MACBYTES
        let mut ciphertext = vec![0u8; ciphertext_len];

        // SAFETY: all pointers point to valid, non-overlapping memory regions
        // of the correct sizes as required by the libsodium ABI.
        let ret = unsafe {
            crypto_secretbox_easy(
                ciphertext.as_mut_ptr(),
                message.as_ptr(), message.len() as u64,
                nonce.as_ptr(),
                self.key.as_ptr(),
            )
        };
        assert_eq!(ret, 0, "encryption failed");
        ciphertext
    }
}
```

## WebAssembly with wasm-bindgen

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct TextProcessor {
    content: String,
}

#[wasm_bindgen]
impl TextProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(content: &str) -> Self {
        Self { content: content.to_string() }
    }

    pub fn word_count(&self) -> usize {
        self.content.split_whitespace().count()
    }

    pub fn to_uppercase(&self) -> String {
        self.content.to_uppercase()
    }
}

// JavaScript usage after `wasm-pack build --target web`:
// import init, { TextProcessor } from './pkg/my_wasm.js';
// await init();
// const p = new TextProcessor("hello world");
// console.log(p.word_count()); // 2
```

## Performance Profiling

```rust
// Criterion benchmark
// benches/parsing.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_parse(c: &mut Criterion) {
    let data = include_str!("../fixtures/large.json");

    c.bench_function("serde_json parse", |b| {
        b.iter(|| {
            let _: serde_json::Value = serde_json::from_str(black_box(data)).unwrap();
        })
    });

    c.bench_function("simd_json parse", |b| {
        b.iter(|| {
            let mut input = black_box(data.to_owned().into_bytes());
            let _: simd_json::OwnedValue = simd_json::to_owned_value(&mut input).unwrap();
        })
    });
}

criterion_group!(benches, bench_parse);
criterion_main!(benches);
```

Run with: `cargo bench` — results in `target/criterion/`

Flamegraph: `cargo flamegraph --bin myapp -- --args`

## Related Skills

- **`rust-patterns`** — Core patterns: ownership, error handling, async Tokio, hexagonal arch
- **`rust-testing`** — Unit, integration, property-based tests with proptest
- **`api-design`** — REST API contract-first design, RFC 7807 error standard
