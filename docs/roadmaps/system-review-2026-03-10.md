# System Review Roadmap 2026-03-10

**Status:** 📋 Planned
**Date:** 2026-03-10
**Source:** Full system review — 8.4/10 agents · 8.1/10 skills · 7.6/10 commands · 7.6/10 hooks
**Goal:** Resolve all open P0/P1/P2 findings before v1.0 launch

---

## Problem Statement

The `/system-review full` run on 2026-03-10 identified 28 open issues across agents, skills, commands, and hooks. Several P0 items were fixed in-session (doc-updater model tier, planner/architect disambiguation, 8 missing language commands, async typecheck hooks). This roadmap tracks the remaining work.

---

## Already Fixed (This Session)

| Fix | Area | Commit |
|-----|------|--------|
| doc-updater `model: haiku` → `model: sonnet` | Agents | a529153 |
| planner/architect routing collision (description disambiguation) | Agents | a529153 |
| `agent-format.md`: `## Examples` section mandatory | Agents | a529153 |
| 8 missing language review commands (kotlin, flutter, php, csharp, bash, scala, c, r) | Commands | a529153 |
| `docker-patterns`: postgres:18→17, redis:8→7.4 | Skills | a529153 |
| `observability`: remove false Java claim from description | Skills | a529153 |
| `post-edit-typecheck.js` + `post-edit-typecheck-rust.js`: `async: true` | Hooks | 63d2e6f |
| PostToolUse Write → post-edit-format-dispatch.js (formatter for new files) | Hooks | 63d2e6f |
| evaluate-session.js stale config path (continuous-learning → v2) | Hooks | 63d2e6f |
| instinct-projects.md `name: projects` → `name: instinct-projects` | Commands | 6300b71 |
| e2e.md PMX-specific content removed | Commands | 6300b71 |
| multi-workflow.md usage doc corrected | Commands | 6300b71 |
| kotlin-reviewer: add `Bash` tool | Agents | 7c4abac |
| workflow-os-competitor-analyst: remove `Bash` tool | Agents | 7c4abac |
| competitive-analyst: add `Glob` tool | Agents | 7c4abac |

---

## Open Items

### Sprint 1 — Security & Hook Fixes (1–2 days)

**Motivation:** Security gaps that affect every session; all are low-effort.

#### H1 — auto-checkpoint.js secret guard bypass (CRITICAL)
**File:** `scripts/hooks/auto-checkpoint.js`
**Issue:** `git commit --no-verify` bypasses `pre-bash-dispatch.js`. Secrets written by Claude and auto-checkpointed enter git history before any scan fires.
**Fix:** Extract `scanForSecrets()` from `pre-bash-dispatch.js` into `scripts/lib/secret-scanner.js`. Call it in `auto-checkpoint.js` before `git commit`. Abort checkpoint (not the Edit) if a secret pattern matches.
**Effort:** 2h

#### H2 — security-scan-nudge: path-based trigger + no cooldown (HIGH)
**File:** `scripts/hooks/post-edit-workflow-nudge.js`
**Issue:** `security-scan-nudge` matches the file *path* for keywords (auth, token, session, sign, verify), not file content. Files like `session-end.js`, `auth-utils.ts` trigger the nudge on every edit with no cooldown.
**Fix:** Apply the same `nudge-cooldown.json` mechanism used by `code-review-nudge`. OR: match file content for actual credential/token patterns instead of file name keywords.
**Effort:** 1h

#### H3 — observe.sh: silent error on missing python3 (MEDIUM)
**File:** `skills/continuous-learning-v2/hooks/observe.sh`
**Issue:** `set -e` with no error trap causes silent non-zero exit if `python3` is missing or `source detect-project.sh` fails. The observation pipeline silently stops working.
**Fix:** Add `trap 'exit 0' ERR` immediately after `set -e`, or use explicit per-command `|| exit 0` guards.
**Effort:** 30min

---

### Sprint 2 — Agent Examples (2–3 days)

**Motivation:** Example density is the single weakest dimension (avg 6.5/10). Adding worked examples to the highest-traffic agents is the fastest path to raising system health from 8.4 → 8.7+.

**Target agents (highest traffic / weakest example score):**

#### A1 — security-reviewer: add "show diff before applying" guardrail + 1 example
**File:** `agents/security-reviewer.md`
**Fix:** Add guardrail: "Never auto-apply remediations — show the diff first and wait for user confirmation." Add one worked example: SQL injection finding → WRONG code → CORRECT code → fix steps.
**Effort:** 30min

