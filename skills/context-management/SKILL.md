---
name: context-management
description: Context window auto-management — signals, strategies, and recovery protocol. Detects approaching context limits and guides compact vs checkpoint decisions to prevent lost work.
version: 1.0.0
---

# Context Window Auto-Management

Strategies for detecting, responding to, and recovering from context window pressure. The session-end hook warns when sessions exceed 90 minutes without a `.clarc/context.md`, prompting a checkpoint.

## When to Activate

- Claude suggests `/compact` or context is nearing capacity
- Session has been running for 90+ minutes
- User is mid-task and worried about context loss
- After recovering from a context reset
- Planning a large multi-file implementation
- Starting a multi-phase refactor that will span more than 20 files so checkpoints are created between phases to prevent losing progress
- Recovering a session after an unexpected compaction wiped the conversation state mid-task and the next steps are unclear
- Setting up a new project to use the `.clarc/` memory bank so session-end hooks automatically persist context across restarts

## Context Pressure Signals

### Warning Signs (Act Proactively)

| Signal | Threshold | Action |
|--------|-----------|--------|
| Session length | > 90 min | Create `.clarc/context.md` checkpoint |
| File count in task | > 20 files | Split into phases with checkpoints |
| Token estimate | > 80% of window | `/compact` or summarize |
| Repeated context loads | Same files > 3x | Extract summary to working file |
| Tool call depth | > 50 in session | `/checkpoint create` before continuing |

### Critical Signs (Act Immediately)

- Claude stops referencing earlier conversation correctly
- Responses become repetitive or miss established constraints
- System suggests `/compact` automatically
- Context compaction triggers mid-task

## Strategies

### 1. Checkpoint Before Compaction

Before running `/compact`, always checkpoint:

```
/checkpoint create pre-compact
```

The checkpoint records:
- Current git SHA
- Files modified so far
- Completed vs remaining tasks

After compaction, restore with:
```
/checkpoint verify pre-compact
cat .clarc/context.md
```

### 2. Memory Bank as Persistent State

`.clarc/context.md` is the canonical session handoff document (written by session-end hook automatically). Keep it current during long sessions:

```markdown
# Session Context — 2026-03-09

## Current focus
- Implementing REST API authentication middleware
- Files: src/middleware/auth.ts, tests/unit/auth.test.ts

## Progress
- [x] JWT validation logic
- [x] Unit tests passing
- [ ] Integration test
- [ ] Rate limiting

## Key decisions
- Using RS256 (not HS256) for multi-service JWT
- Middleware runs before route handlers

## Next steps
1. Write integration test (src/tests/integration/auth.test.ts)
2. Add rate limiting (src/middleware/rate-limit.ts)
```

Update manually at logical milestones or run:
```bash
/checkpoint create milestone-name
```

### 3. Progressive Summarization

For large tasks spanning many files, summarize as you go:

**Working summary pattern:**
1. Read N files
2. Summarize findings in one working note
3. Read next N files (use summary, not all N files)
4. Repeat until done

This reduces re-reading costs and fits more analysis in the context window.

### 4. Phase-Based Implementation

Break large implementations into phases, each fitting in one context window:

```
Phase 1: Plan + design (separate session or first context)
  Output: docs/specs/feature-plan.md

Phase 2: Core implementation
  Input: feature-plan.md (small, loaded fresh)
  Output: core files

Phase 3: Tests + edge cases
  Input: feature-plan.md + list of core files
  Output: test files

Phase 4: Review + cleanup
  Input: git diff (compact representation)
  Output: final commits
```

Each phase starts fresh with minimal context load.

## Recovery Protocol

When context has been lost or compacted mid-task:

```
1. Read .clarc/context.md       # Memory Bank (if exists)
2. Run: git log --oneline -10    # Recent commits
3. Run: git diff HEAD            # Current changes
4. Run: git stash list           # Any stashed work
5. Read checkpoint log:
   cat .claude/checkpoints.log
6. Reconstruct state and continue
```

If `.clarc/context.md` is up to date, recovery takes < 2 minutes.

## Hook Integration

The session-end hook (`scripts/hooks/session-end.js`) automatically:
- Writes `.clarc/context.md` at session end (if `.clarc/` exists)
- Appends to `.clarc/progress.md`
- Warns after 90-minute sessions without a context checkpoint

To opt in: `mkdir .clarc` in your project root.

## Context Window Budget

Approximate token budget guidance (128k context window):

| Component | Typical tokens | Notes |
|-----------|---------------|-------|
| System prompt + rules | ~8k | Fixed |
| Conversation history | ~40k | Grows over session |
| Working files | ~30k | Keep focused |
| Tool outputs | ~20k | Flush when done |
| **Available for new work** | **~30k** | After 90 min session |

When available budget drops below ~20k: checkpoint + compact.
