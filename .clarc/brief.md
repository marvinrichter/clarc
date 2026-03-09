# clarc

## What it is
clarc is a workflow OS for Claude Code — a curated collection of agents, skills, commands, hooks, rules, and a continuous learning flywheel for modern software engineering. It turns Claude Code from a coding assistant into a structured, opinionated engineering system.

Published as `npx github:marvinrichter/clarc` and symlinked into `~/.claude/` on install.

## Tech stack
- Language: JavaScript (Node.js, no TypeScript)
- Package manager: npm
- Test framework: Node.js built-in test runner (`node tests/run-all.js`)
- Install: `npx` wizard via `scripts/setup-wizard.js`
- No build step — everything is plain Markdown + JSON + JS

## Key numbers (keep in sync with README.md)
- Agents: 60
- Skills: 214
- Commands: 136
- Rule sets: 20+ (common + language-specific)

## Repository layout
```
agents/           Subagent definitions (YAML frontmatter + instructions)
skills/           Domain knowledge (one SKILL.md per topic)
skills/INDEX.md   Machine-readable skill catalog
commands/         Slash commands (/tdd, /plan, /breakdown, ...)
hooks/hooks.json  Hook definitions → scripts/hooks/*.js
rules/            Always-on guidelines (common/ + language dirs)
scripts/          Node.js utilities (hooks, analytics, CI)
mcp-server/       clarc MCP server (4 tools)
docs/             Hub, specs, memory-bank standard
tests/            Test suite for scripts
```

## Key conventions
- File naming: lowercase with hyphens (`python-reviewer.md`, `tdd-workflow.md`)
- Commit format: conventional commits (feat/fix/chore/docs/test/perf/ci), English
- Versioning: canonical in `package.json` (current: 0.9.0, pre-launch)
- Branching: one branch + PR per roadmap topic, never commit directly to `main`
- No git push without explicit user request

## Critical files
- `scripts/hooks/session-start.js` — loads SKILL_MAP, package manager, glob-rule-matching
- `scripts/hooks/auto-checkpoint.js` — PostToolUse git checkpoint (enables `/undo`)
- `scripts/hooks/post-edit-format-dispatch.js` — auto-format after Edit
- `scripts/setup-wizard.js` — npx entry point
- `install.sh` — symlink installer (`--check`, `--target`, `--enable-learning`)
- `hooks/hooks.json` — all hook definitions

## Roadmap
All roadmaps v2–v26 completed. See `~/.claude/projects/.../memory/roadmaps/done/`.
Ideas backlog: `~/.claude/projects/.../memory/ideas-backlog.md` (I01–I60).