#### A2 — refactor-cleaner: add dry-run step + 1 example
**File:** `agents/refactor-cleaner.md`
**Fix:** Add explicit step: "Show complete list of files/exports to remove. Wait for confirmation before executing." Add worked example: `knip` output → 3 items flagged → 2 safely removed → 1 skipped (dynamic import).
**Effort:** 30min

#### A3 — design-critic: add 2 worked examples (currently zero)
**File:** `agents/design-critic.md`
**Fix:** Add example 1: screenshot description → critique per dimension. Add example 2: before/after wireframe showing hierarchy improvement.
**Effort:** 45min

#### A4 — talk-coach: add 1 worked example + tighten trigger
**File:** `agents/talk-coach.md`
**Fix:** Add example: talk outline (3 sections) → annotated feedback per dimension (structure, timing, opening). Tighten trigger: add "For creating new slide decks from scratch, use presentation-designer instead."
**Effort:** 30min

#### A5 — doc-updater: add 1 worked example + narrow trigger
**File:** `agents/doc-updater.md`
**Fix:** Add example: function signature → generated codemap entry (before/after). Narrow trigger: specify which documentation types trigger this agent vs. manual writing.
**Effort:** 30min

#### A6 — tdd-guide: add "show diff" guardrail
**File:** `agents/tdd-guide.md`
**Fix:** Add: "Never commit or push directly. Show what will be written before applying to the codebase." Score penalty is for missing safety guardrail on Write tool usage.
**Effort:** 20min

#### A7 — Bulk: add 1 minimal example to each of the remaining 39 agents missing ## Examples
**Approach:** Generate a minimal `## Examples` section for each reviewer agent following the pattern: "Input: [describe input] → Output: [describe output format]". Language reviewers can share a template: "Input: 3 modified .go files → Output: CRITICAL/HIGH/MEDIUM findings table with file:line references."
**Effort:** 2 days (batch approach, ~3min per agent)

---

### Sprint 3 — Skill Quality (2–3 days)

**Motivation:** 6 skills over 400 lines degrade readability and trigger precision. Splitting them also enables better `uses_skills` cross-references.

#### S1 — Split rust-patterns (670 lines)
**Files:** `skills/rust-patterns/SKILL.md` → two skills
- `rust-patterns`: ownership, borrowing, error handling, traits (~300 lines)
- `rust-web-patterns`: Axum, Serde, async runtime, WASM (~300 lines)
**Effort:** 3h

#### S2 — Split gitops-patterns (616 lines)
**Files:** `skills/gitops-patterns/SKILL.md` → two skills
- `gitops-patterns`: ArgoCD/Flux setup, sync policies, RBAC (~300 lines)
- `progressive-delivery`: Argo Rollouts canary/blue-green, rollback (~280 lines)
**Effort:** 3h

#### S3 — Split api-design (613 lines)
**Files:** `skills/api-design/SKILL.md` → two skills
- `api-design`: REST design, OpenAPI spec, RFC 7807 errors, versioning (~320 lines)
- `api-pagination-filtering`: cursor pagination, filtering, sorting, field selection (~260 lines)
**Effort:** 3h

#### S4 — Split terraform-patterns (550 lines)
**Files:** `skills/terraform-patterns/SKILL.md` → two skills
- `terraform-patterns`: modules, workspaces, state management, tagging (~300 lines)
- `terraform-ci`: plan in CI, drift detection, Infracost, Sentinel policies (~220 lines)
**Effort:** 3h

#### S5 — Narrow broad triggers
**Files:** `skills/go-patterns/SKILL.md`, `skills/python-patterns/SKILL.md`, `skills/security-review/SKILL.md`
**Fix template:**
```
BEFORE: Use when writing Go code.
AFTER:  Use when designing Go packages, selecting error handling strategies (sentinel errors,
        error wrapping, custom types), or structuring a service with hexagonal architecture in Go.
```
**Effort:** 1h (3 files)

#### S6 — Remove Solana/Web3 domain content from general skills
**Files:** `skills/security-review/SKILL.md`, `skills/e2e-testing/SKILL.md`
**Fix:** Extract Solana/Web3 sections → new `skills/security-review-web3/SKILL.md` + `skills/e2e-testing-web3/SKILL.md`. Add `See also:` cross-reference in both originals.
**Effort:** 2h

