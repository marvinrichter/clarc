# Install / Uninstall Lifecycle

**Status:** ✅ Done | **Date:** 2026-03-09 | **PR:** #3

**Goal:** Two-way install: easy in, clean out.

## Key Outcomes
- `install.sh --uninstall` flag added
- `npx clarc doctor` — health-check command
- Orphan symlink detection + cleanup in doctor
- `install.sh --upgrade` — re-links without overwriting user files
