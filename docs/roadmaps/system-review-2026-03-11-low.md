# Roadmap: System Review LOW Fixes 2026-03-11

**Branch:** `feat/system-review-2026-03-11-low`
**Source:** `docs/system-review/2026-03-11-components-report.md`
**Scope:** All LOW-severity findings not addressed in the P1/P2 roadmap.
**Prerequisite:** `feat/system-review-2026-03-11` merged (main @ 26037b0).

---

## Summary of Remaining Findings

| Component | LOW count | Source |
|-----------|-----------|--------|
| Agents | 19 | `agents.json` — overlap docs, technical depth, workflow |
| Skills | 11 | `skills.json` — 3 oversized splits still pending, 8 example-thinness |
| Hooks | 3 | `hooks.json` — double detection, secret scan extension guard, consolidation |
| Commands | 2 | `commands.json` — opaque acronym, missing $ARGUMENTS docs |
| **Total** | **35** | |

---

## Phase 1 — Agents: Overlap Documentation

### Task 1 — Document reviewer overlap boundaries (3 agent pairs)

**android-reviewer** — LOW: "Minor overlap boundary with kotlin-reviewer not documented"
- Add to `when_to_use` / description: "For Kotlin-only modules without Android framework usage → use `kotlin-reviewer`; for Jetpack Compose, Hilt, Room, ViewModel → use `android-reviewer`"

**bash-reviewer** — LOW: "Overlap with security-reviewer for shell injection not disambiguated"
- Add to description: "For shell injection vulnerabilities in application code → use `security-reviewer`. `bash-reviewer` covers Bash-specific patterns (set -e, quoting, BATS) — `security-reviewer` covers OWASP Top 10 in web application code."

**c-reviewer** — LOW: "Overlap with cpp-reviewer for C++ code with C headers not disambiguated"
- Add to description: "For `.cpp`/`.cc` files with C headers → use `cpp-reviewer`. `c-reviewer` covers pure C11/C17 — `cpp-reviewer` covers C++20/23 even when the TU includes C headers."

**Files:** `agents/android-reviewer.md`, `agents/bash-reviewer.md`, `agents/c-reviewer.md`

---

## Phase 2 — Agents: Technical Depth (Reviewer Agents)

### Task 2 — Add missing technical specifics to 4 reviewer agents

**go-reviewer** — LOW: "No mention of go vet / staticcheck integration"
- Add to instructions: call out `go vet`, `staticcheck`, and `golangci-lint` as verification steps after review suggestions; reference the `go-build-resolver` agent for wiring them into CI.

**typescript-reviewer** — LOW: "No mention of Biome vs ESLint preference"
- Add a "Toolchain" note: "If the project uses Biome (`biome.json` present) → defer to Biome formatting/linting rules. If ESLint (`eslint.config.*` / `.eslintrc.*`) → follow ESLint rules. Do not recommend switching toolchains unless explicitly asked."

**database-reviewer** — LOW: "NoSQL patterns not covered despite description mentioning 'database' broadly"
- Narrow description to: "PostgreSQL specialist" OR add a brief NoSQL routing note: "For MongoDB/Redis/DynamoDB patterns → use `nosql-patterns` skill; this agent focuses on PostgreSQL."

**cpp-reviewer** — LOW: "C++23 modules not mentioned despite being in claimed specialization"
- Add to specialization list: C++23 `import`/`module` units, `std::expected`, `std::print`, `std::flat_map`; note toolchain requirements (Clang 16+, GCC 13+, MSVC 19.35+).

**Files:** `agents/go-reviewer.md`, `agents/typescript-reviewer.md`, `agents/database-reviewer.md`, `agents/cpp-reviewer.md`

---

### Task 3 — Add missing technical specifics to 4 analysis agents

