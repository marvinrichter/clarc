# Hook Reliability

**Status:** ✅ Done | **Date:** 2026-03-11 | **PR:** #28

**Goal:** Fix all P0/P1 hook issues before v1.0.

## Key Outcomes
- `post-edit-typecheck.js`: `async: true` + spawn (was blocking execFileSync)
- `auto-checkpoint.js`: staging scope fixed (Edit target only, not `git add -A`)
- `post-edit-format-dispatch.js`: blocking spawn → async
- `pre-write-secret-scan.js`: Write-tool secret guard added
- Race condition in `suggest-compact.js` resolved
