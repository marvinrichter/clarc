# FAQ

Common questions about clarc.

---

## Installation

### How do I install clarc?

```bash
npx github:marvinrichter/clarc typescript   # or python, go, swift, java, ...
```

### Why `npx github:marvinrichter/clarc` and not `npx clarc`?

The GitHub-direct install is intentional. It eliminates the npm registry as an attack vector (supply chain security). `npx github:...` clones directly from the verified source — no intermediary.

### How do I check if clarc is installed correctly?

```bash
npx github:marvinrichter/clarc doctor
# or in Claude Code: /doctor
```

### How do I update clarc?

```bash
cd ~/.clarc && git pull
```

Symlinks update instantly. No re-install needed.

### Can I install for multiple languages?

```bash
npx github:marvinrichter/clarc typescript python go
```

---

## Using clarc

### Where do I start?

Run `/quickstart` in Claude Code for a guided tour. Or run `/clarc-way` for a recommendation based on your current task.

### I have too many commands. Which ones should I actually use?

The 5 most impactful:

| Command | Use it when |
|---------|------------|
| `/plan` | Starting anything non-trivial |
| `/tdd` | Writing new code or fixing bugs |
| `/code-review` | Before every commit |
| `/commit-push-pr` | Shipping |
| `/clarc-way` | Unsure what to do |

### Do I need to run every command manually?

No. Most agents activate automatically. `code-reviewer` runs after you write code, `security-reviewer` when you touch auth/APIs, `build-error-resolver` when the build fails. You don't have to invoke them — clarc does it.

### What's the difference between agents and skills?

- **Agents** are Claude subagents that do work (plan, review, test, build).
- **Skills** are knowledge files that Claude reads to understand a domain (TypeScript patterns, PostgreSQL optimization, the clarc Way methodology).

Agents act. Skills inform.

### Can I create my own agents and skills?

Yes. Add them to `~/.claude/agents/` or `~/.claude/skills/`. clarc's installer never overwrites files that already exist there. Use `/skill-create` to generate a skill from your project's git history.

---

## Methodology

### Do I have to follow The clarc Way?

No. Skip phases that don't apply. A bug fix doesn't need `/idea` and `/evaluate`. A chore doesn't need `/tdd`. The skip matrix in [The clarc Way](./clarc-way.md) tells you what to skip.

### What's the difference between clarc and SPARC?

Both are structured AI development methodologies. clarc is more tooling-integrated — every phase has dedicated commands and agents. clarc also has a continuous learning loop (instincts → skills) that improves the system over time. See the comparison table in [The clarc Way skill](../../skills/clarc-way/SKILL.md).

### Why test-first? Can I write implementation before tests?

You can, but clarc won't auto-validate it. TDD is the quality gate. A test written after implementation doesn't prove the code is correct — it proves the implementation and test are consistent. Writing the test first forces you to define the expected behavior before you're influenced by how you happened to implement it.

---

## Hooks & Automation

### What do hooks do?

Hooks run automatically at specific events:
- **Auto-checkpoint**: saves a git snapshot after every file edit (enables `/undo`)
- **Session start**: loads the session context, detects your package manager
- **Session end**: saves session state, triggers weekly instinct digest
- **Auto-format**: formats code after edits (language-specific)

### My hooks aren't running. What's wrong?

Run `/doctor` — it checks hooks.json validity. Common causes:
- `hooks.json` has a JSON syntax error
- The hooks directory isn't in the right location (`~/.claude/hooks/`)

---

## Contributing

### How do I contribute a skill or agent?

See [CONTRIBUTING.md](../../CONTRIBUTING.md). Skills are Markdown files in `skills/<name>/SKILL.md`. Agents are Markdown files with YAML frontmatter in `agents/<name>.md`. Open a PR with your addition.

### I found a bug. Where do I report it?

[GitHub Issues](https://github.com/marvinrichter/clarc/issues). For questions, use [GitHub Discussions](https://github.com/marvinrichter/clarc/discussions).