**security-reviewer** — LOW: "SSRF detection heuristics not described"
- Add SSRF heuristics section: flag `fetch(url)` / `axios.get(url)` / `http.get(url)` where `url` is user-supplied; flag missing allowlist/SSRF guard before outbound HTTP; reference `security-review` skill for remediation patterns.

**performance-analyst** — LOW: "Missing guidance on pprof CPU vs memory vs goroutine profiles"
- Add profile-type decision table: CPU profile → hot function identification; heap profile → allocation hotspots; goroutine profile → leak/block detection; block/mutex profile → lock contention; note `go tool pprof -http=:8080` for interactive flamegraph.

**contract-reviewer** — LOW: "GraphQL schema breaking changes not fully covered"
- Add GraphQL breaking-change checklist: field removal, type narrowing, non-null promotion, enum value removal, directive removal, subscription changes; reference `graphql-patterns` skill.

**refactor-cleaner** — LOW: "knip/depcheck/ts-prune only; no Go or Python equivalent tools mentioned"
- Add language-specific dead-code tools: Go → `deadcode` (golang.org/x/tools), `staticcheck U1000`; Python → `vulture`, `pyflakes`; note invocation pattern and how to run alongside existing JS tools.

**Files:** `agents/security-reviewer.md`, `agents/performance-analyst.md`, `agents/contract-reviewer.md`, `agents/refactor-cleaner.md`

---

## Phase 3 — Agents: Workflow & Orchestration Improvements

### Task 4 — Workflow depth improvements (batch of 7 agents)

**orchestrator** — LOW: "No guardrail documented for destructive Bash in delegated sub-agents"
- Add to instructions: "When delegating tasks that include Bash execution (rm, git reset, kubectl delete, DROP TABLE), explicitly instruct the sub-agent: 'Do not run destructive commands without confirming with the user first.' Pass this as part of the agent prompt, not just as a general note."

**command-auditor** — LOW: "No exit criteria for partial audits (when only some commands have issues)"
- Add exit criteria section: "A partial audit (--scope or single command) is complete when: (a) all issues in scope are listed with severity/suggestion, (b) a partial-audit disclaimer is included at the top of the report, (c) overall score is not stated (to avoid misleading extrapolation)."

**design-system-reviewer** — LOW: "No example of what a passing vs failing audit looks like"
- Add two concise examples: one showing a ✅ passing output (token names consistent, dark mode coverage 100%, 0 issues) and one ❌ failing output (hardcoded colors, missing dark mode tokens, 3 MEDIUM issues). Each ≤10 lines.

**tdd-guide** — LOW: "Coverage threshold (80%) hardcoded; should note it can be configured per project"
- Change "Ensures 80%+ test coverage" to "Ensures 80%+ test coverage (configurable — check project's `.nycrc`, `vitest.config.ts`, or `pytest.ini` for the project's actual threshold)."

**competitive-analyst** — LOW: "No After This guidance"
- Add: `## After This` → `/discover` — use findings to seed product ideas; `/evaluate` — assess competitive gap as a feature opportunity.

**planner** — LOW: "No guidance on when to escalate to architect agent"
- Add escalation note: "If the task involves choosing between architectural patterns (monolith vs. microservices, REST vs. GraphQL, DB engine), delegate the relevant decision to the `architect` agent and incorporate its ADR recommendation into the task list."

**architect** — LOW: "Vague step verbs in sections 1-2; trigger precision could be improved"
- Sharpen trigger: add explicit NOT trigger cases: "Do not use for implementation timelines or task lists — use `planner` instead." Replace vague section verbs with action-oriented: "analyze" → "map bounded contexts", "think about" → "document trade-offs in ADR format".

**build-error-resolver** — LOW: "Body examples are TypeScript-only; Go/Python examples missing"
- Add one Go example (package import cycle fix) and one Python example (import error / missing `__init__.py` fix), each ≤10 lines.

**Files:** `agents/orchestrator.md`, `agents/command-auditor.md`, `agents/design-system-reviewer.md`, `agents/tdd-guide.md`, `agents/competitive-analyst.md`, `agents/planner.md`, `agents/architect.md`, `agents/build-error-resolver.md`

