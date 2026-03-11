# Roadmap: System Review Fixes 2026-03-11

**Branch:** `feat/system-review-2026-03-11`
**Source:** `docs/system-review/2026-03-11-components-report.md`
**Scope:** All P1 (HIGH) and P2 (MEDIUM) findings from the 2026-03-11 components review.
**Overall health before:** 8.2/10 — 5 HIGH, 36 MEDIUM issues.

---

## Phase 1 — P1: Command HIGH Issues

### Task 1 — Merge resilience-audit into resilience-review (C-H1)

`resilience-audit.md` and `resilience-review.md` cover 85% of the same domain.
- Delete `commands/resilience-audit.md`
- Expand `commands/resilience-review.md` to document its inline scan + agent delegation
- Update `resilience-reviewer` agent to include the grep-based scan steps from the old audit command
- Search for any cross-references to `resilience-audit` in other commands/skills and update them

**Files:** `commands/resilience-audit.md` (delete), `commands/resilience-review.md`, `agents/resilience-reviewer.md`

---

### Task 2 — Add "After This" sections to priority commands (C-H2)

66% of 172 commands lack next-step guidance. Fix the 6 explicitly flagged first, then add an authoring standard.

**Step A — Fix 6 priority commands:**
- `eda-review.md` → After This: `/resilience-review`, `/add-observability`
- `edge-review.md` → After This: `/performance-review`, `/security-review`
- `iac-review.md` → After This: `/gitops-review`, `/security-review`
- `wasm-review.md` → After This: `/performance-review`
- `webrtc-review.md` → After This: `/resilience-review`, `/security-review`
- `gitops-review.md` → After This: `/security-review`, `/resilience-review`

**Step B — Add authoring standard:**
- Add "After This (mandatory)" to `docs/contributing/commands-format.md` (create if not exists)
- Scan all `*-review.md` commands for missing After This and add minimal 1-2 entries

**Files:** 6 command files + `docs/contributing/commands-format.md`

---

### Task 3 — Refactor guide.md into routing table (C-H3)

`guide.md` has ~88 effective steps — an encyclopedia, not a command.
- Replace each category's inline instructions with a 1-line description + the command to invoke
- Keep exactly one example per category (the most common use case)
- Target: ≤60 lines total, ≤6 steps per category
- Add "See also" section at bottom pointing to `/clarc-way` and `/quickstart`

**Files:** `commands/guide.md`

---

### Task 4 — Fix multi-execute and multi-plan (C-H4)

**multi-execute.md:**
- Add Step 0: Prerequisite check — verify `codeagent-wrapper` is installed (with install link)
- Add fallback note: "Without codeagent-wrapper, use `/plan` + `/overnight` instead"
- Collapse 40 steps to 5-6 user-visible phase headings; move implementation detail to agent

**multi-plan.md:**
- Add preflight check (same as above)
- Document fallback path: `/plan` + manual parallelization
- Collapse 23 steps to ≤8

**Files:** `commands/multi-execute.md`, `commands/multi-plan.md`

---

### Task 5 — Delineate dep-audit / sbom / security-review scope (C-H5)

Three commands overlap on vulnerability scanning with no clear boundaries.
- `dep-audit.md` → scope: dependency graph, license compliance, outdated packages. **Not:** CVE scanning (→ `sbom`), code injection (→ `security-review`)
- `sbom.md` → scope: SBOM generation, CVE attestation, supply chain. **Not:** license audit (→ `dep-audit`)
- `security-review.md` → scope: code-level OWASP/injection/auth. **Not:** dependency CVEs (→ `sbom`)
- Add "Scope vs Related Commands" disambiguation table to each of the 3 files

**Files:** `commands/dep-audit.md`, `commands/sbom.md`, `commands/security-review.md`

---

## Phase 2 — P2: Agent Issues

### Task 6 — Fix announce-without-confirm write pattern (A-M1, A-M7)

4 agents write files without a confirm step; standardize across all 5:
- `doc-updater` — add: "Before writing, announce the list of files to be created/updated and wait for user approval if outside the standard codemaps directory"
- `go-build-resolver` — add confirm step before modifying `go.mod`/`go.sum`
- `data-architect` — add confirm step before writing architecture documents
- `e2e-runner` — add confirm step before creating new test files
- `agent-system-reviewer` — add confirm step before overwriting existing reports on `--recompute`

**Files:** 5 agent files

---

### Task 7 — Fix missing tools in agent tool lists (A-M2, A-M3, A-M4)

- `feedback-analyst.md` — add `Grep` to tools list (uses text search patterns throughout)
- `code-reviewer.md` — add `Agent` to tools list (orchestrates specialist reviewer agents)
- `product-evaluator.md` — add `Write` to tools list (generates eval documents in `docs/evals/`)

**Files:** 3 agent files

---

### Task 8 — Fix model selection for analysis-heavy agents (A-M5)

- `prompt-quality-scorer.md` — change model from `sonnet` to `opus` (scores 100+ prompts in `--all` mode; requires deep reasoning)
- `agent-quality-reviewer.md` — add note: "Use opus for --all mode (>20 agents); sonnet acceptable for single-agent audits"

**Files:** 2 agent files

---

### Task 9 — Add second worked example to solution-designer (A-M6)

