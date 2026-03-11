# clarc Components Review — 2026-03-11

**Mode:** Components | **Duration:** ~30 min | **Branch:** main

## Overall Health Score: 8.2 / 10

| Component | Score | HIGH | MEDIUM | LOW | Notes |
|-----------|-------|------|--------|-----|-------|
| Agents | 9.0* | 0 | 7 | 14 | *4.51/5.0 normalized |
| Skills | 8.5 | 0 | 21 | 9 | 40 of 234 sampled |
| Commands | 8.0 | 5 | 6 | 9 | 172 commands |
| Hooks | 8.2 | 0 | 2 | 4 | 20 hooks, 37 scripts |
| **Overall** | **8.2** | **5** | **36** | **36** | |

---

## P0 — Critical Issues (none)

No P0 issues found across any component.

---

## P1 — HIGH Issues (5 total, all in Commands)

### C-H1: resilience-review / resilience-audit — 85% overlap
**Component:** Commands | **Dimension:** Overlap Detection

`resilience-review` delegates to the `resilience-reviewer` agent.
`resilience-audit` performs inline grep-based analysis with no agent delegation.
Same domain, no scope differentiation — users cannot determine which to use.

**Fix:** Merge `resilience-audit` into `resilience-review`. Fold grep analysis into the `resilience-reviewer` agent as a scan step. Delete `commands/resilience-audit.md`.

---

### C-H2: 66% of commands lack "After This" section
**Component:** Commands | **Dimension:** Feedback Loop

Approximately 115 of 172 commands have no next-step guidance. Users complete a command and receive no signal on where to go next.

**Fix:** Establish mandatory "After This" section as command authoring standard. Priority candidates: `eda-review`, `edge-review`, `iac-review`, `wasm-review`, `webrtc-review`, `gitops-review`.

---

### C-H3: guide.md — ~88 effective steps
**Component:** Commands | **Dimension:** Step Count

`guide.md` contains 18+ task categories each with 4-5 steps. This is an encyclopedia, not a command. Violates the 3-6 step ideal by an order of magnitude.

**Fix:** Refactor into a routing table: each category maps to the correct command to invoke.

---

### C-H4: multi-execute — 40 steps, hidden binary dependency
**Component:** Commands | **Dimension:** Step Count

`multi-execute.md` has 40 numbered steps across 5 phases. The `codeagent-wrapper` binary dependency is not signaled in the description frontmatter.

**Fix:** Add prerequisite check as Step 1. Collapse to 5-6 user-visible steps.

---

### C-H5: dep-audit / sbom / security-review — 3-way overlap on vulnerability scanning
**Component:** Commands | **Dimension:** Overlap Detection

All three commands overlap at the dependency vulnerability scanning step with no clear scope boundaries.

**Fix:** Define non-overlapping scope: `dep-audit` = dependency graph + license compliance; `sbom` = SBOM generation + attestation; `security-review` = code-level security.

---

## P2 — MEDIUM Issues

### Agents (7 MEDIUM)

| # | Agent | Issue |
|---|-------|-------|
| A-M1 | multiple (4 agents) | Announce-but-not-confirm write pattern: `doc-updater`, `go-build-resolver`, `data-architect`, `e2e-runner` |
| A-M2 | `feedback-analyst` | Grep tool missing from tools list despite text search usage |
| A-M3 | `code-reviewer` | No Agent tool despite being an orchestrator |
| A-M4 | `product-evaluator` | No Write tool despite generating eval documents |
| A-M5 | `prompt-quality-scorer` | Uses Sonnet for 100+ item analysis — Opus recommended |
| A-M6 | `solution-designer` | Only 1 worked example; complex agent needs 2-3 |
| A-M7 | `agent-system-reviewer` | Write without confirm on `--recompute` flag |

### Skills (top 5 of 21 MEDIUM)

| # | Finding |
|---|---------|
| S-M1 | **SYS-A: Length creep** — 45% of sampled skills (18/40) exceed 400 lines; 9 skills at 550+ are split candidates; `api-design` at CI ceiling of 600 |
| S-M2 | **SYS-B: deployment-patterns trigger overlap** — overlaps with `docker-patterns`, `ci-cd-patterns`, `kubernetes-patterns`; needs narrowed activation condition |
| S-M3 | **SYS-C: continuous-learning-v2 version mismatch** — frontmatter says 2.2.0, body heading says v2.1 + line-break artifact |
| S-M4 | 4 short skills lack composite end-to-end example (`slo-workflow`, etc.) |
| S-M5 | Cross-reference freshness — some skills still reference old patterns |

### Hooks (2 MEDIUM)

| # | Hook | Issue |
|---|------|-------|
| H-M1 | `post-edit-typecheck.js` | `execFileSync(tsc --noEmit)` blocks event loop up to 30s on every TS edit |
| H-M2 | `post-edit-typecheck-rust.js` | `execFileSync(cargo check)` blocks event loop up to 60s on every Rust edit |

### Commands (6 MEDIUM)

| # | Command | Issue |
|---|---------|-------|
| C-M1 | `tdd` | Red-Green-Refactor cycle enumerated twice → 15 effective items |
| C-M2 | `system-review` | 25 internal implementation steps exposed to user |
| C-M3 | — | `/deploy` missing; documented gap in J1 journey; skills exist but no command |
| C-M4 | `multi-plan` | 23 steps, no graceful degradation without `codeagent-wrapper` |
| C-M5 | `swift-build` | References `architect` agent for build errors; should be `build-error-resolver` |
| C-M6 | `claw` | Uses env vars instead of `$ARGUMENTS`; opaque name |

---

## Resolved Since 2026-03-10

| # | Issue | Resolution |
|---|-------|------------|
| R1 | `go-patterns` cross-ref wrong | Fixed — now points to `go-patterns-advanced` |
| R2 | `tdd-workflow` integration test checked `data.success` | Fixed — now checks `data.data` |
| R3 | `design-system-reviewer` had no command | Added `commands/design-system-review.md` |
| R4 | `supply-chain-auditor` had no command | Added `commands/supply-chain-audit.md` |
| R5 | `security-review` lacked `$ARGUMENTS` docs | Fixed |
| R6 | `dep-update` naming inconsistency | Confirmed consistent |
| R7 | `instinct-promote` argument docs missing | Confirmed present |
| R8 | Previous command count discrepancy | Resolved at 172 |
| R9 | `orchestrator-design` command missing | Confirmed present |

---

## Recommended Next Roadmap

Based on P1/P2 findings, priority order for next roadmap:

1. **Command Cleanup** (P1 × 5): Merge resilience overlap, add After This sections, refactor guide.md, fix multi-execute, delineate dep/sbom/security scope
2. **Hook Performance** (P2 × 2): Convert typecheck hooks to async + debounce
3. **Agent Tools Audit** (P2 × 4): Fix announce-without-confirm pattern, add missing tools to tool lists
4. **Skill Splits** (P2): Split 9 skills at 550+ lines before CI failures
5. **skill continuous-learning-v2 version fix** (P2): Fix frontmatter version mismatch

---

## Artifacts

```
docs/system-review/components-2026-03-11/
├── agents.json    — 30 agents scored (avg 4.51/5.0)
├── skills.json    — 40 skills sampled (avg 8.53/10)
├── commands.json  — 172 commands audited (8.0/10)
└── hooks.json     — 20 hooks, 37 scripts (8.2/10)
```
