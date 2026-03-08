# clarc — Codex CLI Instructions

**clarc** is a production-grade Claude Code workflow OS — agents, skills, hooks, commands, rules, and a continuous learning flywheel for modern software engineering.

## How to Use clarc with Codex

All clarc slash commands are available in `codex/commands/`. Invoke them by name:

```
/tdd
/plan
/code-review
/build-fix
/e2e
```

## Architecture

- **agents/** — Specialized subagents for delegation (planner, code-reviewer, tdd-guide, etc.)
- **skills/** — Domain knowledge loaded on demand (`skills/<name>/SKILL.md`)
- **commands/** — Slash commands invoked by users
- **hooks/** — Trigger-based automations
- **rules/** — Always-follow language guidelines
- **scripts/** — Cross-platform Node.js utilities

## Global Coding Standards

### Immutability (CRITICAL)

Always create new objects, never mutate existing ones. Immutable data prevents hidden side effects.

### Error Handling

Handle errors explicitly at every level. Never silently swallow errors.

### Input Validation

Validate all user input at system boundaries. Fail fast with clear error messages.

### File Organization

Many small files over few large files. 200–400 lines typical, 800 max. Organize by feature/domain.

## Development Notes

- Package manager: npm, pnpm, yarn, or bun (auto-detected)
- File naming: lowercase with hyphens (`python-reviewer.md`, `tdd-workflow.md`)
- Agent format: Markdown with YAML frontmatter (name, description, tools, model)
- Skill format: `SKILL.md` with frontmatter + When-to-Activate + code examples

## Code Quality Checklist

Before completing any task:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling at every level
- [ ] No hardcoded secrets or magic values
- [ ] Tests written (TDD preferred)