#### S7 — Update tdd-workflow GitHub Actions v3 → v4
**File:** `skills/tdd-workflow/SKILL.md`
**Fix:** `actions/checkout@v3` → `@v4`, `actions/setup-node@v3` → `@v4`
**Effort:** 10min

#### S8 — Add See Also cross-references to complementary skills
**Files:** go-patterns → go-testing, typescript-patterns → typescript-testing, rust-patterns → async-patterns, security-review → auth-patterns
**Effort:** 30min

#### S9 — Add CI lint rule: warn at 500 lines, block at 600 lines
**File:** `scripts/ci/validate-skill-quality.js`
**Fix:** Add line count check. Emit warning (exit 0) at >500, emit error (exit 1) at >600.
**Effort:** 1h

---

### Sprint 4 — Command Cleanup (1 day)

#### C1 — Rename agent-review → agent-audit
**Files:** `commands/agent-review.md` → `commands/agent-audit.md`
**Cross-references to update:** `commands/system-review.md`, `docs/wiki/commands-reference.md`, any skill referencing `/agent-review`
**Effort:** 30min

#### C2 — Differentiate deps vs dep-audit
**Files:** `commands/deps.md`, `commands/dep-audit.md`
**Fix:** Add to `deps.md`: "Not covered here: license compliance and supply chain risk — use `/dep-audit`." Add to `dep-audit.md`: "Not covered here: outdated package upgrades — use `/deps`."
**Effort:** 20min

#### C3 — Differentiate discover vs brainstorm
**Files:** `commands/discover.md`, `commands/brainstorm.md`
**Fix:** Update `discover` description to lead with "From external market data (competitor features, Reddit/HN, trends)". Update `brainstorm` to lead with "From structured ideation frameworks (JTBD, How Might We, analogy thinking)". Add mutual cross-reference.
**Effort:** 20min

#### C4 — Rename whats-the-rule → rule-lookup
**Files:** `commands/whats-the-rule.md` → `commands/rule-lookup.md`
**Cross-references:** `commands/context.md`, `commands/clarc-way.md`, `commands/guide.md`
**Effort:** 20min

#### C5 — Fix *-test semantic split
**File:** `commands/python-test.md`
**Fix:** Update to enforce TDD methodology (write failing test first, implement to pass) — matching `go-test.md` and `rust-test.md`.
**Effort:** 30min

#### C6 — Add heading + structure to skill-impact
**File:** `commands/skill-impact.md`
**Fix:** Add `# Skill Impact` heading. Add "What This Command Does" paragraph. Add next-step link.
**Effort:** 10min

#### C7 — Wire build-fix and refactor to their agents
**Files:** `commands/build-fix.md`, `commands/refactor.md`
**Fix:** Add explicit agent delegation to `build-error-resolver` and `refactor-cleaner` respectively.
**Effort:** 20min

---

### Sprint 5 — Competitive Gap Closers (1–2 weeks each)

#### G1 — Repomap skill + session-start enrichment (P1 vs Aider)
**Gap:** Aider's tree-sitter + PageRank code graph gives context-aware relevance surfacing. clarc relies on Claude Code's built-in context.
**Approach:**
1. Create `skills/repomap/SKILL.md` — tree-sitter analysis, compact code graph format
2. Add `session-start.js` enrichment step: run repomap, inject top-N relevant files as context banner
3. Create `commands/repomap.md` — user-invocable repomap refresh
**Effort:** 2 weeks

#### G2 — Slack/Linear webhook MCP commands (P1 vs Devin)
**Gap:** Devin integrates with Slack (!macro) and Linear/Jira for task creation from AI sessions.
**Approach:**
1. Add `mcp-configs/slack.json` — Slack MCP server config
2. Add `mcp-configs/linear.json` — Linear MCP server config
3. Create `commands/slack-notify.md` — post session summary or finding to Slack channel
4. Create `commands/linear-create.md` — create Linear issue from AI finding or plan
**Effort:** 1 week

#### G3 — /mcp-setup with curated registry (P2 vs Windsurf)
**Gap:** Windsurf has one-click MCP server setup. clarc has `mcp-configs/` directory but no discovery UI.
**Approach:**
1. Create `mcp-configs/curated/` directory with commented template configs for: GitHub, Linear, Postgres, Exa search, Slack
2. Create `commands/mcp-setup.md` — shows curated list, one-command install per server
**Effort:** 3 days

