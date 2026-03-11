# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**clarc** is a production-grade Claude Code workflow OS — agents, skills, hooks, commands, rules, and a continuous learning flywheel for modern software engineering.

## Running Tests

```bash
# Run all tests
node tests/run-all.js

# Run individual test files
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

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
- Agent format: Markdown with YAML frontmatter (name, description, tools, model)
- Skill format: Markdown with clear sections for when to use, how it works, examples
- Hook format: JSON with matcher conditions and command/notification hooks
- Install wizard: `scripts/setup-wizard.js` — bin entry for `npx github:marvinrichter/clarc`

## File formats

- Agents: Markdown with YAML frontmatter (name, description, tools, model)
- Skills: `SKILL.md` with frontmatter + sections (When to Activate, patterns, examples)
- Commands: Markdown with `description` frontmatter
- Hooks: JSON with matcher and hooks array

File naming: lowercase with hyphens (e.g., `python-reviewer.md`, `tdd-workflow.md`)

## Self-Development Workflow (Clarc-on-Clarc)

When developing clarc itself, ALWAYS use these agents after modifying the corresponding files:

| File changed | Agent / tool to use |
|---|---|
| `agents/*.md` | `agent-quality-reviewer` agent |
| `skills/**/*.md` | `skill-depth-analyzer` agent |
| `commands/*.md` | `command-auditor` agent |
| `scripts/*.js` | `code-reviewer` agent (routes to `typescript-reviewer`) |
| `hooks/hooks.json` | `hook-auditor` agent |
| `rules/**/*.md` | `node scripts/ci/validate-rule-format.js` |

These checks are MANDATORY — not optional. Do not mark any task complete without running the relevant agent first.

For new scripts (`scripts/*.js`): follow TDD — write the test in `tests/` before implementing.

## Versioning

The canonical version is in `package.json`. All version references across the project (README badges, install scripts, changelogs) must match `package.json`. Current version: `0.9.0` (pre-launch).
