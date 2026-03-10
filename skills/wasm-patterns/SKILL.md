---
name: wasm-patterns
description: "WebAssembly patterns: wasm-pack, wasm-bindgen (JS↔Wasm interop), WASI, Component Model, wasm-opt, Rust-to-WASM compilation, JS integration (web workers, streaming instantiation), and production deployment (CDN, Content-Type headers)."
---

# WebAssembly Patterns

Practical reference for compiling Rust to WebAssembly, integrating with JavaScript, and deploying to production.

## When to Activate

- Compiling Rust code to WebAssembly (browser or server-side)
- Setting up wasm-pack for JS/TS integration
- Exposing Rust functions to JavaScript via wasm-bindgen
- Running WebAssembly in non-browser environments (WASI)
- Optimizing WASM binary size and performance
- Offloading CPU-intensive computation (parsing, encoding, crypto) from JavaScript to a WASM Web Worker
- Defining language-agnostic component interfaces using the WIT format and WebAssembly Component Model

---

## Quick Start — wasm-pack

```bash
# Install toolchain
cargo install wasm-pack
rustup target add wasm32-unknown-unknown

# New Wasm library crate
cargo new --lib my_wasm_lib
cd my_wasm_lib
```

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console", "Window", "Document"] }

[profile.release]
opt-level = "s"      # Optimize for size
lto = true           # Link-time optimization
panic = "abort"      # Reduces binary size (no unwinding machinery)
```

---

## wasm-bindgen — Rust ↔ JS Interop

### Basic Exports

```rust
use wasm_bindgen::prelude::*;

// Export a function to JavaScript
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
    a + b
}

// Export a struct with methods
#[wasm_bindgen]
pub struct Calculator {
    history: Vec<f64>,
}

#[wasm_bindgen]
impl Calculator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { history: Vec::new() }
    }

    pub fn compute(&mut self, a: f64, op: &str, b: f64) -> f64 {
        let result = match op {
            "+" => a + b,
            "-" => a - b,
            "*" => a * b,
            "/" => a / b,
            _ => f64::NAN,
        };
        self.history.push(result);
        result
    }

    pub fn last_result(&self) -> Option<f64> {
        self.history.last().copied()
    }
}
```

### Calling JS from Rust

```rust
use wasm_bindgen::prelude::*;

// Import JS function
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);

    // Access console.log
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // Import with different JS name
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(n: u32);
}

// Use web-sys for DOM access (generated bindings)
use web_sys::{window, HtmlElement};

#[wasm_bindgen]
pub fn get_title() -> String {
    window()
        .and_then(|w| w.document())
        .and_then(|d| d.title().into())
        .unwrap_or_default()
}
```

### Passing Complex Types

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Serialize structs to/from JS via JSON (serde-wasm-bindgen)
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct UserStats {
    pub total_score: u32,
    pub games_played: u32,
    pub win_rate: f32,
}

#[wasm_bindgen]
pub fn compute_stats(scores: &[u32]) -> JsValue {
    let stats = UserStats {
        total_score: scores.iter().sum(),
        games_played: scores.len() as u32,
        win_rate: scores.iter().filter(|&&s| s > 50).count() as f32 / scores.len() as f32,
    };
    serde_wasm_bindgen::to_value(&stats).unwrap()
}
```

---

## Build Pipeline

```bash
# Build for bundler (webpack/vite/rollup) — generates .wasm + .js + .d.ts
wasm-pack build --target bundler

# Build for web (no bundler — direct <script type="module">)
wasm-pack build --target web

# Build for Node.js
wasm-pack build --target nodejs

# Build for Deno
wasm-pack build --target deno

# Release build with size optimization
wasm-pack build --release --target bundler

# Run tests in Chrome (headless)
wasm-pack test --chrome --headless
```

Generated output in `pkg/`:
```
pkg/
  my_wasm_lib_bg.wasm      # Binary
  my_wasm_lib.js           # JS glue code
  my_wasm_lib.d.ts         # TypeScript types
  package.json             # For npm publishing
```

---

## JavaScript Integration

### Vite / Webpack (bundler target)

```typescript
// main.ts
import init, { Calculator } from './pkg/my_wasm_lib';

async function main() {
  // Initialize the WASM module (downloads + compiles)
  await init();

  const calc = new Calculator();
  console.log(calc.compute(10, '+', 5));  // 15
  console.log(calc.last_result());         // 15
}

main();
```

### Streaming Instantiation (web target — best performance)

```html
<script type="module">
  import init, { add } from './pkg/my_wasm_lib.js';

  // Streaming: browser compiles WASM while downloading
  await init();
  console.log(add(1, 2));  // 3
</script>
```

### Web Worker (offload heavy computation)

```typescript
// wasm-worker.ts
import init, { processData } from './pkg/my_wasm_lib';

self.addEventListener('message', async (event) => {
  await init();
  const result = processData(event.data);
  self.postMessage(result);
});

// main.ts
const worker = new Worker(new URL('./wasm-worker.ts', import.meta.url));
worker.postMessage(largeDataset);
worker.onmessage = (e) => console.log('Result:', e.data);
```

---

## WASI — Non-Browser Environments

WASI (WebAssembly System Interface) — run WASM outside the browser:

```toml
# Cargo.toml — WASI target
[lib]
crate-type = ["cdylib"]

# No wasm-bindgen needed for WASI — use std I/O
```

```rust
// WASI program — uses std like a normal Rust program
fn main() {
    let args: Vec<String> = std::env::args().collect();
    println!("WASI args: {:?}", args);

    // File I/O via WASI
    let content = std::fs::read_to_string("input.txt").expect("file not found");
    println!("File: {}", content);
}
```

```bash
# Build for WASI
rustup target add wasm32-wasi
cargo build --target wasm32-wasi --release

# Run with wasmtime
wasmtime target/wasm32-wasi/release/my_program.wasm

# Run with Node.js WASI
node --experimental-wasi-unstable-preview1 run.mjs
```

### WASI with wasmtime (server-side)

```rust
// Embedding WASI in a Rust host
use wasmtime::*;
use wasmtime_wasi::sync::WasiCtxBuilder;

fn run_wasm(wasm_path: &str, args: &[&str]) -> anyhow::Result<()> {
    let engine = Engine::default();
    let module = Module::from_file(&engine, wasm_path)?;

    let wasi = WasiCtxBuilder::new()
        .inherit_stdio()
        .args(args)?
        .build();

    let mut store = Store::new(&engine, wasi);
    let mut linker = Linker::new(&engine);
    wasmtime_wasi::add_to_linker(&mut linker, |s| s)?;

    let instance = linker.instantiate(&mut store, &module)?;
    let run = instance.get_typed_func::<(), ()>(&mut store, "_start")?;
    run.call(&mut store, ())?;
    Ok(())
}
```

---

## Component Model (WIT Interface)

The WebAssembly Component Model — language-agnostic, composable modules:

```wit
// interface.wit — define your component's interface
package example:calculator;

interface ops {
  add: func(a: f32, b: f32) -> f32;
  mul: func(a: f32, b: f32) -> f32;
}

world calculator {
  export ops;
}
```

```rust
// Implement the WIT interface in Rust
wit_bindgen::generate!({
    world: "calculator",
    exports: { "example:calculator/ops": Calculator }
});

struct Calculator;

impl Guest for Calculator {
    fn add(a: f32, b: f32) -> f32 { a + b }
    fn mul(a: f32, b: f32) -> f32 { a * b }
}
```

```bash
# Build component
cargo component build --release  # cargo-component crate

# Compose components
wac compose -o composed.wasm calculator.wasm formatter.wasm
```

---

## Error Handling in WASM

```rust
use wasm_bindgen::prelude::*;

// Return Result — wasm-bindgen converts Err to JS exception
#[wasm_bindgen]
pub fn parse_json(input: &str) -> Result<JsValue, JsError> {
    let value: serde_json::Value = serde_json::from_str(input)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(serde_wasm_bindgen::to_value(&value)?)
}
```

```typescript
// Handle Wasm errors in JS
try {
  const result = parse_json('invalid json');
} catch (e) {
  console.error('WASM error:', e.message);  // Rust error message
}
```

---

## Testing Wasm

```rust
// Unit tests run natively (fast)
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_works() {
        assert_eq!(add(2, 3), 5);
    }
}

// Browser integration tests via wasm-pack test
#[cfg(test)]
mod wasm_tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_dom_interaction() {
        // Tests run in headless browser
        let window = web_sys::window().unwrap();
        assert!(window.document().is_some());
    }
}
```

---

## Production Deployment

### HTTP Headers (critical for performance)

```nginx
# nginx.conf — required for WASM streaming compilation
location ~* \.wasm$ {
    types { application/wasm wasm; }
    add_header Content-Type application/wasm;
    add_header Cross-Origin-Embedder-Policy require-corp;  # SharedArrayBuffer
    add_header Cross-Origin-Opener-Policy same-origin;
    gzip_types application/wasm;
    gzip on;
}
```

```javascript
// Vite config — proper MIME type
export default {
  plugins: [{
    name: 'wasm-mime',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    }
  }]
}
```

### CDN (Cloudflare Workers — WASM at edge)

```typescript
// worker.ts
import wasm from './pkg/my_wasm_lib_bg.wasm';
import { initSync, processRequest } from './pkg/my_wasm_lib';

// Initialize synchronously in Worker (no async needed at edge)
initSync(wasm);

export default {
  async fetch(request: Request): Promise<Response> {
    const result = processRequest(await request.text());
    return new Response(result, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

---

## Dependency Quick Reference

| Need | Crate |
|------|-------|
| JS interop | `wasm-bindgen` |
| DOM/Web APIs | `web-sys` |
| JS types | `js-sys` |
| Serialization | `serde-wasm-bindgen` |
| WASI runtime (host) | `wasmtime` |
| Random numbers | `getrandom` (with `js` feature) |
| Logging → console | `console_error_panic_hook` |
| Component Model | `wit-bindgen`, `cargo-component` |

## Reference

- `wasm-performance` — size optimization (wasm-opt), profiling, memory management
- `rust-patterns` — Rust idioms relevant to WASM targets
- wasm-pack docs: <https://rustwasm.github.io/wasm-pack/>
- wasm-bindgen guide: <https://rustwasm.github.io/wasm-bindgen/>