---

## Phase 4 — Skills: Remaining Oversized Splits

### Task 5 — Split 3 skills still at 550+ lines

Skills in `skills.json` confirmed at ≥550 lines that were NOT split in the previous roadmap:

1. **`go-patterns`** (550 lines) → `go-patterns` (core idioms, error handling, interfaces) + `go-patterns-advanced` (generics, reflection, cgo, performance tuning)
2. **`api-contract`** (597 lines, near CI limit) → `api-contract` (OpenAPI basics, lint, code-gen) + `api-contract-advanced` (breaking change detection, consumer-driven contracts, versioning strategy)
3. **`multi-agent-patterns`** (598 lines, at CI max) → `multi-agent-patterns` (Fan-Out, Split-Role, Sequential Pipeline) + `multi-agent-patterns-advanced` (Explorer+Validator, Worktree Isolation, failure modes, cost management) — **Note:** current file was already trimmed to 599 lines to pass CI; the advanced split is still needed

For each split:
- Core file: 300-400 lines, most-used patterns
- Advanced file: 300-500 lines, edge cases + complex patterns
- Add `related_skills` cross-reference in each file's frontmatter
- Update `skills/INDEX.md` with new entries

**Files:** 3 skill core files + 3 new `*-advanced` files + `skills/INDEX.md`

---

## Phase 5 — Skills: Example Completeness

### Task 6 — SYS-D: Add composite end-to-end examples to 4 short skills

From `skills.json` systemic issue SYS-D. Each skill has good individual examples but lacks a unified flow:

- **`slo-workflow`** — Add a "Full SLO Lifecycle" example: define SLI → set SLO → create alert → burn-rate policy → postmortem trigger. Target: ~20 lines.
- **`terraform-ci`** — Add a runnable CI step showing Infracost output parsing: full GitHub Actions step with `infracost diff --compare-to=main` + cost threshold gate. Target: ~15 lines.
- **`progressive-delivery`** — Add a "Rollout Lifecycle" walkthrough: `rollout create` → health check passes → `rollout promote` → error spike → `rollout abort`. Target: ~20 lines.
- **`api-pagination-filtering`** — Add a "Combined Request" example: single GET with cursor pagination + filter + sort + field selection in one request/response pair. Target: ~15 lines.

**Files:** `skills/slo-workflow/SKILL.md`, `skills/terraform-ci/SKILL.md`, `skills/progressive-delivery/SKILL.md`, `skills/api-pagination-filtering/SKILL.md`

---

### Task 7 — Add runnable examples to 3 prose-heavy skills

**`continuous-learning-v2`** — LOW: "Fewer than 3 fully runnable end-to-end examples"
- Add 2 runnable shell examples: (1) `instinct-export` → edit → `instinct-import` flow, (2) a `learn-eval` invocation showing a concrete session extraction.

**`adr-writing`** — LOW: "Low code-to-prose ratio"
- Add a complete filled-in ADR example (not a template — a real decision written out): e.g., "ADR-007: Use Cursor Pagination over Offset Pagination". ~25 lines.

**`skill-stocktake`** — LOW: "Only one complete worked example"
- Add a second complete worked example showing a stocktake with 3 findings and the resulting action plan. ~20 lines.

**Files:** `skills/continuous-learning-v2/SKILL.md`, `skills/adr-writing/SKILL.md`, `skills/skill-stocktake/SKILL.md`

---

## Phase 6 — Hooks: Performance & Correctness

### Task 8 — Three targeted hook fixes

**H-L1: Remove console.log double-detection** (interaction_conflicts LOW)
- `scripts/hooks/post-edit-format-dispatch.js` — remove the `warnConsoleLogs()` call after each JS/TS Edit/Write.
- Rationale: `scripts/hooks/check-console-log.js` already runs a more complete git-based scan at Stop hook time. Duplicate warnings are noise.
- Test: edit a file with a `console.log`, verify warning appears once (at session end) not twice.

