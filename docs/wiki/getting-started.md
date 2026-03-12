# Getting Started with clarc

clarc is the workflow OS for Claude Code. 62 agents. 248 skills. 172 commands. A continuous learning loop. Wired together.

## Prerequisites

- [Claude Code](https://claude.ai/code) installed
- Node.js 18+
- Git

## Install

```bash
# Interactive wizard — detects your languages automatically
npx github:marvinrichter/clarc

# Or specify languages directly
npx github:marvinrichter/clarc typescript
npx github:marvinrichter/clarc python
npx github:marvinrichter/clarc go swift java
```

The installer:
1. Clones clarc to `~/.clarc/`
2. Symlinks agents, commands, and rules into `~/.claude/`
3. Never overwrites your existing `~/.claude/` files

## Verify

```bash
npx github:marvinrichter/clarc doctor
```

Expected output:
```
✅ Node.js 20.x
✅ ~/.claude/ exists
✅ Agents: 62 installed
✅ Skills: 248 installed
✅ Commands: 172 installed
✅ Hooks: active
✅ clarc version: 0.9.0

All checks passed!
```

## First Steps in Claude Code

After installation, open Claude Code and run:

```
/quickstart
```

This gives you a guided tour of the most important workflows for your task.

## Keep clarc Updated

```bash
cd ~/.clarc && git pull
```

Symlinks update instantly — no re-install needed.

## Install for Other Editors

```bash
npx github:marvinrichter/clarc --target cursor typescript    # Cursor
npx github:marvinrichter/clarc --target opencode typescript  # OpenCode
npx github:marvinrichter/clarc --target codex               # Codex CLI
```

## Next Steps

- [The clarc Way](./clarc-way.md) — understand the development methodology
- [Agents Reference](./agents-reference.md) — all agents and when they activate
- [Commands Reference](./commands-reference.md) — all slash commands
- [FAQ](./faq.md) — common questions
