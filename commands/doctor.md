---
description: "Health-check for your clarc installation. Verifies agents, skills, commands, hooks, symlinks, MEMORY.md size, and available updates. Runs scripts/doctor.js."
---

# Doctor Command

Checks that your clarc installation is complete and healthy.

## What It Checks

| Check | Pass | Warn | Fail |
|-------|------|------|------|
| Node.js version | >=18 | — | <18 |
| `~/.claude/` exists | ✅ | — | missing |
| Agents | >=10 installed | 1–9 | none |
| Skills | >=20 installed | 1–19 | none |
| Commands | >=20 installed | 1–19 | none |
| hooks.json | valid JSON | not found | syntax error |
| Symlinks | all healthy | — | any broken |
| MEMORY.md | <180 lines | 180–200 | >200 (truncated) |
| clarc version | current | update available | — |
| Rules version | current (<30 days) | >30 days or update available | — |

## Usage

```bash
# From the CLI
npx github:marvinrichter/clarc doctor

# As a slash command in Claude Code
/doctor

# Directly
node ~/.clarc/scripts/doctor.js
```

## Example Output

```
clarc doctor — checking your installation

✅ Node.js 20.11.0
✅ ~/.claude/ exists
✅ Agents: 61 installed
✅ Skills: 228 installed
✅ Commands: 160 installed
✅ Hooks: active (12 hooks)
✅ Symlinks: 59 healthy
⚠️  MEMORY.md: 193 lines (approaching 200-line limit — clean up soon)
✅ clarc version: 1.0.0
✅  clarc is up to date
   → Run: cd ~/.clarc && git pull
⚠️  Rules: v0.9.0 → v1.0.0 available (47 days ago)
   → Run: /update-rules  or  cd ~/.clarc && git pull && ./install.sh

3 warnings
```

## Common Fixes

**Agents/skills/commands missing:**
```bash
npx github:marvinrichter/clarc typescript   # re-run installer
```

**Broken symlinks:**
```bash
cd ~/.clarc && git pull                     # update local clone
npx github:marvinrichter/clarc typescript  # re-link
```

**MEMORY.md too long:**
Move older entries to topic files (e.g., `debugging.md`, `patterns.md`) and link from `MEMORY.md`.

**hooks.json syntax error:**
Open `~/.claude/hooks/hooks.json` and fix the JSON. Use a linter: `node -e "JSON.parse(require('fs').readFileSync('~/.claude/hooks/hooks.json','utf8'))"`.

**Rules outdated:**
Run `/update-rules` to apply the latest rules, or manually: `cd ~/.clarc && git pull && ./install.sh`

## Related

- Command: `/quickstart` — first-time onboarding
- Command: `/clarc-way` — interactive workflow guide
- Command: `/update-rules` — apply latest rule updates
- Command: `/rules-diff` — preview changes before applying

## After This

- `/update-rules` — apply rule updates if staleness is detected
- `/quickstart` — run interactive onboarding if setup gaps are found