`solution-designer` is one of the most complex agents but has only 1 example. Add:
- A second example from a different domain (e.g., backend/data vs. the existing frontend example)
- Keep each example ≤15 lines

**Files:** `agents/solution-designer.md`

---

## Phase 3 — P2: Skill Issues

### Task 10 — Fix continuous-learning-v2 version mismatch (S-M3)

Quick fix:
- `skills/continuous-learning-v2/SKILL.md` — align frontmatter version with body heading (pick 2.2.0)
- Remove line-break artifact in the body heading

**Files:** `skills/continuous-learning-v2/SKILL.md`

---

### Task 11 — Narrow deployment-patterns activation trigger (S-M2)

`deployment-patterns` trigger overlaps with `docker-patterns`, `ci-cd-patterns`, `kubernetes-patterns`.
- Narrow the `when_to_activate` section to: deployment strategies (blue-green, canary, rolling), release orchestration, rollback procedures
- Add "See instead" notes: "For CI pipeline setup → `ci-cd-patterns`; For container config → `docker-patterns`; For K8s manifests → `kubernetes-patterns`"

**Files:** `skills/deployment-patterns/SKILL.md`

---

### Task 12 — Split oversized skills (S-M1)

9 skills are at 550+ lines (CI max: 600). Split each into a core + advanced file.
Skills to split (verify current line counts first):
1. `api-design` — split into `api-design` (REST basics, response formats) + `api-design-advanced` (versioning, pagination, GraphQL)
2. `auth-patterns` — split into `auth-patterns` (JWT, OAuth2 basics) + `auth-patterns-advanced` (PKCE, device flow, RBAC)
3. `observability` — split into `observability` (metrics, logs, traces basics) + `observability-advanced` (SLO integration, alerting, dashboards)
4. `kubernetes-patterns` — split into `kubernetes-patterns` (core workloads) + `kubernetes-patterns-advanced` (operators, policies, multi-cluster)
5. Any remaining skills confirmed at 550+ lines

For each split:
- Core file keeps the most-used patterns (target: 300-400 lines)
- Advanced file gets edge cases + complex patterns (target: 300-500 lines)
- Add cross-reference in each file's frontmatter: `related_skills`
- Update `skills/INDEX.md` with new entries

**Files:** Up to 9 skill pairs + `skills/INDEX.md`

---

## Phase 4 — P2: Hook Issues

### Task 13 — Convert typecheck hooks to async + add debounce (H-M1, H-M2)

Both `post-edit-typecheck.js` and `post-edit-typecheck-rust.js` use `execFileSync` which blocks the Node.js event loop for up to 60s.

- Replace `execFileSync` with `spawn` + async result handling
- Add 10s debounce per project root (avoid re-running on rapid sequential edits)
- Add 15s hard timeout for `cargo check`, 20s for `tsc --noEmit`
- For Rust: add `--message-format=short` flag to reduce output volume
- Test: verify hook still reports errors correctly after conversion

**Files:** `scripts/hooks/post-edit-typecheck.js`, `scripts/hooks/post-edit-typecheck-rust.js`

---

## Phase 5 — P2: Remaining Command Issues

### Task 14 — Command quick fixes (C-M1, C-M2, C-M5, C-M6)

Four small fixes that can be batched:

**tdd.md (C-M1):**
- Remove duplicate Red-Green-Refactor enumeration → keep one canonical cycle

**system-review.md (C-M2):**
- Collapse 25 internal steps to 5-6 user-facing steps
- Move internal orchestration detail (agent launch sequence) to `agents/agent-system-reviewer.md`

**swift-build.md (C-M5):**
- Replace `architect` agent reference with `build-error-resolver` for build error escalation

**claw.md (C-M6):**
- Add subtitle: "claw — connect to a NanoClaw interactive REPL session"
- Document `$CLAW_HOST`/`$CLAW_PORT` in a Prerequisites section (not inline)
- Add After This section

**Files:** `commands/tdd.md`, `commands/system-review.md`, `commands/swift-build.md`, `commands/claw.md`

---

### Task 15 — Add /deploy command or document gap (C-M3)

`/deploy` is a documented gap in the J1 journey. Skills exist (`deployment-patterns`, `ci-cd-patterns`).

Options:
- **Preferred:** Create `commands/deploy.md` — a thin routing command that delegates to `deployment-patterns` skill and lists the relevant sub-commands for each deploy target (K8s, serverless, Docker)
- **Alternative:** Add a "Deployment" section to `commands/guide.md` that routes to existing skills

Decision: Create `commands/deploy.md`.

**Files:** `commands/deploy.md` (new)

---

## Summary

| Phase | Tasks | Issues Fixed | Priority |
|-------|-------|--------------|----------|
| 1 — Commands P1 | 1–5 | 5 HIGH | P1 |
| 2 — Agents P2 | 6–9 | 7 MEDIUM | P2 |
| 3 — Skills P2 | 10–12 | 21 MEDIUM | P2 |
| 4 — Hooks P2 | 13 | 2 MEDIUM | P2 |
| 5 — Commands P2 | 14–15 | 6 MEDIUM | P2 |
| **Total** | **15** | **41** | |

**Expected health after:** 9.2–9.5 / 10
