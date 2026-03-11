# Rules Versioning & Staleness

**Status:** ✅ Done | **Date:** 2026-03-09 | **PR:** #11

**Goal:** Detect stale rules and give users an easy update path.

## Key Outcomes
- `installed-rules-version` file written on install
- Session-start staleness banner (>30 days without update)
- `/update-rules` command — applies latest rules from `~/.clarc`
- `/rules-diff` command — previews changes before applying