---

## Issue Tracker

| ID | Area | Item | Priority | Sprint | Effort | Status |
|----|------|------|----------|--------|--------|--------|
| H1 | Hooks | auto-checkpoint.js secret guard bypass | P0 | 1 | 2h | ✅ Done |
| H2 | Hooks | security-scan-nudge path-based + no cooldown | P1 | 1 | 1h | ⬜ Open |
| H3 | Hooks | observe.sh silent error on missing python3 | P1 | 1 | 30min | ⬜ Open |
| A1 | Agents | security-reviewer: diff guardrail + example | P1 | 2 | 30min | ⬜ Open |
| A2 | Agents | refactor-cleaner: dry-run step + example | P1 | 2 | 30min | ⬜ Open |
| A3 | Agents | design-critic: 2 worked examples (currently zero) | P1 | 2 | 45min | ⬜ Open |
| A4 | Agents | talk-coach: example + trigger tightening | P1 | 2 | 30min | ⬜ Open |
| A5 | Agents | doc-updater: example + trigger narrowing | P1 | 2 | 30min | ⬜ Open |
| A6 | Agents | tdd-guide: "show diff" guardrail | P1 | 2 | 20min | ⬜ Open |
| A7 | Agents | Bulk: minimal examples for 39 remaining agents | P2 | 2 | 2 days | ⬜ Open |
| S1 | Skills | Split rust-patterns (670 lines) | P0 | 3 | 3h | ⬜ Open |
| S2 | Skills | Split gitops-patterns (616 lines) | P0 | 3 | 3h | ⬜ Open |
| S3 | Skills | Split api-design (613 lines) | P0 | 3 | 3h | ⬜ Open |
| S4 | Skills | Split terraform-patterns (550 lines) | P0 | 3 | 3h | ⬜ Open |
| S5 | Skills | Narrow broad triggers (go, python, security) | P1 | 3 | 1h | ⬜ Open |
| S6 | Skills | Remove Solana/Web3 from general skills | P1 | 3 | 2h | ⬜ Open |
| S7 | Skills | tdd-workflow GH Actions v3 → v4 | P1 | 3 | 10min | ⬜ Open |
| S8 | Skills | Add See Also cross-references | P2 | 3 | 30min | ⬜ Open |
| S9 | Skills | CI lint rule: warn 500 / block 600 lines | P2 | 3 | 1h | ⬜ Open |
| C1 | Commands | Rename agent-review → agent-audit | P1 | 4 | 30min | ⬜ Open |
| C2 | Commands | Differentiate deps vs dep-audit | P1 | 4 | 20min | ⬜ Open |
| C3 | Commands | Differentiate discover vs brainstorm | P1 | 4 | 20min | ⬜ Open |
| C4 | Commands | Rename whats-the-rule → rule-lookup | P1 | 4 | 20min | ⬜ Open |
| C5 | Commands | Fix python-test semantic (add TDD enforcement) | P1 | 4 | 30min | ⬜ Open |
| C6 | Commands | skill-impact: add heading + structure | P2 | 4 | 10min | ⬜ Open |
| C7 | Commands | Wire build-fix + refactor to their agents | P2 | 4 | 20min | ⬜ Open |
| G1 | Competitive | Repomap skill + session-start enrichment | P1 | 5 | 2 weeks | ⬜ Open |
| G2 | Competitive | Slack/Linear MCP commands | P1 | 5 | 1 week | ⬜ Open |
| G3 | Competitive | /mcp-setup with curated registry | P2 | 5 | 3 days | ⬜ Open |

---

## Expected Impact

| Sprint | Health Score Δ | Key Gain |
|--------|---------------|---------|
| After Sprint 1 | +0.1 (hooks) | Security gap closed; session stability improved |
| After Sprint 2 | +0.3 (agents) | Example density 6.5 → 8.0; agent system ~8.7/10 |
| After Sprint 3 | +0.2 (skills) | Skills corpus 8.1 → 8.3; 4 oversized skills split |
| After Sprint 4 | +0.05 (commands) | Commands 7.6 → 7.7; naming consistency improved |
| After Sprint 5 | Competitive | 2 P1 competitive gaps closed vs Aider + Devin |
| **Total** | **~8.4 → ~9.0** | |
