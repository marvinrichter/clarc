---
name: team-foundation
description: Team Workflow OS — shared clarc setup for engineering teams. Covers shared rules distribution, private skill packs, team sync patterns, onboarding, and multi-developer conventions.
version: 1.0.0
---

# Team Foundation

Patterns and workflows for running clarc as a shared engineering team OS — consistent rules, private skill packs, and synchronized conventions across all developers.

## When to Activate

- Setting up clarc for a team of 2+ engineers
- User runs `/team-sync`
- Onboarding a new developer to a team using clarc
- Distributing private rules or skills across a team
- Defining team-wide workflow conventions
- Creating a `company-clarc` private repository to house organization-specific rules and skills
- Troubleshooting why a team member's Claude session does not pick up the shared rules after an update

## Team Installation Model

### Standard Team Setup

```bash
# Team lead: create private rules + skills
mkdir -p ~/.company/private-rules ~/.company/private-skills

# Install for all team members via shared command
./install.sh --team-mode \
             --company-prefix acme \
             --private-rules ~/.company/private-rules \
             --private-skills ~/.company/private-skills \
             typescript

# Each developer runs the same command
# → ~/.claude/rules/acme/ (private rules)
# → ~/.claude/skills/acme/ (private skills)
```

### Distribution via Git

**Recommended:** Store team config in a private git repo:

```
company-clarc/
├── install-team.sh          # wrapper: calls clarc install.sh + team flags
├── private-rules/
│   ├── api-standards.md     # company API conventions
│   ├── security-policy.md   # internal security requirements
│   └── code-review.md       # review checklist
├── private-skills/
│   ├── deploy-flow/SKILL.md # company-specific deploy workflow
│   └── pr-process/SKILL.md  # internal PR process
└── README.md
```

`install-team.sh`:
```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLARC_DIR="${HOME}/.clarc"
if [[ ! -d "$CLARC_DIR" ]]; then
  git clone https://github.com/marvinrichter/clarc.git "$CLARC_DIR"
fi
bash "$CLARC_DIR/install.sh" \
  --team-mode \
  --company-prefix acme \
  --private-rules "$SCRIPT_DIR/private-rules" \
  --private-skills "$SCRIPT_DIR/private-skills" \
  "$@"
```

New developer onboarding:
```bash
git clone git@github.com:acme/company-clarc.git
cd company-clarc && ./install-team.sh typescript
```

## Private Rules Structure

Private rules follow the same format as clarc rules:

```
private-rules/
├── api-standards.md      # REST/GraphQL API conventions
├── security-policy.md    # Security requirements specific to company
├── code-review.md        # Custom review checklist
├── deployment.md         # Deployment process
└── incident-response.md  # On-call and incident protocols
```

Each file is a plain Markdown file. Claude loads them from `~/.claude/rules/<prefix>/` automatically.

## Private Skills Structure

Private skills use the standard clarc SKILL.md format:

```
private-skills/
├── deploy-flow/
│   └── SKILL.md          # "How to deploy at Acme"
├── feature-flags/
│   └── SKILL.md          # "Company feature flag process"
└── data-access/
    └── SKILL.md           # "Internal data access patterns"
```

## Team Sync Workflow

Run `/team-sync` to:

1. **Pull latest clarc** — `cd ~/.clarc && git pull`
2. **Pull team config** — `cd ~/company-clarc && git pull`
3. **Re-run team install** — apply any new private rules or skills
4. **Report diff** — what changed since last sync

## Team Conventions

### Shared CLAUDE.md

Add to the project `CLAUDE.md`:

```markdown
## Team clarc Setup

This project uses company-clarc. Install with:
  cd ~/company-clarc && ./install-team.sh typescript

Team rules are in `~/.claude/rules/acme/`:
- api-standards.md — REST API conventions
- security-policy.md — security requirements

Private skills available: /deploy-flow, /pr-process
```

### Preventing Rule Conflicts

- Company prefix isolates private rules: `~/.claude/rules/acme/`
- Private rules never overwrite clarc common rules
- Developers can still override any rule with their own version

## Onboarding Checklist

```
[ ] Clone company-clarc
[ ] Run ./install-team.sh <language>
[ ] Verify: ls ~/.claude/rules/acme/
[ ] Verify: ls ~/.claude/agents/ (should list 50+ agents)
[ ] Read CLAUDE.md in the project repository
[ ] Enable Memory Bank: mkdir .clarc (in project root)
[ ] Test: open Claude Code, run /doctor
```
