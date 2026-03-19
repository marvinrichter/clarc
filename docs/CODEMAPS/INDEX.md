# clarc Codemap Index

**Last Updated:** 2026-03-12
**Version:** 1.0.0
**Entry Points:** `install.sh`, `scripts/setup-wizard.js`, `mcp-server/index.js`

## Architecture Overview

```
clarc/
├── agents/          (62)  — Specialized subagents for delegation
├── skills/          (247) — Domain knowledge, on-demand by agents
├── commands/        (172) — Slash commands for Claude Code
├── hooks/                — Hook definitions (hooks.json)
├── rules/                — Always-on guidelines (common/ + lang-specific/)
├── scripts/              — Node.js runtime: hooks, setup, CI, MCP
│   ├── hooks/            — Hook scripts (PostToolUse, PreToolUse, etc.)
│   ├── ci/               — CI validators and generators
│   └── lib/              — Shared utilities
├── mcp-server/           — clarc MCP server (8 tools)
├── mcp-configs/          — MCP configuration templates
├── tests/                — Test suite for scripts
└── docs/                 — Documentation, hub, roadmaps, wiki
```

## Component Map

| Area | Codemap | Description |
|------|---------|-------------|
| Agents | [agents.md](agents.md) | All 62 agents — routing, categories, model tiers |
| Hooks | [hooks.md](hooks.md) | Hook system — triggers, scripts, config |
| Scripts | [scripts.md](scripts.md) | Node.js scripts — hooks, CI, setup, MCP |
| Install | [install.md](install.md) | Install lifecycle — wizard, symlinks, doctor |

## Key Data Flows

### Session Start
```
SessionStart hook
  → scripts/hooks/session-start.js
  → detects package manager
  → builds SKILL_MAP (all skill names)
  → matches glob rules for project type
  → injects instinct overlays from ~/.clarc/agent-instincts/
```

### PostToolUse (Edit/Write)
```
PostToolUse: Edit|Write
  → post-edit-format-dispatch.js  (auto-format)
  → post-edit-workflow-nudge.js   (5 nudges: security, code-review, doc-update,
                                   clarc-self-dev, tdd-guard)
  → auto-checkpoint.js            (git checkpoint for /undo)
```

### PostToolUse (Bash)
```
PostToolUse: Bash
  → build-failure-router.js       (detect compile errors → suggest build-error-resolver)
```

### PreToolUse
```
PreToolUse: Bash
  → pre-bash-dispatch.js          (block dev servers, tmux reminder, push review)
PreToolUse: Write
  → pre-write-secret-scan.js      (block if secrets in content, exit 2)
  → doc-file-warning.js           (warn on non-standard doc paths)
PreToolUse: Edit|Write
  → suggest-compact.js            (suggest /compact when context is large)
PreToolUse: Agent
  → budget-guard.js               (warn/block if daily spend > CLAUDE_COST_WARN/$CLAUDE_BUDGET_LIMIT)
```

### Stop (per response)
```
Stop hook (fires after each Claude response)
  → response-dashboard.js         (show tools used, agents, estimated cost for last response)
  → check-console-log.js          (warn if console.log found in modified files)
```

## Component Counts (verified 2026-03-12)

| Component | Count | Path |
|-----------|------:|------|
| Agents | 62 | `agents/*.md` |
| Skills | 247 | `skills/*/SKILL.md` |
| Commands | 172 | `commands/*.md` |
| Hook scripts | ~14 | `scripts/hooks/*.js` |
| CI scripts | ~6 | `scripts/ci/*.js` |
| Rules (common) | 8 | `rules/common/*.md` |
| Language rule sets | 5 | `rules/{typescript,python,golang,swift,java}/` |

## Hook System Config

Per-project suppression: `.clarc/hooks-config.json`
```json
{
  "disabled": ["code-review-nudge", "tdd-sequence-guard"],
  "code_review_cooldown_minutes": 5,
  "clarc_self_dev_cooldown_minutes": 5,
  "security_scan_cooldown_minutes": 30,
  "response_dashboard": false
}
```

Global config: `~/.clarc/hooks-config.json`
Cooldown state: `~/.clarc/nudge-cooldown.json`
Cost log: `~/.clarc/cost-log.jsonl` (appended by session-end.js, read by budget-guard.js + /session-cost)

## Budget & Cost System

| File | Purpose |
|------|---------|
| `scripts/hooks/budget-guard.js` | PreToolUse/Agent: warn/block on daily spend threshold |
| `scripts/hooks/response-dashboard.js` | Stop: show per-response tool/agent/cost summary |
| `scripts/hooks/session-end.js` | SessionEnd: log total cost with per-tool heuristics |
| `~/.clarc/cost-log.jsonl` | Persistent daily cost accumulator |

Env vars: `CLAUDE_COST_WARN=5`, `CLAUDE_BUDGET_LIMIT=20`, `CLARC_RESPONSE_DASHBOARD=false`

## MCP Server Tools (8)

| Tool | Purpose |
|------|---------|
| `get_instinct_status` | Current instincts + confidence |
| `get_session_context` | Latest session snapshot |
| `get_project_context` | Detected project type + relevant skills |
| `skill_search` | Search skills by keyword/language/domain |
| `agent_describe` | Full description + instructions for named agent |
| `rule_check` | Content of a specific clarc rule file |
| `get_component_graph` | Agent→skill dependency graph (cached: mtime-invalidated, 1h TTL) |
| `get_health_status` | clarc installation health check |

## Clarc Self-Development

When modifying clarc components, the `clarc-self-dev-nudge` (hook 3b in
`scripts/hooks/post-edit-workflow-nudge.js`) fires automatically:

| Modified file | Suggested review agent |
|---------------|----------------------|
| `agents/*.md` | `agent-quality-reviewer` |
| `skills/**/*.md` | `skill-depth-analyzer` |
| `commands/*.md` | `command-auditor` |

See also `CLAUDE.md` — "Self-Development Workflow" section.

## Roadmap Archive

24 completed roadmaps in `docs/roadmaps/done/`.
Active: `docs/roadmaps/performance-token-cost.md` (PR #37).
See `docs/roadmaps/ROADMAP.md` for the full index.

## Related Documentation

- `docs/token-optimization.md` — token, cost, and budget optimization guide
- `docs/wiki/getting-started.md` — user onboarding
- `docs/wiki/commands-reference.md` — all 172 commands
- `docs/hub/index.html` — static hub (generated by `scripts/ci/generate-hub.js`)
- `docs/mcp-guide.md` — MCP vs CLI boundary
- `docs/memory-bank.md` — memory bank standard
- `docs/contributing/agent-format.md` — agent file format contract
- `docs/contributing/skills-format.md` — skill file format contract
- `docs/contributing/rules-format.md` — rule file format contract
- `skills/INDEX.md` — machine-readable skill index
- `skills/SKILL_AGENTS.md` — reverse index: skill → agents that use it
