# clarc Full System Review — 2026-03-10 (Post-Sprint-5)

**Mode:** Full
**Trigger:** Post-Sprint-5, pre-v1.0 assessment
**Date:** 2026-03-10
**Previous score:** 8.4/10 (AM review, same date)

---

## Overall Health Score: **8.5 / 10** ↑ (from 8.4)

| Component | Score | Δ | Status |
|-----------|-------|---|--------|
| Agents | 8.35 | +0.0 | ✅ Strong — no HIGH issues |
| Skills | 8.1 | +0.0 | ⚠ Anti-Patterns gap across 81% of corpus |
| Commands | 7.7 | +0.1 | ✅ Sprint 4 P0/P1 all resolved |
| Hooks | 7.5 | -0.1 | 🔴 3 blocking hooks missing async:true |
| Wiring | 10.0 | +0.0 | ✅ 0 errors |
| Workflow Coverage | 10.0 | +0.0 | ✅ 6/6 developer journeys pass |

---

## Critical Issues (P0)

### P0-H1 — 3 hooks missing `async: true` — up to 65s blocking per edit

post-edit-format-dispatch.js (5s), post-edit-typecheck.js (30s), post-edit-typecheck-rust.js (60s)
all use execFileSync without async:true. Fix: add "async": true to all 3 in hooks/hooks.json.

### P0-H2 — exitCode dead code in format-dispatch

process.exit(0) always called, exitCode=1 on formatter failure is silently swallowed.
Fix: change final process.exit(0) → process.exit(exitCode).

---

## High Priority Issues (P1)

### P1-S1 — 190 of 235 skills (81%) missing Anti-Patterns section

Anti-pattern WRONG/CORRECT pairs are the #1 differentiator between 7.5 and 8.5+ scoring skills.
Best fix: add Anti-Patterns to top 50 highest-traffic skills from SKILL_AGENTS.md.

### P1-S2 — 127 skills (54%) with When-to-Activate under 50 words

Short triggers reduce routing precision. Extend each to 3-4 concrete bullet points.

### P1-A1 — 4 agent overlap pairs need disambiguation

- talk-coach / presentation-designer
- competitive-analyst / workflow-os-competitor-analyst
- security-reviewer / devsecops-reviewer
- prompt-reviewer / prompt-quality-scorer

---

## Medium Priority Issues (P2)

- P2-H3: observe.sh "*" matcher → narrow to "Edit|Write|Bash" (100+ processes/session)
- P2-H4: doc-file-warning console.log → process.stdout.write (JSON corruption)
- P2-H5: tdd-guard false positives for Go/Python/Rust (extend test path candidates)
- P2-H6: LONG_RUNNING patterns too broad (make\b / docker\b match fast subcommands)

---

## Competitive Position

| Gap | Status | Competitor |
|-----|--------|------------|
| Repomap / codebase context | ✅ Closed (G1) | Aider |
| MCP server discovery | ✅ Closed (G3 — /mcp-setup) | Windsurf |
| Slack/Linear integration | ⬜ Intentionally skipped (G2) | Devin |
| tree-sitter symbol graph | ⬜ Remaining (repomap uses regex, not AST) | Aider |
| Agent/skill marketplace | ⬜ No marketplace yet | Cursor |

clarc-unique: full learning flywheel, 61 agents with uses_skills graph, rules inheritance, pre-push CI validators, 7-event hook system with secret guard.

---

## Workflow Coverage: 6/6 ✅ PASS

New Feature · Bug Fix · Security Audit · Performance · Language Onboarding · Learning Loop

---

## Priority Matrix

| ID | Area | Item | Priority | Effort |
|----|------|------|----------|--------|
| H1 | Hooks | async:true on 3 blocking hooks | **P0** | 30min |
| H2 | Hooks | Fix exitCode dead code | **P0** | 5min |
| S1 | Skills | Anti-Patterns for top 50 skills | **P1** | 2-3h |
| S2 | Skills | Extend When-to sections (127 skills) | **P1** | 3-4h |
| A1 | Agents | Disambiguate 4 overlap pairs | **P1** | 1h |
| H3 | Hooks | Narrow observe.sh matcher | **P2** | 15min |
| H4 | Hooks | Fix doc-file-warning console.log | **P2** | 5min |
| H5 | Hooks | Extend tdd-guard test paths | **P2** | 20min |
| H6 | Hooks | Tighten LONG_RUNNING patterns | **P2** | 15min |

---

## Recommended Next Roadmaps

1. `docs/roadmaps/hook-reliability.md` — H1+H2 first (35min, P0, before v1.0)
2. `docs/roadmaps/skill-anti-patterns.md` — S1+S2 batch skill quality (P1)
