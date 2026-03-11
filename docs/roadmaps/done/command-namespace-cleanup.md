# Command Namespace Cleanup

**Status:** ✅ Done
**Date:** 2026-03-11
**Goal:** Fix the two HIGH naming collisions (eval/evaluate, multi-* disambiguation), add missing commands for two agents, and clean up the P2 naming drift (promote, deps, security).

## Problem Statement

The command system (162 commands, 7.2/10) grew organically without enforced naming conventions. Users invoking `/eval` expect product idea evaluation but get eval-driven development. Five `multi-*` commands silently duplicate core workflow commands via an external binary with no disambiguation. Three commands (`promote`, `deps`, `security`) break the naming patterns their sibling commands follow.

## Open Items

### C1 — Critical naming collisions (P1-HIGH)

- **P1-E1**: Rename `commands/eval.md` → `commands/llm-eval.md`. Update all references (README, hub, wiki). Add `> See also: /evaluate` cross-reference to new file and `> See also: /llm-eval` to `evaluate.md`.
- **P1-M1**: Add a `## When to use this vs /plan` (or `/tdd`, `/e2e`, `/orchestrate`) section to each of the 5 `multi-*` command files (`multi-plan.md`, `multi-execute.md`, `multi-backend.md`, `multi-frontend.md`, `multi-workflow.md`).

### C2 — Missing commands for existing agents (P1)

- **P1-C1**: Create `commands/orchestrator-design.md` — invokes `orchestrator-designer` agent. Design: given a task goal, decompose into agent roles and orchestration pattern.
- **P1-C2**: Create `commands/sdk-design.md` — invokes `sdk-architect` agent. Design: SDK architecture for an API (generation strategy, error hierarchy, auth, versioning, CI release).

### C3 — Naming inconsistencies (P2)

- **P2-N1**: Rename `commands/promote.md` → `commands/instinct-promote.md`. Update all references (README, hub, docs/wiki, any instinct-* cross-references).
- **P2-N2**: Rename `commands/deps.md` → `commands/dep-update.md`. Add `> See also: /dep-audit` to new file; add `> See also: /dep-update` to `dep-audit.md`.
- **P2-N3**: Rename `commands/security.md` → `commands/security-review.md`. Update all references. Note: must not conflict with existing `skills/security-review/SKILL.md` (command vs skill — distinct).

### C4 — Instinct wrapper step depth (P2)

- **P2-I1**: Add precondition, execution, and output interpretation steps to the 6 thin instinct-* wrappers: `instinct-status.md`, `instinct-import.md`, `instinct-export.md`, `instinct-outcome.md`, `instinct-report.md`, `instinct-projects.md`.

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| P1-E1 | eval → llm-eval rename + cross-refs | ✅ |
| P1-M1 | multi-* disambiguation sections | ✅ |
| P1-C1 | commands/orchestrator-design.md | ✅ |
| P1-C2 | commands/sdk-design.md | ✅ |
| P2-N1 | promote → instinct-promote | ✅ |
| P2-N2 | deps → dep-update | ✅ |
| P2-N3 | security → security-review | ✅ |
| P2-I1 | instinct-* wrapper step depth | ✅ |
