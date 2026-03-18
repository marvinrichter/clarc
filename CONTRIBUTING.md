# Contributing to clarc

clarc is open to contributions of agents, skills, commands, bug fixes, and documentation improvements.

For full contribution guidelines see [docs/wiki/CONTRIBUTING.md](docs/wiki/CONTRIBUTING.md).

## Quick start

**Prerequisites:** Node.js 18+, Git, Claude Code (to test your contribution)

```bash
git clone https://github.com/marvinrichter/clarc.git
cd clarc
npm install
```

## What you can contribute

| Type | Where | Notes |
|------|-------|-------|
| Agent | `agents/<name>.md` | YAML frontmatter + instructions |
| Skill | `skills/<name>/SKILL.md` | Frontmatter + sections |
| Command | `commands/<name>.md` | `description` frontmatter + Markdown |
| Bug fix | Any file | Standard PR |
| Documentation | `docs/wiki/` | Markdown |

## Commit format

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add rust-patterns skill
fix: correct trigger condition in python-reviewer agent
docs: update agent authoring guide
chore: bump eslint
```

## Reporting security issues

Do not open a public GitHub issue for security vulnerabilities. Email marvin@marvin-richter.de directly.
