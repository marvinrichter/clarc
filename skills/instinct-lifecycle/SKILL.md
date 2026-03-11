---
name: instinct-lifecycle
description: Full lifecycle management for clarc instincts — capture, scoring, decay, conflict resolution, promotion, and removal
triggers:
  - when managing instincts
  - when instinct confidence is low
  - when instincts conflict
  - when reviewing learning flywheel
  - when promoting instincts to global scope
---

# Instinct Lifecycle Skill

## Overview

Instincts in clarc accumulate over time via `/learn-eval`. Without lifecycle
management, stale and noisy instincts dilute the signal from useful ones.

This skill covers the complete lifecycle:

```
Capture → Score → Validate → Decay (if stale) → Promote (if high-confidence)
```

---

## Lifecycle Step Sequence

Follow this sequence to actively manage instincts — don't just let them accumulate passively:

### Phase 1: Capture (automatic)
- Sessions run → `/learn-eval` observes patterns → instincts created at `confidence: 0.60`
- No action needed. Instincts appear in `~/.claude/homunculus/projects/<hash>/instincts/`

### Phase 2: Score (manual, weekly)
1. Run `/instinct-report` to see the ranked list with trend indicators (↑↓→)
2. For each instinct that influenced your work this week, record an outcome:
   - `/instinct-outcome <id> good` — it helped
   - `/instinct-outcome <id> bad` — it caused problems
   - `/instinct-outcome <id> neutral` — it was applied but had no clear effect

### Phase 3: Validate (on conflict or confusion)
1. Run `/instinct-status` to check for conflicts
2. If conflicts shown: run `/evolve` to cluster and resolve them
3. Contradictory instincts surface as pairs — pick one or merge them

### Phase 4: Promote (when confidence ≥ 0.80 and usage ≥ 5)
1. Run `/instinct-report` — top-confidence instincts are promotion candidates
2. If an instinct appears in 2+ projects: run `/instinct-promote` to make it global
3. Optional: run `/instinct-promote --auto --dry-run` to review all candidates at once
4. Optional: run `/evolve` to cluster related high-confidence instincts into a skill or command

### Phase 5: Retire (automatic + manual)
- **Automatic**: unused 180+ days at < 0.50 confidence → auto-archived
- **Manual**: run `/instinct-report` → look for LOW CONFIDENCE section → archive via `/instinct-outcome <id> bad` (speeds up decay) or delete YAML file directly

**Cadence recommendation:**
- Weekly: run `/instinct-report` + record outcomes for work done that week
- Monthly: run `/evolve` to cluster and `/instinct-promote` to promote global patterns
- Quarterly: review archived instincts, delete permanently if no longer relevant

---

## Instinct Schema (v2)

Every instinct YAML file has these fields:

```yaml
---
id: test-first-workflow
trigger: "when writing new features"
confidence: 0.75
domain: testing
scope: project
created: 2026-01-15
last_used: 2026-03-08
usage_count: 12
positive_outcomes: 9
negative_outcomes: 1
neutral_outcomes: 2
decay_rate: standard
conflicts_with: ""
---

## Action
Always write a failing test before writing implementation code.

## Evidence
TDD catches integration issues early and improves design.
```

### Schema Migration

Existing instincts without the v2 fields can be migrated:

```bash
node scripts/instinct-schema-migrate.js            # preview
node scripts/instinct-schema-migrate.js --apply    # apply
```

---

## Confidence Model

### Initial State

```
created:          confidence = 0.60 (default from /learn-eval quality gate)
```

### Outcome Signals

| Signal  | Confidence change | When to use |
|---------|-------------------|-------------|
| `good`  | +0.05 (max 0.95)  | Instinct led to better outcome |
| `bad`   | -0.10 (min 0.10)  | Instinct caused problems or was wrong |
| `neutral` | no change       | Instinct was applied but outcome neutral |

Record via `/instinct-outcome <id> good|bad|neutral`.

### Decay (Automatic, Weekly)

| Condition | Effect |
|-----------|--------|
| Unused 30–89 days | confidence -= 0.02/week |
| Unused 90–179 days | Flagged in `/instinct-report` |
| Unused 180+ days AND confidence < 0.50 | Auto-archived |

Decay runs automatically at session end (SessionEnd hook, weekly gate).

### Promotion Threshold

An instinct qualifies for global promotion when:
- `confidence >= 0.80` AND `usage_count >= 5`
- Appears in 2+ projects (via `/instinct-promote --auto`)

Run `/instinct-promote` or `/instinct-promote --auto --dry-run` to review candidates.

### Deletion / Archiving

Instincts are **never automatically deleted** — they are archived:
- Archive path: `~/.claude/homunculus/.../archived/`
- Review archived instincts with `ls ~/.claude/homunculus/*/archived/`
- Permanently remove only after manual review

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/instinct-status` | Show all instincts with confidence bars |
| `/instinct-report` | Ranked list with trend indicators (↑↓→) |
| `/instinct-outcome <id> <good\|bad\|neutral>` | Record outcome for an instinct |
| `/evolve` | Cluster instincts into skills/commands/agents |
| `/instinct-export` | Export instincts for team sharing |
| `/instinct-import` | Import team instincts |

---

## Conflict Detection

Conflicts are detected when two instincts in the same domain contain
antonymous keywords (e.g., "prefer functional" vs "prefer class-based").

Conflicts are detected automatically during `/evolve` and `/instinct-status`.
Conflict report is stored in `~/.claude/homunculus/conflicts.json`.

**Resolution options:**
1. `/evolve` — review and choose which to keep
2. `/instinct-outcome <losing-id> bad` — reduce confidence of wrong instinct
3. `conflict-detector.py --fix` — auto-remove lower-confidence instinct

---

## Flywheel: Full Weekly Workflow

```
Monday (automatic on session end):
  1. instinct-decay.js — decay stale instincts
  2. weekly-evolve digest — suggest /evolve run

During the week:
  3. /instinct-outcome <id> good|bad — record outcomes after noticing instinct impact
  4. /instinct-report — review confidence ranking

Monthly:
  5. /evolve — cluster high-confidence instincts into skills/commands
  6. /instinct-promote --auto --dry-run — review global promotion candidates
  7. Remove archived instincts that are no longer relevant
```

---

## Troubleshooting

**Instinct confidence not updating:**
- Ensure the instinct file has the v2 schema fields (`node scripts/instinct-schema-migrate.js --stats`)
- Run `node scripts/instinct-outcome-tracker.js --list` to verify instinct IDs

**Decay not running:**
- Check `~/.claude/homunculus/last-decay.json` for last run date
- Force decay: `node scripts/instinct-decay.js --force --dry-run`

**Conflicts not detected:**
- Run `python3 skills/continuous-learning-v2/scripts/conflict-detector.py` directly
- Check `~/.claude/homunculus/conflicts.json`

**Archived instinct recovery:**
- Copy from `~/.claude/homunculus/.../archived/` back to `personal/`
