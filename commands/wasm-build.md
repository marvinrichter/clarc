---
description: Build, optimize, and validate a WebAssembly module from Rust — wasm-pack build, wasm-opt size optimization, and JS integration check
---

# WASM Build Command

Build and optimize a WebAssembly module: $ARGUMENTS

## Your Task

Compile Rust to WASM, optimize the output, validate the build, and report binary size and integration status.

## Step 1 — Detect Project Type

```bash
# Is this a wasm-pack project?
ls Cargo.toml pubspec.yaml package.json 2>/dev/null

# Check crate-type
grep -A5 '\[lib\]' Cargo.toml | grep crate-type

# Check existing targets
rustup target list --installed | grep wasm
```

## Step 2 — Prerequisites

```bash
# Install required tools if missing
cargo install wasm-pack 2>/dev/null || echo "wasm-pack already installed"
rustup target add wasm32-unknown-unknown

# Optional but recommended
cargo install wasm-opt 2>/dev/null || echo "wasm-opt already installed"
cargo install twiggy 2>/dev/null || echo "twiggy already installed"
```

## Step 3 — Validate Cargo.toml

Check these required settings:

```toml
# Required
[lib]
crate-type = ["cdylib"]

# Recommended for production
[profile.release]
opt-level = "s"
lto = true
panic = "abort"
codegen-units = 1
strip = true
```

Report missing settings and offer to add them.

## Step 4 — Build

```bash
# Determine target from $ARGUMENTS or detect from project
# Targets: bundler (webpack/vite), web (no bundler), nodejs, deno

# Development build (fast, includes debug info)
wasm-pack build --dev --target bundler

# Release build (optimized)
wasm-pack build --release --target bundler

# Report build outcome
echo "Build exit code: $?"
ls -la pkg/*.wasm 2>/dev/null
```

## Step 5 — Size Analysis

```bash
# Before wasm-opt
BEFORE=$(wc -c < pkg/*_bg.wasm)
echo "Binary size before optimization: ${BEFORE} bytes ($(( BEFORE / 1024 )) KB)"

# Apply wasm-opt (if not already run by wasm-pack)
wasm-opt -Os -o pkg/optimized.wasm pkg/*_bg.wasm
AFTER=$(wc -c < pkg/optimized.wasm)
echo "Binary size after wasm-opt: ${AFTER} bytes ($(( AFTER / 1024 )) KB)"
echo "Reduction: $(( (BEFORE - AFTER) * 100 / BEFORE ))%"

# Top contributors to size
if command -v twiggy &> /dev/null; then
  twiggy top pkg/*_bg.wasm -n 10
fi
```

## Step 6 — Validate Exports

```bash
# List exported functions (must include expected API surface)
wasm-objdump -x pkg/*_bg.wasm 2>/dev/null | grep "Export" | head -20

# Or with wasm-bindgen generated JS:
grep "export function\|export class" pkg/*.js | head -20
```

## Step 7 — Integration Check

Verify JS/TS integration files exist:

```bash
ls -la pkg/
# Should contain:
#   *.wasm          — binary
#   *.js            — JS glue
#   *.d.ts          — TypeScript types
#   package.json    — npm package metadata
```

Check TypeScript types are complete:
```bash
# All exported Rust functions should appear in .d.ts
grep "export function\|export class" pkg/*.d.ts
```

## Step 8 — Run Tests

```bash
# Native unit tests (fast)
cargo test

# WASM tests in headless browser
wasm-pack test --chrome --headless

# WASM tests in Node.js
wasm-pack test --node
```

## Step 9 — Report

Output this summary:

```markdown
## WASM Build Report

**Crate:** [name from Cargo.toml]
**Target:** [bundler/web/nodejs]
**Build:** [success/failed]

### Binary Size
| Stage | Size | Change |
|-------|------|--------|
| Raw (release) | [N] KB | baseline |
| After wasm-opt | [N] KB | -[N]% |

### Exports ([N] functions, [N] classes)
- `functionName(arg: Type): ReturnType`
- ...

### Top Size Contributors
1. [crate/function] — [N] KB
2. ...

### Optimization Opportunities
- [ ] Missing `panic = "abort"` in release profile (+50KB)
- [ ] `opt-level` not set to "s" (+[N]KB estimated)
- [ ] Consider removing unused `serde` features

### Integration
- [x] TypeScript types generated
- [x] JS glue file present
- [ ] Content-Type header configured (required for streaming instantiation)
```

## Reference Skills

- `wasm-patterns` — wasm-bindgen, JS interop, WASI, Component Model
- `wasm-performance` — deeper size optimization and profiling

## After This

- `/wasm-review` — review WebAssembly code quality after the build is green
- `/security-review` — check unsafe blocks flagged during build
