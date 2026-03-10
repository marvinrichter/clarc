# MCP / CLI Deduplication Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** The clarc MCP server exposes `skill_search`, `workflow_suggest`, and `agent_describe` tools — these duplicate what `/find-skill`, `/clarc-way`, and `/agent-review` already provide as CLI commands. Two systems doing the same thing creates maintenance burden and confusion about which surface to use.

---

## Problem Statement

Current duplication:

| MCP Tool | CLI Equivalent | Behavioral Diff |
|----------|---------------|-----------------|
| `skill_search` | `/find-skill` | MCP adds domain filter; CLI adds examples |
| `workflow_suggest` | `/clarc-way` | MCP is keyword-based; CLI is full workflow guide |
| `agent_describe` | Reading agent file directly | MCP wraps file read; CLI has no exact equivalent |
| `get_skill_index` | `skills/INDEX.md` | MCP serves the file; no functional diff |
| `get_project_context` | `session-start.js` detection | MCP re-implements detection logic separately |
| `rule_check` | Reading rule file directly | MCP wraps file read |

The MCP server at `mcp-server/index.js` partially re-implements logic already in `scripts/hooks/session-start.js` and the CLI commands.

### Symptoms

- Two code paths to maintain for project detection (session-start.js + MCP server)
- `skill_search` returns different results than `/find-skill` for the same query
- When a new skill is added, both `skills/INDEX.md` and MCP server may need updating
- No clear guidance on "when to use MCP vs CLI commands"

---

## Gap Analysis

| Area | Current State | Desired State |
|------|--------------|---------------|
| MCP vs CLI purpose | Undefined overlap | Clear separation: MCP for machine/agent consumption, CLI for human interaction |
| Detection logic | Duplicated in session-start.js + MCP | Single source: shared lib module |
| Search logic | Duplicated in find-skill + MCP | Single source: `scripts/lib/skill-search.js` |
| MCP tools | 8 tools, 4 duplicate CLI | 8 tools, all with unique value |
| Documentation | No "MCP vs CLI" guidance | Clear use-case guide in README + skill |

---

## Proposed Deliverables

### Architecture Decision

**MCP = machine-readable API** (for agents, other AI tools, programmatic access)
**CLI commands = human-facing workflows** (interactive, opinionated, formatted for terminal)

MCP tools return structured JSON. CLI commands return formatted prose + checklists.
The same underlying logic powers both via shared library modules.

### Shared Library Modules (2)

| Module | Description |
|--------|-------------|
| `scripts/lib/skill-search.js` | Single search implementation used by both `/find-skill` command and MCP `skill_search` tool |
| `scripts/lib/project-detection.js` | Extract project detection from `session-start.js` into reusable module, used by both session-start hook and MCP `get_project_context` tool |

### MCP Tool Replacements (2)

Replace duplicates with genuinely unique tools:

| Remove | Add | Rationale |
|--------|-----|-----------|
| `workflow_suggest` (duplicates `/clarc-way`) | `get_component_graph` | Returns dependency graph: which agents use which skills — unique value only possible via MCP |
| `get_skill_index` (just serves a file) | `get_health_status` | Returns clarc installation health: missing symlinks, outdated files, hook status — useful for CI/CD integration |

### Documentation (2)

| Document | Description |
|----------|-------------|
| `docs/mcp-guide.md` | When to use MCP vs CLI commands. MCP integration guide for Claude Desktop, Cursor, other clients. |
| Skill: `clarc-mcp-integration` | Patterns for using clarc MCP server in multi-agent workflows, CI pipelines, and external tools |

---

## Implementation Phases

### Phase 1 — Extract Shared Libraries
- Extract detection logic from `session-start.js` → `scripts/lib/project-detection.js`
- Extract search logic from find-skill command → `scripts/lib/skill-search.js`
- Update `session-start.js` and `mcp-server/index.js` to use shared modules
- Verify identical results from both surfaces

### Phase 2 — Replace Duplicate MCP Tools
- Remove `workflow_suggest` from MCP server
- Remove `get_skill_index` from MCP server
- Implement `get_component_graph` — queries agent frontmatter `uses_skills` (from agent-skill-coupling roadmap)
- Implement `get_health_status` — checks symlinks, hook registration, INDEX.md freshness

### Phase 3 — Documentation
- Write `docs/mcp-guide.md` with clear MCP vs CLI guidance
- Write `skills/clarc-mcp-integration/SKILL.md`
- Update MCP server README with new tool list

### Phase 4 — Test Coverage
- Unit tests for `scripts/lib/skill-search.js`
- Unit tests for `scripts/lib/project-detection.js`
- Integration test: same query via CLI and MCP returns equivalent results

---

## Final MCP Tool Surface (Post-Roadmap)

| Tool | Purpose | Unique Value |
|------|---------|-------------|
| `get_instinct_status` | Learned instincts + confidence | Only available via MCP for agent consumption |
| `get_session_context` | Latest session snapshot | Only available via MCP |
| `skill_search` | Search skills (uses shared lib) | JSON output for programmatic use |
| `get_project_context` | Detected stack (uses shared lib) | JSON output for agent consumption |
| `agent_describe` | Full agent instructions | Useful for meta-agents inspecting clarc |
| `rule_check` | Rule file content | Useful for compliance checking in CI |
| `get_component_graph` | Agent→Skill dependency graph *(new)* | Unique — not available in CLI |
| `get_health_status` | Installation health check *(new)* | Unique — designed for CI/CD consumption |

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Removing MCP server entirely | MCP has genuine value for agent-to-agent and CI use cases |
| Full MCP/CLI unification into one interface | Different audiences: MCP for machines, CLI for humans |
| WebSocket/SSE transport for MCP | Stdio is sufficient for current use cases |

---

## Success Criteria

- [ ] `skill_search` CLI and MCP return identical results (shared lib)
- [ ] Project detection logic has single source of truth
- [ ] `get_component_graph` and `get_health_status` are implemented and return valid data
- [ ] No behavioral duplicates remain between MCP tools and CLI commands
- [ ] `docs/mcp-guide.md` clearly explains when to use which surface