**H-L2: Add file-extension allowlist to pre-write-secret-scan** (false_positive_risk LOW)
- `scripts/hooks/pre-write-secret-scan.js` — add early-exit guard before `scanForSecrets()`:
  ```js
  const SAFE_EXTENSIONS = ['.png','.jpg','.jpeg','.svg','.wasm','.lock','.sum','.ico','.gif'];
  if (SAFE_EXTENSIONS.some(ext => filePath.endsWith(ext))) process.exit(0);
  ```
- This prevents expensive regex scanning on binary and generated lockfiles.
- Test: writing a `.lock` file should not trigger secret scan.

**H-L3: Consolidate typecheck hooks into format-dispatch** (performance_impact LOW)
- The `post-edit-typecheck.js` and `post-edit-typecheck-rust.js` hooks already run async (fixed in P1/P2 roadmap). The remaining LOW issue is that every non-TS and non-Rust Edit still pays Node.js startup cost because the extension check is inside the script, not the hook matcher.
- Since `hooks.json` matchers do not support file-extension conditions natively, move the extension check earlier in each script: add `if (!filePath) process.exit(0)` and gate the entire execution on `filePath.match(/\.(ts|tsx)$/)` at the top of the module, before any other imports or logic.
- This is a micro-optimization: avoids require() loading when the file extension doesn't match.

**Files:** `scripts/hooks/post-edit-format-dispatch.js`, `scripts/hooks/pre-write-secret-scan.js`, `scripts/hooks/post-edit-typecheck.js`, `scripts/hooks/post-edit-typecheck-rust.js`

---

## Phase 7 — Commands: Quick Fixes

### Task 9 — Two command quick fixes

**cfp** — LOW: "Unexplained domain-specific acronym"
- `commands/cfp.md` — change description frontmatter from just `cfp` description to: `"cfp — write a conference talk proposal (Call For Papers abstract)"`.

**doc-update** — LOW: "doc-update command only surfaces README and codemap workflows; missing $ARGUMENTS variants"
- `commands/doc-update.md` — add an `## Arguments` section documenting:
  - (no args) — updates README and codemaps (default)
  - `contributing` — updates `CONTRIBUTING.md`
  - `tour` — generates/updates `docs/onboarding/architecture-tour.md`
  - `changelog` — generates changelog entries from recent commits

**Files:** `commands/cfp.md`, `commands/doc-update.md`

---

## Summary

| Phase | Tasks | Issues Fixed | Component |
|-------|-------|--------------|-----------|
| 1 — Reviewer Overlap | 1 | 3 | Agents |
| 2 — Reviewer Depth | 2–3 | 8 | Agents |
| 3 — Workflow Depth | 4 | 8 | Agents |
| 4 — Oversized Splits | 5 | 3 | Skills |
| 5 — Example Completeness | 6–7 | 7 | Skills |
| 6 — Hook Fixes | 8 | 3 | Hooks |
| 7 — Command Quick Fixes | 9 | 2 | Commands |
| **Total** | **9** | **34** | |

**Expected health after:** 9.5–9.7 / 10

---

## Not Addressed (by design)

- `suggest-compact.js` counter race (H-L4) — acknowledged in code, no immediate action required; advisory-only impact.
- `security-review` skill LOW: Supabase/Next.js-centric examples — split already done; advanced file can add Go/Rust examples in a future pass.
- Length creep MEDIUM for `debugging-workflow` (405), `typescript-patterns` (484), `auth-patterns` (471), `observability` (417), `gdpr-privacy` (423), `gitops-patterns` (507), `llm-app-patterns` (504), `typescript-patterns-advanced` (436) — all below 550-line split threshold; CI hard limit is 600. Will be addressed if any crosses 550 lines in a future review.
