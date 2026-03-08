---
description: Review WebAssembly/Rust code for correctness, performance pitfalls, unsafe memory management, and JS interop quality
---

# WASM Review Command

Review WebAssembly code for: $ARGUMENTS

## Your Task

Systematically review Rust-to-WASM code for correctness, performance, safety, and JS interop quality. Produce a prioritized issue list.

## Step 1 — Identify Changed Files

```bash
git diff --staged --name-only
git diff --name-only
```

Focus on:
- `*.rs` files with `#[wasm_bindgen]` annotations
- `Cargo.toml` (profile settings, feature flags)
- `*.ts`/`*.js` files using the WASM module

## Step 2 — Cargo.toml Audit

Check release profile:

```bash
grep -A10 '\[profile.release\]' Cargo.toml
```

- [ ] `crate-type = ["cdylib"]` in `[lib]`
- [ ] `opt-level = "s"` or `"z"` for size
- [ ] `lto = true`
- [ ] `panic = "abort"`

## Step 3 — wasm-bindgen API Surface Review

### Type Safety

```bash
grep -n "#\[wasm_bindgen\]" src/ -r
```

Check each exported function/type:

- [ ] Arguments use appropriate types (no raw pointers in public API without safety docs)
- [ ] Return `Result<T, JsError>` instead of panicking
- [ ] Complex types use `serde-wasm-bindgen` or `JsValue` — not opaque pointers
- [ ] `Option<T>` fields handled (not `.unwrap()` on JS-provided optionals)

### Memory Safety

```bash
grep -n "unsafe\|mem::forget\|from_raw\|into_raw\|as_mut_ptr\|as_ptr" src/ -r --include="*.rs"
```

For each `unsafe` block:
- [ ] `mem::forget` + pointer passed to JS → matching `free`/`dealloc` export?
- [ ] Raw pointer arithmetic is bounds-checked
- [ ] Lifetimes are respected (no dangling references across async boundaries)

### Panic Prevention

```bash
grep -n "unwrap()\|expect(\|panic!" src/ -r --include="*.rs" | grep -v "#\[cfg(test)\]\|//\|test"
```

- [ ] No `.unwrap()` in `#[wasm_bindgen]` functions (panics become uncatchable JS errors without `console_error_panic_hook`)
- [ ] `console_error_panic_hook::set_once()` called in `init()`

## Step 4 — Performance Review

### JS↔Wasm Boundary Crossings

```bash
# Find functions that might be called in tight loops
grep -n "#\[wasm_bindgen\]" src/ -r -A3 | grep "pub fn"
```

- [ ] Functions processing collections work on slices (`&[T]`), not element-by-element
- [ ] No allocation in hot-path functions (check for `.collect()`, `Vec::new()`)
- [ ] Heavy objects are cached in Rust, not recreated per call

### Allocation Patterns

```bash
grep -n "Vec::new\|String::new\|Box::new\|HashMap::new" src/ -r --include="*.rs"
```

- [ ] Allocations in `#[wasm_bindgen]` functions serve a purpose
- [ ] Large allocations (>1MB) document their lifetime / freeing strategy
- [ ] No unbounded growth (e.g., append-only `Vec` that's never cleared)

## Step 5 — WASI/Non-Browser Code (if applicable)

```bash
grep -rn "wasm32-wasi\|wasm32-wasm\|WASI" . --include="*.toml" --include="*.rs" --include="*.md"
```

- [ ] `std::io` usage is WASI-compatible (no raw syscalls)
- [ ] File paths use `std::path::Path` (not hardcoded Unix paths)
- [ ] Correct capabilities requested in WASI config

## Step 6 — JS Integration Review

```bash
# Find JS/TS files using the WASM module
find . -name "*.ts" -o -name "*.js" | xargs grep -l "import.*wasm\|WebAssembly" 2>/dev/null
```

For each integration point:

- [ ] `await init()` (or `initSync`) called before any WASM functions
- [ ] Error handling for `init()` failure (network error, MIME type wrong)
- [ ] WASM objects freed when no longer needed (`obj.free()` for non-GC objects)
- [ ] Streaming instantiation used (`WebAssembly.instantiateStreaming`) not `fetch + arrayBuffer`
- [ ] Content-Type `application/wasm` configured on server

## Step 7 — Test Coverage

```bash
grep -rn "#\[wasm_bindgen_test\]\|wasm_bindgen_test_configure" . --include="*.rs"
```

- [ ] Critical exported functions have `#[wasm_bindgen_test]` tests
- [ ] Error cases tested (not just happy path)
- [ ] Memory allocation/deallocation tested (no leak)

## Output Format

```markdown
## WASM Code Review

### CRITICAL
1. **`unsafe { ... }` without matching `free` export** — memory leak in production
   - Location: `src/buffer.rs:42`
   - Fix: Export a `free_buffer(ptr, len)` function; document ownership transfer

### HIGH
1. **`unwrap()` in exported function** — unhandled panic crashes entire WASM module
   - Location: `src/lib.rs:18`
   - Fix: `map_err(|e| JsError::new(&e.to_string()))?`

2. **Per-element boundary crossing in loop** — 10x performance penalty
   - Location: `src/app.ts:55`
   - Fix: Call `process_batch(arr)` once instead of `process_item(x)` per element

### MEDIUM
1. **Missing `panic = "abort"` in release profile** — ~50KB unnecessary binary size
   - Location: `Cargo.toml`
   - Fix: Add to `[profile.release]`

### LOW
1. **`console_error_panic_hook` not initialized** — panics show as "unreachable" in JS
   - Fix: Add `console_error_panic_hook::set_once()` to init function

### Positive Patterns
- Batch processing API design reduces boundary crossings
- `Result<T, JsError>` consistently used for error propagation
```

## Reference Skills

- `wasm-patterns` — wasm-bindgen, WASI, Component Model
- `wasm-performance` — size optimization, SIMD, memory management
- `rust-patterns` — Rust idioms (error handling, ownership)
