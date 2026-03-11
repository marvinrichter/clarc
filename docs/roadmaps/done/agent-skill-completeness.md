# Agent & Skill Completeness

**Status:** ✅ Done
**Date:** 2026-03-11
**Goal:** Close agent wiring gaps (Write tool, missing commands), lift process skill actionability, fix the RFC 7807 inconsistency, and address P2 agent quality issues.

## Problem Statement

Five agents have tool or wiring gaps that prevent them from completing their stated tasks. Five process/lifecycle skills score 29% actionability on average (vs 58% for technical skills) — they describe *what* to do but lack step-by-step workflows. The `tdd-workflow` skill uses a `data.success:true` check that directly contradicts the RFC 7807 guidance in `api-design`.

## Open Items

### A1 — Agent tool gaps (P1)

- **P1-A1**: `agents/solution-designer.md` — add `Write` to tools list. Agent generates ADR documents but currently cannot save them.
- **P1-A2**: Verify `agents/bash-reviewer.md`, `agents/flutter-reviewer.md` — add `Bash` if needed for shellcheck/flutter commands they reference in their instructions.

### A2 — Agent quality (P2)

- **P2-A1**: `agents/typescript-reviewer.md` — add second `## Examples` entry (most-used language reviewer, only 1 example).
- **P2-A2**: `agents/command-auditor.md` — add second example.
- **P2-A3**: `agents/hook-auditor.md` — add second example.
- **P2-A4**: `agents/doc-updater.md` — tighten trigger description to distinguish from `planner` and `architect`.
- **P2-A5**: `agents/scala-reviewer.md` — add `uses_skills: [scala-patterns, scala-testing]` to frontmatter.
- **P2-A6**: `agents/prompt-quality-scorer.md` + `agents/prompt-reviewer.md` — add "not to be confused with prompt-reviewer/prompt-quality-scorer" disambiguation line to each.
- **P2-A7**: `agents/competitive-analyst.md` + `agents/workflow-os-competitor-analyst.md` — document routing boundary (when to use which) in both descriptions.

### S1 — Process skill actionability (P1)

Each of the following skills needs a concrete step-by-step workflow section and/or decision tree added to the body:
- **P1-S1**: `skills/product-lifecycle/SKILL.md` — add decision tree: discovery phase → evaluation → PRD → implementation flow.
- **P1-S2**: `skills/strategic-ddd/SKILL.md` — add step-by-step bounded context discovery workflow.
- **P1-S3**: `skills/agent-conflict-resolution/SKILL.md` — add decision tree: conflict type → resolution path → escalation.
- **P1-S4**: `skills/instinct-lifecycle/SKILL.md` (if exists) — add lifecycle step sequence: observe → score → evolve → promote → retire.
- **P1-S5**: `skills/continuous-learning-v2/SKILL.md` — add quick-start workflow section.

### S2 — RFC 7807 consistency (P1)

- **P1-R1**: `skills/tdd-workflow/SKILL.md` — find the integration test example that checks `data.success:true` and update it to use RFC 7807 error shape (`{ type, title, status, detail }`) to match `api-design`.

### S3 — Skill file size (P2)

- **P2-S1**: Skills exceeding 400 lines where no `*-advanced` companion exists: identify top 5 and extract advanced sections into new companion skill files.

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| P1-A1 | solution-designer: add Write tool | ✅ |
| P1-A2 | bash-reviewer + flutter-reviewer: verify Bash tool | ✅ |
| P1-S1 | product-lifecycle: decision tree | ✅ |
| P1-S2 | strategic-ddd: bounded context workflow | ✅ |
| P1-S3 | agent-conflict-resolution: decision tree | ✅ |
| P1-S4 | instinct-lifecycle: lifecycle steps | ✅ |
| P1-S5 | continuous-learning-v2: quick-start workflow | ✅ |
| P1-R1 | tdd-workflow: RFC 7807 example fix | ✅ |
| P2-A1 | typescript-reviewer: second example | ✅ |
| P2-A2 | command-auditor: second example | ✅ |
| P2-A3 | hook-auditor: second example | ✅ |
| P2-A4 | doc-updater: tighten trigger | ✅ |
| P2-A5 | scala-reviewer: uses_skills frontmatter | ✅ |
| P2-A6 | prompt-quality-scorer/reviewer: disambiguation | ✅ (already had notes) |
| P2-A7 | competitive-analyst/workflow-os: routing boundary | ✅ (already had notes) |
| P2-S1 | Extract advanced sections from top-5 oversized skills | ✅ cpp-testing (809→301) + api-contract (746→597) + 2 new *-advanced skills |
