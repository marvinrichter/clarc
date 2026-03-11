---
description: "Configure clarc workflow hooks — enable/disable nudges, set cooldowns, view hook status. Creates/updates .clarc/hooks-config.json."
---

# /hooks-config

Configure clarc's workflow hook nudges for this project or globally.

## Usage

```
/hooks-config              → show current config and hook status
/hooks-config disable <id> → disable a specific nudge
/hooks-config enable <id>  → re-enable a disabled nudge
/hooks-config cooldown <id> <minutes> → set cooldown for a nudge
/hooks-config reset        → reset to defaults (remove config file)
/hooks-config --global     → apply changes globally (~/.clarc/) instead of project-local
```

## Available Hook IDs

| ID | What it does | Default |
|----|-------------|---------|
| `code-review-nudge` | Suggests code-reviewer after source file changes | enabled, 5-min cooldown |
| `security-scan-nudge` | Suggests security-reviewer for auth/token/api files | enabled |
| `doc-update-nudge` | Suggests /update-docs when new clarc components are written | enabled |
| `tdd-sequence-guard` | Warns when a source file has no test counterpart | enabled |
| `build-failure-router` | Suggests build-error-resolver on compile/type errors | enabled |

Note: `secret-guard` (blocks commits with secrets) is built into pre-bash-dispatch and cannot be disabled via this config.

## What to Do

1. Run `/hooks-config` first to see the current state
2. If a nudge is noisy for this project, disable it with `/hooks-config disable <id>`
3. For global changes, use `/hooks-config --global disable <id>`

## Examples

**Too many code-review nudges while iterating?**
```
/hooks-config cooldown code-review-nudge 30
```

**Not using TDD on this project?**
```
/hooks-config disable tdd-sequence-guard
```

**Disable all nudges for a spike/prototype branch?**
Add to `.clarc/hooks-config.json`:
```json
{
  "disabled": ["code-review-nudge", "security-scan-nudge", "doc-update-nudge", "tdd-sequence-guard"]
}
```

## Config File Format

**Project-local** (recommended): `.clarc/hooks-config.json`
**Global**: `~/.clarc/hooks-config.json`

Project-local takes precedence. Both files are read; `disabled` arrays are merged.

```json
{
  "disabled": ["tdd-sequence-guard"],
  "code_review_cooldown_minutes": 10
}
```

## Implementation

Read the current config:
```bash
cat .clarc/hooks-config.json 2>/dev/null || cat ~/.clarc/hooks-config.json 2>/dev/null || echo "(no config — all hooks enabled)"
```

Create or update `.clarc/hooks-config.json` with the requested changes. If `--global` flag is present, update `~/.clarc/hooks-config.json` instead.

After updating, confirm with a summary:
```
✔ hooks-config updated: .clarc/hooks-config.json
  disabled: [tdd-sequence-guard]
  code_review_cooldown_minutes: 10
```

## After This

- `/hook-audit` — audit the full hook system after configuration changes
- `/doctor` — verify clarc health after hook changes
