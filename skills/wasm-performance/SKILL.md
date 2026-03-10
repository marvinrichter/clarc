---
name: wasm-performance
description: "WebAssembly performance: wasm-opt binary optimization, size reduction (panic=abort, LTO, strip), profiling WASM in Chrome DevTools, memory management (linear memory, avoiding GC pressure), SIMD, and multi-threading with SharedArrayBuffer."
---

# WebAssembly Performance

Techniques for reducing WASM binary size and maximizing runtime performance.

## When to Activate

- Binary is too large for acceptable load time
- Profiling reveals WASM execution bottlenecks
- Memory usage is growing unexpectedly
- Implementing compute-intensive features in WASM
- Enabling SIMD or multi-threading for heavy workloads
- Reducing JS↔Wasm boundary crossings by batching calls or sharing linear memory directly
- Using `twiggy` or `cargo-bloat` to identify which crate or function is dominating binary size

---

## Binary Size Optimization

### Cargo Profile (highest impact)

```toml
# Cargo.toml
[profile.release]
opt-level = "s"       # Optimize for size (use "z" for minimal size at cost of speed)
lto = true            # Link-time optimization — eliminates dead code across crates
panic = "abort"       # Skip unwinding tables (~50KB savings)
codegen-units = 1     # Single codegen unit — better LTO
strip = true          # Strip debug symbols
```

### wasm-opt (Binaryen)

```bash
# Install
cargo install wasm-opt  # or: brew install binaryen

# Optimize for size after wasm-pack build
wasm-opt -Os -o output.wasm input.wasm

# Optimize for speed
wasm-opt -O3 -o output.wasm input.wasm

# Maximum size reduction (slower, aggressive)
wasm-opt -Oz --enable-mutable-globals -o output.wasm input.wasm

# Enable SIMD optimizations
wasm-opt -O3 --enable-simd -o output.wasm input.wasm

# wasm-pack integrates wasm-opt automatically in release mode
wasm-pack build --release  # runs wasm-opt -O automatically
```

### twiggy — Dependency Size Analyzer

```bash
cargo install twiggy

# What's taking space?
twiggy top target/wasm32-unknown-unknown/release/my_lib.wasm

# Full call graph
twiggy paths target/wasm32-unknown-unknown/release/my_lib.wasm

# Example output:
#  Shallow Bytes │ Shallow % │ Item
# ───────────────┼───────────┼────────────────────
#          81996 ┊    36.10% ┊ "function names" subsection
#          36713 ┊    16.16% ┊ fmt::Display for f64
#          12300 ┊     5.41% ┊ serde::de::Visitor
```

### cargo-bloat — Rust Bloat Detector

```bash
cargo install cargo-bloat

# Find largest functions
cargo bloat --release --target wasm32-unknown-unknown -n 20

# Find largest crates
cargo bloat --release --target wasm32-unknown-unknown --crates
```

### Reducing Dependency Footprint

```toml
# Disable default features you don't need
[dependencies]
serde = { version = "1", default-features = false, features = ["derive"] }
chrono = { version = "0.4", default-features = false, features = ["serde"] }

# Use lighter alternatives for WASM
# Instead of std HashMap (larger): use ahash or a no-std map
```

---

## Runtime Performance

### Avoid JS↔Wasm Boundary Crossings

Every call across the JS/Wasm boundary has overhead. Batch work:

```rust
// BAD: many small calls across the boundary
#[wasm_bindgen]
pub fn process_item(item: u32) -> u32 {
    item * 2 + 1
}

// In JS:
// for (const item of items) result.push(process_item(item));  // N crossings

// GOOD: single call with slice
#[wasm_bindgen]
pub fn process_batch(items: &[u32]) -> Vec<u32> {
    items.iter().map(|&x| x * 2 + 1).collect()
}

// In JS:
// const result = process_batch(new Uint32Array(items));  // 1 crossing
```

### Share Memory Instead of Copying

```rust
use wasm_bindgen::prelude::*;

// Allocate memory in WASM heap
#[wasm_bindgen]
pub fn alloc(size: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);  // Give ownership to caller
    ptr
}

#[wasm_bindgen]
pub fn dealloc(ptr: *mut u8, size: usize) {
    unsafe { drop(Vec::from_raw_parts(ptr, 0, size)) }
}

// JS: write directly into WASM memory
#[wasm_bindgen]
pub fn process_buffer(ptr: *const u8, len: usize) -> u32 {
    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
    slice.iter().map(|&b| b as u32).sum()
}
```

```typescript
// Direct memory access from JS
const memory = wasm_instance.memory as WebAssembly.Memory;
const ptr = alloc(data.length);
new Uint8Array(memory.buffer, ptr, data.length).set(data);  // Zero copy
const result = process_buffer(ptr, data.length);
dealloc(ptr, data.length);
```

### SIMD (WebAssembly SIMD)

