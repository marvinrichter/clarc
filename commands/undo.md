---
description: Undo last clarc auto-checkpoint (restores files to state before last Edit/Write)
---

# /undo — Restore Last Checkpoint

Restores the repository to the state before the last auto-checkpoint created by clarc's PostToolUse hook.

## How It Works

The `auto-checkpoint` hook creates a Git checkpoint after every `Edit` or `Write` tool call:
- **stash strategy**: used when no initial commit exists → undo via `git stash pop`
- **commit strategy**: a `clarc-checkpoint [skip ci]` commit → undo via `git reset HEAD~1`

## Steps

1. Read `~/.clarc/checkpoints.log` — find the most recent checkpoint entry
2. Check for uncommitted changes that would be lost:
   - If dirty working tree: warn the user before proceeding
3. Determine strategy from the log entry:
   - `strategy: "stash"` → run `git stash pop`
   - `strategy: "commit"` → run `git reset HEAD~1`
4. Show which files were restored
5. Remove the log entry (or ask user if they want to keep it)

## Safety Checks

- **No checkpoints**: show "No checkpoints found. Nothing to undo."
- **Dirty working tree**: warn "You have uncommitted changes. Undo may cause conflicts. Continue? [y/N]"
- **Wrong directory**: if `cwd` in log doesn't match current dir, warn the user

## Implementation

```bash
# Read last checkpoint
LAST=$(cat ~/.clarc/checkpoints.log | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const last=d[d.length-1];
if(!last){console.error('No checkpoints found.');process.exit(1);}
console.log(JSON.stringify(last));
")

# Extract strategy
STRATEGY=$(echo $LAST | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).strategy)")

if [ "$STRATEGY" = "stash" ]; then
  git stash pop
elif [ "$STRATEGY" = "commit" ]; then
  git reset HEAD~1
fi
```

## Usage Example

```
User: /undo
Claude: Last checkpoint: 2026-03-08T14:23:11Z (commit abc1234)
        Files restored: src/api/users.ts, src/api/auth.ts
        Undo complete. Working tree restored to state before last Edit.
```

## Related

- `scripts/hooks/auto-checkpoint.js` — creates checkpoints automatically
- `~/.clarc/checkpoints.log` — checkpoint history (JSON array, max 50 entries)
- `/cost` — view session cost estimates
