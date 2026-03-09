# Learning Flywheel Feedback Loop Roadmap

**Status:** ✅ Done
**Date:** 2026-03-09
**Motivation:** `continuous-learning-v2` accumulates instincts across sessions, but there is no mechanism to measure whether an instinct actually improved outcomes. Instincts are written but never validated, never decay, and have no quality signal beyond the `/evolve` clustering step.

---

## Problem Statement

Current learning flow:
```
session → /learn-eval → instinct written → /evolve (cluster) → instinct persists forever
```

Missing:
- **Outcome tracking**: Did following this instinct lead to better results?
- **Decay**: Stale or wrong instincts accumulate and create noise
- **Quality gate**: Any instinct passes if it survives `/learn-eval` quality check
- **Cross-session comparison**: No before/after on instinct adoption

### Symptoms

- `instinct-status` shows growing list with no confidence differentiation
- Contradictory instincts can coexist without conflict detection
- Useful instincts and noisy instincts look identical in output
- No way to know if clarc is improving the user's workflow over time

---

## Gap Analysis

| Flywheel Stage | Current State | Desired State |
|---------------|--------------|---------------|
| Capture | `/learn-eval` with quality gate | Same |
| Storage | `~/.clarc/instincts/` JSON files | Same + confidence score + usage count + last-used date |
| Clustering | `/evolve` groups similar instincts | Same + conflict detection |
| Validation | None | Outcome-based confidence adjustment |
| Decay | None | Time-based decay for unused instincts |
| Reporting | `/instinct-status` text list | Scored, ranked, with trend indicators |

---

## Proposed Deliverables

### Schema Change (1)

Extend instinct JSON schema:

```json
{
  "id": "inst_abc123",
  "domain": "testing",
  "content": "Always write integration tests for database operations",
  "confidence": 0.75,
  "created": "2026-01-15",
  "last_used": "2026-03-08",
  "usage_count": 12,
  "positive_outcomes": 9,
  "negative_outcomes": 1,
  "neutral_outcomes": 2,
  "decay_rate": "standard",
  "conflicts_with": []
}
```

### Scripts (3)

| Script | Purpose |
|--------|---------|
| `scripts/instinct-outcome-tracker.js` | Records outcome signals after sessions where an instinct was applied |
| `scripts/instinct-decay.js` | Weekly cron: reduces confidence for instincts unused for 30+ days |
| `scripts/instinct-conflict-detector.js` | Detects semantic conflicts between instincts (run during `/evolve`) |

### Commands (2)

| Command | Description |
|---------|-------------|
| `/instinct-report` | Ranked list of instincts by confidence + trend (↑↓→). Shows top 10 high-confidence, bottom 5 low-confidence candidates for removal |
| `/instinct-outcome <id> <good\|bad\|neutral>` | Manually record an outcome for a specific instinct. Can also accept free-text reason. |

### Skill (1)

| Skill | Description |
|-------|-------------|
| `instinct-lifecycle` | Full lifecycle management for clarc instincts — capture, scoring, decay, conflict resolution, promotion to global scope |

### Hook (1)

| Hook | Event | Behavior |
|------|-------|----------|
| `instinct-decay-runner` | SessionEnd (weekly) | Runs `instinct-decay.js` — reduces confidence for stale instincts, flags candidates for deletion |

---

## Confidence Scoring Model

```
initial_confidence = 0.60 (on creation)

positive_outcome:  confidence += 0.05 (max 0.95)
negative_outcome:  confidence -= 0.10 (min 0.10)
neutral_outcome:   no change
unused 30 days:    confidence -= 0.02/week
unused 90 days:    flag for review
unused 180 days:   auto-archive (not delete)

promotion threshold: confidence >= 0.80 AND usage_count >= 5
deletion threshold:  confidence <= 0.20 OR (unused > 180 days AND confidence < 0.50)
```

---

## Implementation Phases

### Phase 1 — Schema Migration
- Update instinct JSON schema with new fields
- Write migration script for existing instincts (set defaults: confidence=0.60, counts=0)
- Update `scripts/sync-instincts.js` to handle new schema

### Phase 2 — Decay Script + Hook
- Implement `instinct-decay.js`
- Wire `instinct-decay-runner` hook to SessionEnd weekly trigger
- Test with synthetic instinct aging

### Phase 3 — Conflict Detector
- Implement `instinct-conflict-detector.js` using semantic similarity (keyword overlap heuristic, no LLM)
- Integrate into `/evolve` command output
- Flag conflicts for user review — do not auto-resolve

### Phase 4 — Outcome Tracking
- Implement `/instinct-outcome` command
- Implement `instinct-outcome-tracker.js` for session-end auto-detection (heuristic: did Claude mention the instinct? Did the session succeed?)

### Phase 5 — Reporting
- Implement `/instinct-report` with ranked view
- Add trend indicators (3-session rolling average)
- Write `skills/instinct-lifecycle/SKILL.md`

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| LLM-based semantic similarity for conflict detection | Adds cost and latency; keyword heuristics sufficient for MVP |
| Automatic instinct deletion | Too destructive; always require user confirmation |
| Cross-user instinct sharing | Privacy — instincts may contain project-specific patterns |

---

## Success Criteria

- [ ] All instincts have confidence scores after schema migration
- [ ] Decay runs weekly without manual intervention
- [ ] `/instinct-report` shows ranked list with trend indicators
- [ ] Conflict detector flags at least 1 real conflict in a populated instinct set
- [ ] User can record outcomes in < 10 seconds via `/instinct-outcome`
