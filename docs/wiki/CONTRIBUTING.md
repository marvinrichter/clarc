# Contributing to clarc

clarc is open to contributions of agents, skills, commands, bug fixes, and documentation improvements.

## What You Can Contribute

| Type | Where | Format |
|------|-------|--------|
| Agent | `agents/<name>.md` | YAML frontmatter + instructions |
| Skill | `skills/<name>/SKILL.md` | Frontmatter + sections |
| Command | `commands/<name>.md` | `description` frontmatter + Markdown |
| Bug fix | Any file | Standard PR |
| Documentation | `docs/wiki/` | Markdown |
| Community pattern | GitHub Discussions | See [community-patterns.md](./community-patterns.md) |

## Prerequisites

- Node.js 18+
- Git
- Claude Code (to test your contribution)

## Setup

```bash
git clone https://github.com/marvinrichter/clarc.git
cd clarc
npm install
```

## Creating a Skill

Skills encode domain knowledge. They're loaded on-demand when Claude detects relevance.

```bash
mkdir skills/my-skill
```

```markdown
<!-- skills/my-skill/SKILL.md -->
---
name: my-skill
description: "One sentence: what this skill covers and when Claude activates it."
---

# My Skill

## When to Activate

- Clear trigger condition 1
- Clear trigger condition 2

## Core Patterns

[Patterns, examples, code snippets]

## Anti-Patterns

[What NOT to do and why]
```

**Good skill checklist:**
- [ ] `description` frontmatter is one sentence, specific about when it activates
- [ ] "When to Activate" section has concrete triggers
- [ ] Includes code examples (not just prose)
- [ ] Has Anti-Patterns section
- [ ] Under 600 lines

## Creating a Command

Commands are slash commands users invoke in Claude Code.

```markdown
<!-- commands/my-command.md -->
---
description: "One sentence description shown in command picker."
---

# My Command

What this command does and when to use it.

## How It Works

Step-by-step explanation.

## Example

[Concrete usage example]
```

## Creating an Agent

Agents are Claude subagents that do specialized work.

```markdown
<!-- agents/my-agent.md -->
---
name: my-agent
description: "When to use this agent. Be specific about the trigger."
tools: Read, Grep, Glob, Bash
model: sonnet
---

# My Agent

[Instructions for the agent]
```

## Running Tests

```bash
npm test
```

This validates agents, commands, skills, hooks, and runs unit tests.

## Validation

Before opening a PR, verify your contribution passes validation:

```bash
node scripts/ci/validate-agents.js      # if you added an agent
node scripts/ci/validate-commands.js    # if you added a command
node scripts/ci/validate-skills.js      # if you added a skill
node scripts/ci/validate-hooks.js       # if you modified hooks
```

## PR Checklist

- [ ] `npm test` passes
- [ ] Skill/agent/command description is specific and actionable
- [ ] No hardcoded secrets or personal data
- [ ] Follows existing file naming (lowercase-with-hyphens)
- [ ] PR description explains the use case

## File Naming

All files use lowercase with hyphens:
- `my-new-skill/SKILL.md`
- `my-command.md`
- `my-agent.md`

## Questions

Use [GitHub Discussions → Q&A](https://github.com/marvinrichter/clarc/discussions) for questions before opening a PR.
