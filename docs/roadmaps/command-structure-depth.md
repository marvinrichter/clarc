# Command Structure Depth

**Status:** ✅ Complete
**Date:** 2026-03-11
**Goal:** Lift command UX quality from 6.2→8.0 by adding structural guidance, argument docs, next-step suggestions, and fixing delegation wiring across the 164-command system.

## Problem Statement

Command audit (2026-03-11) scored the system at 6.2/10. Naming is clean (9/10) but three structural deficiencies affect the majority of commands: 86 commands accept `$ARGUMENTS` without documenting the format, 106 commands have no next-step suggestion after completion, and 92 commands have zero `## Step N` structure. Three commands have HIGH severity issues.

## Open Items

### P0 — HIGH severity (3 commands)

- **P0-C1**: `code-review` — 16 lines, thinnest command; add usage block, 3-step skeleton, next-step
- **P0-C2**: `e2e` — 340 lines, zero formal steps; convert existing content to `## Step N` headings
- **P0-C3**: `overnight` — 530 lines, zero formal steps; add `## Step N` structure throughout

### P1 — Agent delegation fixes (6 commands)

- **P1-D1**: `security-review` — `devsecops-reviewer` is footnote only; make it the primary delegate for automated file scanning
- **P1-D2**: `profile` — `performance-analyst` never invoked; add explicit agent invocation step
- **P1-D3**: `finops-audit` — `finops-advisor` exists but is never invoked; add explicit delegation
- **P1-D4**: `system-review` — bold-names `/learning-audit`, `/workflow-check`, `/competitive-review` as if they are agents; fix to slash-syntax
- **P1-D5**: `agent-design` + `orchestrator-design` — ~80% overlap; add clear scope boundary + cross-ref in each

### P1 — Thin *-review wrappers (16 commands)

All share the same fix: add `## When to Use This vs /code-review` disambiguation table + `## After This` next-step.

- **P1-R1**: `typescript-review`
- **P1-R2**: `go-review`
- **P1-R3**: `python-review`
- **P1-R4**: `java-review`
- **P1-R5**: `swift-review`
- **P1-R6**: `rust-review`
- **P1-R7**: `ruby-review`
- **P1-R8**: `elixir-review`
- **P1-R9**: `kotlin-review`
- **P1-R10**: `scala-review`
- **P1-R11**: `php-review`
- **P1-R12**: `csharp-review`
- **P1-R13**: `flutter-review`
- **P1-R14**: `android-review`
- **P1-R15**: `cpp-review`
- **P1-R16**: `c-review`

### P1 — Structural fixes (5 commands)

- **P1-S1**: `plan` — no next-step suggestion; add `## After Planning` pointing to `/tdd` or `/breakdown`
- **P1-S2**: `incident` — complex runbook, zero formal steps; add `## Step N` headers
- **P1-S3**: `migrate` — fix `**golang-migrate**` bold reference (not an agent); add steps
- **P1-S4**: `python-test` — no steps despite multi-phase workflow; add `## Step N`
- **P1-S5**: `rust-test` — no formal steps; add `## Step N`

### P2 — Missing commands (2)

- **P2-N1**: Add `commands/prompt-audit.md` — dedicated command for `prompt-quality-scorer` agent
- **P2-N2**: Add `commands/arch-design.md` — dedicated command for `architect` agent

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| P0-C1 | code-review: structure + next-step | 📋 |
| P0-C2 | e2e: add ## Step N headings | 📋 |
| P0-C3 | overnight: add ## Step N headings | 📋 |
| P1-D1 | security-review: fix devsecops-reviewer delegation | 📋 |
| P1-D2 | profile: invoke performance-analyst | 📋 |
| P1-D3 | finops-audit: invoke finops-advisor | 📋 |
| P1-D4 | system-review: fix bold → slash command refs | 📋 |
| P1-D5 | agent-design + orchestrator-design: scope boundary | 📋 |
| P1-R1–16 | 16× *-review: disambiguation + next-step | 📋 |
| P1-S1 | plan: add After Planning section | 📋 |
| P1-S2 | incident: add step structure | 📋 |
| P1-S3 | migrate: fix bold refs + add steps | 📋 |
| P1-S4 | python-test: add step structure | 📋 |
| P1-S5 | rust-test: add step structure | 📋 |
| P2-N1 | Add commands/prompt-audit.md | 📋 |
| P2-N2 | Add commands/arch-design.md | 📋 |