```rust
// Enable SIMD via target features
// RUSTFLAGS="-C target-feature=+simd128"

use std::arch::wasm32::*;

#[cfg(target_arch = "wasm32")]
pub fn dot_product_simd(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len());
    let mut sum = f32x4_splat(0.0);
    let chunks = a.len() / 4;

    for i in 0..chunks {
        let a_vec = unsafe { v128_load(a.as_ptr().add(i * 4) as *const v128) };
        let b_vec = unsafe { v128_load(b.as_ptr().add(i * 4) as *const v128) };
        sum = f32x4_add(sum, f32x4_mul(a_vec, b_vec));
    }

    let arr: [f32; 4] = unsafe { std::mem::transmute(sum) };
    arr.iter().sum()
}
```

```bash
# Build with SIMD
RUSTFLAGS="-C target-feature=+simd128" wasm-pack build --release

# wasm-opt with SIMD
wasm-opt -O3 --enable-simd output.wasm -o output_simd.wasm
```

### Multi-Threading with SharedArrayBuffer

```rust
// Cargo.toml
[dependencies]
wasm-bindgen-rayon = "1.0"

// lib.rs
use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen]
pub async fn setup_threads() {
    init_thread_pool(4).await;  // 4 web workers
}

#[wasm_bindgen]
pub fn parallel_sum(data: &[f64]) -> f64 {
    use rayon::prelude::*;
    data.par_iter().sum()
}
```

```html
<!-- Required headers for SharedArrayBuffer -->
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">
<meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">
```

---

## Memory Management

### Linear Memory Growth

```rust
// Check current memory usage
#[wasm_bindgen]
pub fn memory_usage() -> usize {
    // Returns pages × 64KB
    core::arch::wasm32::memory_size(0) * 64 * 1024
}

// Grow memory explicitly (rarely needed — usually automatic)
#[wasm_bindgen]
pub fn ensure_capacity(bytes: usize) {
    let current = core::arch::wasm32::memory_size(0) * 65536;
    if bytes > current {
        let pages_needed = (bytes - current + 65535) / 65536;
        core::arch::wasm32::memory_grow(0, pages_needed);
    }
}
```

### Avoid Memory Leaks

```rust
// WRONG: forgot to drop → memory leak
#[wasm_bindgen]
pub fn leaky(size: usize) -> *mut u8 {
    let mut v: Vec<u8> = vec![0; size];
    let ptr = v.as_mut_ptr();
    std::mem::forget(v);  // Intentional — but caller must free
    ptr
}

// CORRECT: use Box for single values, provide dealloc
#[wasm_bindgen]
pub fn create_buffer(size: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; size].into_boxed_slice()) as *mut u8
}

#[wasm_bindgen]
pub unsafe fn free_buffer(ptr: *mut u8, size: usize) {
    let _ = Box::from_raw(std::slice::from_raw_parts_mut(ptr, size));
}
```

---

## Profiling

### Chrome DevTools

```javascript
// Enable DWARF debug info for source maps
// wasm-pack build --dev  (dev build with debug info)

// Profile in DevTools:
// 1. Open DevTools → Performance tab
// 2. Enable: Settings → "WebAssembly debugging: Enable DWARF support"
// 3. Record a profile
// 4. In flame chart: Wasm functions appear with Rust source names
```

### console.time in Rust

```rust
use web_sys::console;

#[wasm_bindgen]
pub fn benchmark_process(data: &[u8]) -> u32 {
    console::time_with_label("process");
    let result = expensive_computation(data);
    console::time_end_with_label("process");
    result
}
```

### Counting Operations

```rust
use std::sync::atomic::{AtomicU64, Ordering};
static OPS_COUNT: AtomicU64 = AtomicU64::new(0);

pub fn hot_function(x: u64) -> u64 {
    OPS_COUNT.fetch_add(1, Ordering::Relaxed);
    x * x + x + 1
}

#[wasm_bindgen]
pub fn get_ops_count() -> u64 {
    OPS_COUNT.load(Ordering::Relaxed)
}
```

---

## Size Benchmarks

| Technique | Savings |
|-----------|---------|
| `opt-level = "s"` | 20–40% |
| `lto = true` | 10–30% |
| `panic = "abort"` | ~50KB |
| `wasm-opt -Os` | 10–20% |
| `strip = true` | 20–60% |
| Remove unused features | varies |

**Typical final size for a medium-complexity library:**
- Before optimization: 500KB–2MB
- After all techniques: 50KB–200KB

---

## Loading Strategy by Size

| Binary Size | Strategy |
|-------------|---------|
| < 100KB | Inline as base64 or bundle |
| 100KB–1MB | Streaming instantiation (`WebAssembly.instantiateStreaming`) |
| > 1MB | Lazy load on demand + loading indicator |

```typescript
// Streaming instantiation (most efficient)
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/assets/my_lib.wasm'),
  importObject
);

// Fallback for servers without correct Content-Type
async function loadWasm(url: string) {
  try {
    return await WebAssembly.instantiateStreaming(fetch(url));
  } catch {
    const bytes = await (await fetch(url)).arrayBuffer();
    return WebAssembly.instantiate(bytes);
  }
}
```

## Reference

- `wasm-patterns` — wasm-bindgen, WASI, Component Model, JS integration
- `rust-patterns` — Rust idioms that affect WASM output
- wasm-opt docs: <https://github.com/WebAssembly/binaryen>
- Rust WASM book: <https://rustwasm.github.io/book/>
