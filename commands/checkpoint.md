---
description: Create or verify a workflow checkpoint — create, verify, list, and restore git-backed checkpoints with Memory Bank integration.
---

# Checkpoint Command

Create or verify a checkpoint in your workflow. Integrates with `.clarc/context.md` (Memory Bank) for context recovery after compaction.

## Usage

`/checkpoint [create|verify|list|restore] [name]`

| Action | When | Example |
|--------|------|---------|
| `create` | Before context compaction, after a milestone | `/checkpoint create core-done` |
| `verify` | After compaction, to confirm state vs. checkpoint | `/checkpoint verify core-done` |
| `restore` | After compaction, to recover context | `/checkpoint restore` |
| `list` | See all checkpoints with SHA + status | `/checkpoint list` |

---

## Phase 1 — Create Checkpoint

When creating a checkpoint:

1. Run `/verify quick` to ensure current state is clean
2. Create a git stash or commit with checkpoint name
3. Update `.clarc/context.md` with current progress (if `.clarc/` exists)
4. Log checkpoint to `.claude/checkpoints.log`:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
```

5. If `.clarc/` exists, write context snapshot:

```bash
cat > .clarc/context.md << EOF
# Checkpoint: $CHECKPOINT_NAME — $(date +%Y-%m-%d)

## What was done
[summarize completed tasks]

## Current state
[what files were modified, what decisions were made]

## Next steps
[what comes after this checkpoint]
EOF
```

6. Report checkpoint created

## Phase 2 — Verify Checkpoint

When verifying against a checkpoint:

1. Read checkpoint from log
2. Compare current state to checkpoint:
   - Files added since checkpoint
   - Files modified since checkpoint
   - Test pass rate now vs then
   - Coverage now vs then

3. Report:
```
CHECKPOINT COMPARISON: $NAME
============================
Files changed: X
Tests: +Y passed / -Z failed
Coverage: +X% / -Y%
Build: [PASS/FAIL]
```

## Phase 3 — Restore from Checkpoint

When recovering after context compaction:

1. Read `.clarc/context.md` (Memory Bank — most current state)
2. Read checkpoint log: `cat .claude/checkpoints.log`
3. Show git log since checkpoint: `git log --oneline <SHA>..HEAD`
4. Summarize what was done and what remains
5. Suggest next action

## List Checkpoints

Show all checkpoints with:
- Name
- Timestamp
- Git SHA
- Status (current, behind, ahead)

## Workflow

Typical checkpoint flow:

```
[Start] --> /checkpoint create "feature-start"
   |
[Implement] --> /checkpoint create "core-done"
   |
[90-min mark] --> /checkpoint create "context-save"  ← prevents context loss
   |
[/compact needed] --> /checkpoint verify "core-done"  ← restore after compaction
   |
[Test] --> /checkpoint verify "core-done"
   |
[Refactor] --> /checkpoint create "refactor-done"
   |
[PR] --> /checkpoint verify "feature-start"
```

## Context Warning Integration

The session-end hook warns when:
- Session has run > 90 minutes AND
- `.clarc/context.md` does not exist or is more than 60 minutes old

When this warning fires, run:
```
/checkpoint create auto-$(date +%H%M)
```

## Arguments

$ARGUMENTS:
- `create <name>` — Create named checkpoint + update Memory Bank
- `verify <name>` — Verify against named checkpoint
- `restore` — Restore context from latest checkpoint + `.clarc/context.md`
- `list` — Show all checkpoints
- `clear` — Remove old checkpoints (keeps last 5)

## After This

- `/verify` — run full build + tests to confirm the checkpointed state is clean
- `/undo` — if the checkpoint reveals the last changes were wrong, undo to previous state
