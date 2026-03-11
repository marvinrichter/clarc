---
description: Sync team clarc installation — pull latest clarc + private rules/skills, re-run team install
---

# Team Sync

Keep your team clarc installation up to date.

## Usage

`/team-sync`

## What It Does

1. **Pull latest clarc** — update `~/.clarc` from remote
2. **Pull team config** — update private rules/skills repo if configured
3. **Re-apply installation** — install new/updated rules and skills
4. **Report changes** — show what was updated

## Behavior

Run the following sequence:

```bash
# Step 1: Update clarc core
cd ~/.clarc && git pull --ff-only

# Step 2: Update team config (if exists)
TEAM_CONFIG_DIR="${CLARC_TEAM_CONFIG:-$HOME/company-clarc}"
if [ -d "$TEAM_CONFIG_DIR/.git" ]; then
  cd "$TEAM_CONFIG_DIR" && git pull --ff-only
fi

# Step 3: Re-run team install
if [ -f "$TEAM_CONFIG_DIR/install-team.sh" ]; then
  bash "$TEAM_CONFIG_DIR/install-team.sh"
else
  # Fallback: standard install
  bash ~/.clarc/install.sh
fi
```

## Configuration

Set `CLARC_TEAM_CONFIG` in your shell profile to point to your team config repo:

```bash
# ~/.zshrc or ~/.bashrc
export CLARC_TEAM_CONFIG="$HOME/acme/company-clarc"
```

## After Syncing

After `/team-sync`:
- New agents available immediately (symlinks updated)
- New rules are active in the next Claude session
- Run `/doctor` to verify installation health

## See Also

- Skill `team-foundation` — full team setup guide
- `install.sh --team-mode` — initial team installation
- `/doctor` — verify clarc health after sync

## After This

- `/doctor` — verify clarc health after syncing
- `/update-rules` — apply latest rules after sync
