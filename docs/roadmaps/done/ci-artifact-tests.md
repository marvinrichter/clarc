# Test Coverage for Core Artifacts Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** Tests exist only for `scripts/lib/` utilities. There are no tests for skill content quality, agent instruction correctness, hook behavior, MCP server endpoints, or install/uninstall logic. An OS-grade tool with no artifact coverage tests cannot be shipped confidently.

---

## Problem Statement

Current test coverage:
```
tests/
  lib/utils.test.js           ✅ covered
  lib/package-manager.test.js ✅ covered
  hooks/hooks.test.js         ✅ covered (minimal)
```

Not tested:
- Skill YAML frontmatter validity
- Agent YAML frontmatter validity + required fields
- Command frontmatter validity
- Hook JSON schema validity
- MCP server tool responses
- `install.sh` symlink creation and cleanup
- `validate-skill-quality.js` itself
- Session-start / session-end hook behavior
- `instinct-decay.js`, `instinct-outcome-tracker.js` (once added)

### Symptoms

- A malformed agent frontmatter ships silently (no CI gate catches it)
- A skill with missing required sections (`When to Use`, `Patterns`) passes validation
- `hooks/hooks.json` schema changes break hooks silently
- MCP server returns unexpected shapes when skills/agents are modified
- Install failures in edge cases (missing directories, permission issues) go undetected

---

## Gap Analysis

| Artifact Type | Count | Test Coverage | Risk |
|--------------|-------|---------------|------|
| Skills (SKILL.md) | 222 | 0% | Medium |
| Agents (.md) | 61 | 0% | High |
| Commands (.md) | 139 | 0% | Low |
| hooks.json | 1 | Minimal | High |
| MCP server | 8 tools | 0% | Medium |
| install.sh | — | 0% | High |
| validate-skill-quality.js | — | 0% | Medium |
| session-start.js | — | 0% | Medium |

---

## Proposed Deliverables

### Test Files (7)

| File | What it tests |
|------|--------------|
| `tests/artifacts/agents.test.js` | All agent files: frontmatter schema, required fields (name, description, tools, model), non-empty instruction body |
| `tests/artifacts/skills.test.js` | All skill SKILL.md files: frontmatter schema, required sections (When to Use, Patterns), minimum line count |
| `tests/artifacts/commands.test.js` | All command files: frontmatter `description` field present, valid markdown |
| `tests/artifacts/hooks.test.js` | hooks.json schema, all referenced scripts exist, event names are valid |
| `tests/mcp/mcp-server.test.js` | MCP server: each tool returns expected schema, handles missing files gracefully |
| `tests/scripts/install.test.js` | install.sh: creates symlinks, writes manifest, --check detects orphans, --dry-run makes no changes |
| `tests/scripts/validate-quality.test.js` | validate-skill-quality.js: flags skills below threshold, passes skills above threshold |

### CI Integration (1)

| Change | Description |
|--------|-------------|
| `.github/workflows/test.yml` update | Add artifact tests to CI pipeline, run on every PR, block merge on failure |

### Test Utilities (1)

| File | Description |
|------|-------------|
| `tests/lib/artifact-parser.js` | Shared helper: parse YAML frontmatter from markdown files, load JSON schemas, find all files by type |

---

## Test Specifications

### Agent Tests (`tests/artifacts/agents.test.js`)

```
for each file in agents/*.md:
  - frontmatter is valid YAML
  - has 'name' field (string, non-empty)
  - has 'description' field (string, > 20 chars)
  - has 'tools' field (array, non-empty)
  - has 'model' field (one of: claude-sonnet, claude-opus, claude-haiku)
  - instruction body (after frontmatter) is > 100 characters
  - no broken markdown links (internal links resolve)
```

### Skill Tests (`tests/artifacts/skills.test.js`)

```
for each dir in skills/*/:
  - SKILL.md exists
  - frontmatter is valid YAML
  - has 'title' field
  - has 'tags' array
  - body contains '## When' section
  - body contains at least one code block (```)
  - total line count >= 30
```

### Hook Tests (`tests/artifacts/hooks.test.js`)

```
- hooks.json is valid JSON
- each hook has 'event', 'matcher', 'command' or 'notification' fields
- event names are in: [SessionStart, SessionEnd, PreToolUse, PostToolUse, Stop]
- all 'command' values point to existing scripts/ files
```

### MCP Server Tests (`tests/mcp/mcp-server.test.js`)

```
- server starts without error
- ListTools returns array of tool definitions
- skill_search('testing') returns results array
- agent_describe('tdd-guide') returns non-empty string
- get_health_status returns {status, issues} shape
- all tools handle missing/corrupt files gracefully (no throw)
```

---

## Implementation Phases

### Phase 1 — Artifact Parser Utility
- Write `tests/lib/artifact-parser.js`
- Functions: `parseMarkdownFrontmatter(path)`, `findAllAgents()`, `findAllSkills()`, `findAllCommands()`

### Phase 2 — Agent + Hook + Command Tests
- Write `tests/artifacts/agents.test.js` — highest risk, implement first
- Write `tests/artifacts/hooks.test.js` — hooks.json is critical infrastructure
- Write `tests/artifacts/commands.test.js` — lower risk, quick to write

### Phase 3 — Skill Tests
- Write `tests/artifacts/skills.test.js`
- Run against all 222 skills — expect failures, fix violations
- Set minimum thresholds that all existing skills pass

### Phase 4 — MCP Server Tests
- Write `tests/mcp/mcp-server.test.js`
- Requires MCP server to run without actual MCP client (mock transport or direct module import)

### Phase 5 — Install Script Tests
- Write `tests/scripts/install.test.js`
- Use temp directories for isolation
- Test: create symlinks, verify manifest, detect orphans, dry-run mode
- Requires bash test runner or Node.js child_process approach

### Phase 6 — CI Integration
- Update `.github/workflows/` to run all test files
- Set coverage target: 100% of artifact types covered (not 100% line coverage)
- Block PRs that add agents/skills/commands violating format contracts

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| E2E tests for Claude Code itself | Cannot programmatically drive Claude Code in CI |
| LLM output quality testing | Requires eval framework (separate roadmap: `eval-harness`) |
| Performance benchmarks for hooks | Premature optimization; hooks are fast enough currently |

---

## Success Criteria

- [ ] All 61 agents pass `agents.test.js`
- [ ] All 222 skills pass `skills.test.js`
- [ ] hooks.json schema validated in CI
- [ ] MCP server tests cover all 8 tools
- [ ] Install script tests cover create, check, and uninstall paths
- [ ] CI blocks merge on any artifact format violation
