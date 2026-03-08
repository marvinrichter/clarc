---
description: Audit the clarc command system for UX ergonomics — naming consistency, argument design, feedback loops, step count, agent invocation, overlap detection, missing commands, and built-in conflicts. Produces a tabular overview and issue list. Use /command-audit --all for a full system audit.
---

# Command Audit

Invoke the **command-auditor** agent to evaluate the clarc command system as a coherent UX surface.

## Usage

```
/command-audit <command-name>    — audit a specific command
/command-audit --all             — audit all commands as a system
```

## What It Audits

### System-Level (evaluated across all commands)

| Dimension | Weight | What it checks |
|-----------|--------|---------------|
| Naming Consistency | 20% | `verb-noun` pattern, lowercase-hyphen, consistent across similar commands |
| Overlap Detection | 15% | Semantically duplicate commands that do the same thing |
| Missing Commands | 15% | Important scenarios or agents without corresponding commands |
| Argument Design | 15% | `$ARGUMENTS` documented? Required vs. optional clear? Examples provided? |
| Feedback Loop | 10% | Progress shown? Results confirmed? Next steps suggested? |
| Step Count | 10% | Ideal: 3–6 steps. <2 = too thin; >8 = overwhelming |
| Built-in Conflicts | 10% | No collision with Claude Code built-ins (help, clear, exit, etc.) |
| Agent Invocation | 5% | All agent delegations explicit and pointing to existing agents? |

**Weighted score:**
```
overall = naming×0.20 + overlap×0.15 + missing×0.15 + arguments×0.15 +
          feedback×0.10 + steps×0.10 + builtin×0.10 + invocation×0.05
```

## Output

### System Audit (`/command-audit --all`)

```
## Command System Audit

Total commands: 45
Overall system score: 7.8 / 10

### Dimension Scores
| Dimension | Score | Note |
|-----------|-------|------|
| Naming Consistency | 9 | All lowercase-hyphen |
| Overlap Detection | 7 | code-review / typescript-review: 80% overlap |
| Missing Commands | 6 | No command for: database-review, incident, debugging |
...

### Issues
| Severity | Dimension | Finding | Suggestion |
|----------|-----------|---------|------------|
| MEDIUM | missing_commands | No command for database-review agent | Add commands/database-review.md |
```

### Per-Command Table

```
| Command | Steps | Agent | Feedback | Issues |
|---------|-------|-------|----------|--------|
| tdd | 5 | tdd-guide ✓ | ✓ | — |
| code-review | 4 | code-reviewer ✓ | ✓ | MEDIUM: overlaps typescript-review |
```

Results saved to `docs/system-review/command-audit-<date>.json`.

## Steps Claude Should Follow

1. **Delegate to command-auditor**: Launch with `--all` or specific command name
2. **For system audit**: Display the dimension scores table, then the issues table
3. **Per-command table**: Show all commands with their step count, agent, and any issues
4. **Save results**: Write to `docs/system-review/command-audit-YYYY-MM-DD.json`
5. **Suggest fixes**: For each HIGH issue, provide concrete remediation
