# MCP / CLI Deduplication

**Status:** ✅ Done | **Date:** 2026-03-09 | **PR:** #9

**Goal:** Clear boundary between MCP tools and CLI commands; no functional duplicates.

## Key Outcomes
- `skill_search`, `workflow_suggest`, `agent_describe` MCP tools deduplicated vs CLI
- `docs/mcp-guide.md` — MCP vs CLI decision guide + setup instructions
- `mcp-server/index.js` extended with `get_component_graph` + `get_health_status`
- `scripts/lib/skill-search.js` — shared search library (MCP + CLI)
