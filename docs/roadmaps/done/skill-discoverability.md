# Skill Discoverability

**Status:** ✅ Done | **Date:** 2026-03-09 | **PR:** #8

**Goal:** Contextual, project-aware skill discovery — not just a static catalog.

## Key Outcomes
- `/find-skill` command — keyword search across all skills
- `scripts/lib/skill-search.js` — shared search library (MCP + CLI)
- Session-start `SKILL_MAP` enrichment — relevant skills surfaced at startup
- MCP `skill_search` tool wired to shared library
