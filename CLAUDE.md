# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**clarc** is a production-grade Claude Code workflow OS — agents, skills, hooks, commands, rules, and a continuous learning flywheel for modern software engineering.

## Running Tests and Linting

```bash
# Lint (ESLint + markdownlint) — run before every commit
npm run lint

# Full validation: component validators + full test suite
npm test

# Tests only (faster — skips component validators)
node tests/run-all.js

# Run a single test file
node tests/ci/language-rule-globs.test.js
node tests/hooks/hooks.test.js
```

Node.js ≥22 required (`"engines": { "node": ">=22" }` in package.json).

## Architecture

The project is organized into several core components:

- **agents/** - Specialized subagents for delegation (planner, code-reviewer, tdd-guide, etc.)
- **skills/** - Workflow definitions and domain knowledge (coding standards, patterns, testing)
- **commands/** - Slash commands invoked by users (/tdd, /plan, /e2e, etc.)
- **hooks/** - Trigger-based automations (session persistence, pre/post-tool hooks)
- **rules/** - Always-follow guidelines (security, coding style, testing requirements)
- **mcp-configs/** - MCP server configurations for external integrations
- **scripts/** - Cross-platform Node.js utilities for hooks and setup
- **tests/** - Test suite for scripts and utilities

## Key Commands

- `/quickstart` - Interactive onboarding for new users (first 5 minutes)
- `/clarc-way` - Interactive workflow guide (what to do for any task)
- `/doctor` - Health-check the clarc installation
- `/tdd` - Test-driven development workflow
- `/plan` - Implementation planning
- `/e2e` - Generate and run E2E tests
- `/code-review` - Quality review
- `/build-fix` - Fix build errors
- `/session-cost` - Show estimated token/cost breakdown for current session
- `/learn-eval` - Extract patterns from sessions (with quality gate)
- `/skill-create` - Generate skills from git history

## Install (for users of clarc)

```bash
npx github:marvinrichter/clarc              # interactive wizard
npx github:marvinrichter/clarc typescript   # explicit, skip wizard
npx github:marvinrichter/clarc --copy typescript  # copy instead of symlink
npx github:marvinrichter/clarc doctor       # health-check installation
```

The wizard clones clarc to `~/.clarc/` on first run, then symlinks agents, commands, and rules into `~/.claude/`. Users' own files in `~/.claude/` are never overwritten.
Update: `cd ~/.clarc && git pull` — symlinks update instantly, no re-install.

## Development Notes

- Package manager detection: npm, pnpm, yarn, bun (configurable via `CLAUDE_PACKAGE_MANAGER` env var or project config)
- Cross-platform: Windows, macOS, Linux support via Node.js scripts
- Install wizard: `scripts/setup-wizard.js` — bin entry for `npx github:marvinrichter/clarc`
- ESLint enforces `preserve-caught-error` — re-thrown errors must include `{ cause: err }`

## File formats

File naming: lowercase with hyphens (e.g., `python-reviewer.md`, `tdd-workflow.md`)

- **Agents**: YAML frontmatter (`name`, `description`, `tools`, `model`) + instruction body
- **Skills**: `SKILL.md` with frontmatter + sections (When to Activate, patterns, examples)
- **Commands**: Markdown with `description` frontmatter
- **Hooks**: JSON with `matcher` and `hooks` array
- **Language rules**: YAML frontmatter must include `globs:` (file patterns) and `alwaysApply: false` — enforced by `scripts/ci/validate-language-rule-globs.js`. `common/` rules are exempt (they always apply).

## Self-Development Workflow (Clarc-on-Clarc)

When developing clarc itself, ALWAYS use these agents after modifying the corresponding files:

| File changed | Agent / tool to use |
|---|---|
| `agents/*.md` | `agent-quality-reviewer` agent |
| `skills/**/*.md` | `skill-depth-analyzer` agent |
| `commands/*.md` | `command-auditor` agent |
| `scripts/*.js` | `code-reviewer` agent (routes to `typescript-reviewer`) |
| `hooks/hooks.json` | `hook-auditor` agent |
| `rules/common/**/*.md` | `node scripts/ci/validate-rule-format.js` |
| `rules/<lang>/**/*.md` | `node scripts/ci/validate-language-rule-globs.js` |

These checks are MANDATORY — not optional. Do not mark any task complete without running the relevant agent first.

## Documentation Maintenance (MANDATORY)

Whenever components are added or removed, update counts in **both** `README.md` and `AGENTS.md` immediately. Do not defer this — stale counts in docs are a recurring source of confusion.

### Count update triggers

| Change | Counts to update |
|---|---|
| Add/remove file in `agents/` | `README.md` tagline, `README.md` What's inside table, `AGENTS.md` intro + structure table |
| Add/remove directory in `skills/` | Same as above (count skill *directories* only — exclude `INDEX.md`, `SKILL_AGENTS.md`) |
| Add/remove file in `commands/` | Same as above |
| Add/remove directory in `rules/` | Same as above (count language dirs only — exclude `common/`, `README.md`, `CHANGELOG.md`, `RULES_VERSION`) |
| Add/remove file in `.opencode/commands/` | `README.md` multi-editor section OpenCode count |
| Add/remove file in `.cursor/rules/` | `README.md` multi-editor section Cursor count |
| Add/remove file in `codex/commands/` | `README.md` multi-editor section Codex count |

### How to get accurate counts

```bash
# Primary component counts
ls agents/*.md | wc -l                           # agents
ls -d skills/*/ | wc -l                          # skills (dirs only)
ls commands/*.md | wc -l                         # commands
ls -d rules/*/ | grep -v common | wc -l          # language rule sets

# Multi-editor counts
ls .opencode/commands/*.md | wc -l              # opencode commands
ls .cursor/rules/*.md | wc -l                   # cursor rules
ls codex/commands/*.md | wc -l                  # codex commands
```

### Other doc update rules

- **Rename or restructure a directory**: update any path references in `README.md`, `AGENTS.md`, `CLAUDE.md`, and relevant `SKILL.md` files
- **Change branding or variable names**: grep the entire repo for old names and update all occurrences (docs, comments, skill files, example code)
- **Add a new multi-editor target**: add an entry to the multi-editor section of `README.md`
- **Change install behavior**: update the Install section of `README.md` and `CLAUDE.md`

For new scripts (`scripts/*.js`): follow TDD — write the test in `tests/` before implementing.

## Versioning

The canonical version is in `package.json`. All version references across the project (README badges, install scripts, changelogs) must match `package.json`. Current version: `1.0.0`.
