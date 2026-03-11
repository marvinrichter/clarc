# Hook Reliability

**Status:** ✅ Done
**Date:** 2026-03-11
**Goal:** Fix all P0/P1 hook issues — typecheck timeouts, checkpoint staging scope, async race, format-dispatch blocking, and the Write-tool secret-scan blind spot.

## Problem Statement

The hook subsystem scored lowest in the post-hardening review (7.75/10) and contains all 4 remaining P0 issues. Every TypeScript or Rust edit currently risks a 5-60s stall due to missing timeouts. The auto-checkpoint commits unrelated dirty files via `git add -A`. A non-deterministic async race means checkpoints may capture pre- or post-formatted code. And a defense-in-depth gap means secrets written via the Write tool sit on disk unscanned until the next git commit.

## Open Items

### H1 — Typecheck hook timeouts (P0)

- **P0-T1**: `hooks/hooks.json` entry for `post-edit-typecheck.js` — add `"timeout": 30` and `"async": true`.
- **P0-T2**: `hooks/hooks.json` entry for `post-edit-typecheck-rust.js` — add `"timeout": 60` and `"async": true`.

### H2 — Auto-checkpoint staging scope (P0)

- **P0-C1**: `scripts/hooks/auto-checkpoint.js` — replace `git(['add', '-A'], cwd)` with `git(['add', toolInput.file_path], cwd)`. Fall back to `-A` only if `file_path` is not present in tool_input.
- **P0-C2**: `hooks/hooks.json` — remove `"async": true` from the auto-checkpoint entry so it executes after `post-edit-format-dispatch.js` (resolves the async race).

### H3 — Format-dispatch improvements (P1)

- **P1-F1**: `scripts/hooks/post-edit-format-dispatch.js` — add path exclusion: skip files whose resolved path contains `/node_modules/`, `/vendor/`, `/dist/`, `/.git/`.
- **P1-F2**: `scripts/hooks/post-edit-format-dispatch.js` — replace `execFileSync` with `spawn` + promise for true non-blocking dispatch (formatter latency currently blocks Node event loop 200ms-2s).

### H4 — PreToolUse Write secret scan (P1)

- **P1-S1**: `hooks/hooks.json` — add a new `PreToolUse` hook matching `Write` that runs a new script `scripts/hooks/pre-write-secret-scan.js`.
- **P1-S2**: Create `scripts/hooks/pre-write-secret-scan.js` — reads `tool_input.content` from stdin, calls `scanForSecrets()` from `scripts/lib/secret-scanner.js`, exits 2 with warning if secrets found (same pattern as `pre-bash-dispatch.js`).

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| P0-T1 | post-edit-typecheck timeout + async | ✅ |
| P0-T2 | post-edit-typecheck-rust timeout + async | ✅ |
| P0-C1 | auto-checkpoint: stage only edited file | ✅ |
| P0-C2 | auto-checkpoint: remove async:true (fix race) | ✅ |
| P1-F1 | format-dispatch: path exclusion | ✅ |
| P1-F2 | format-dispatch: execFileSync → spawn | ✅ |
| P1-S1 | hooks.json: add PreToolUse Write entry | ✅ |
| P1-S2 | pre-write-secret-scan.js: new hook script | ✅ |
