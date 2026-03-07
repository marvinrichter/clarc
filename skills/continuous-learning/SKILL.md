---
name: continuous-learning
description: "[DEPRECATED — use continuous-learning-v2] v1 session-end holistic pattern extraction. Superseded by the instinct-based continuous-learning-v2 system with per-tool capture, confidence scoring, and project-scoped instincts."
version: 1.0.0-deprecated
---

# continuous-learning (v1) — DEPRECATED

> **This skill has been superseded by [continuous-learning-v2](../continuous-learning-v2/SKILL.md).**
>
> Use `/learn` or `/learn-eval` commands — they invoke the active v2 system.

## Why v2 Replaces v1

| Feature | v1 (this) | v2 (active) |
|---|---|---|
| Trigger | Session-end only | Per-tool, real-time |
| Output | Full skill files in `~/.claude/skills/learned/` | Atomic instincts with confidence scores |
| Scope | Global only | Project-scoped + global |
| Conflict detection | None | `conflict-detector.py` with antonym pairs |
| Team sync | None | `clarc/instincts` orphan branch |
| Weekly digest | None | Monday trigger at ≥10 instincts |

## Migration

Replace any reference to this skill with:
- **`continuous-learning-v2`** — for the instinct system architecture
- **`/learn`** — for manual session-end pattern extraction
- **`/learn-eval`** — for extraction with quality gate before saving
- **`/instinct-status`** — to view captured instincts
