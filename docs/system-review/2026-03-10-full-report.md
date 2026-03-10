# clarc Full System Review — 2026-03-10

**Mode:** Full (components + competitive analysis + workflow coverage + synthesis)
**Version:** v0.9.0 | 61 agents · 228 skills · 160 commands · 20 rule sets
**Overall Health Score: 7.82 / 10**

---

## Executive Summary

clarc is in good shape for a pre-launch v0.9.0. All 6 critical developer journeys pass. The competitive analysis confirms 7 clarc-unique capabilities with no direct competitors. The main quality debt clusters around: (1) missing examples in 45/61 agents, (2) two blocking typecheck hooks not marked async, and (3) 6 skills over 400 lines needing splits.

**P0 fixes applied this session (4 items — already resolved):**
1. doc-updater `model: haiku` → `model: sonnet`
2. planner/architect description disambiguation (routing collision eliminated)
3. agent-format.md: `## Examples` section made mandatory
4. 8 missing language-reviewer commands created (kotlin, flutter, php, csharp, bash, scala, c, r)

---

## Component Scores

| Component | Score | Issues | Status |
|-----------|-------|--------|--------|
| Agents (quality) | 7.72 / 10 | 0 HIGH · 4 MEDIUM · 57 GOOD | 2 P0 fixed this session |
| Agents (prompt quality) | 7.3 / 10 | Bottom 10 below 6.0 | 1 P0 fixed (doc-updater) |
| Commands | 7.6 / 10 | 3 P0 · 8 P1 | P0-01 and P0-03 already correct; P0-02 (PMX) not found |
| Hooks | 7.6 / 10 | 2 HIGH · 4 MEDIUM · 3 LOW | 0 fixed this session |
| Skills | 8.1 / 10 | 0 CRITICAL · 5 MEDIUM systemic | 2 fixes applied (docker, observability) |
| Workflow coverage | PASS (6/6) | All journeys implemented | — |
| **Composite** | **7.82 / 10** | | |

---

## Priority Matrix

### P0 — Fix Before v1.0 Launch

| ID | Area | Issue | Effort | Fix |
|----|------|-------|--------|-----|
| P0-A | Hooks | post-edit-typecheck.js and post-edit-typecheck-rust.js block synchronously (30s / 60s). Degrades user experience on every TypeScript/Rust edit. | 5 min | Add `"async": true` to both hooks.json entries |
| P0-B | Hooks | auto-checkpoint.js uses `--no-verify`, bypassing the secret guard. Secrets in auto-checkpoint commits enter git history unscanned. | 2h | Add scanForSecrets() inside auto-checkpoint.js before git commit |
| P0-C | Skills | rust-patterns (670 lines), gitops-patterns (616), api-design (613), terraform-patterns (550): all exceed 400-line readability threshold | 1 day | Split each into two focused skills |
| P0-D | Commands | evaluate-session.js reads stale config path `skills/continuous-learning/config.json` (pre-v2). Silent failure. | 5 min | Update path to `skills/continuous-learning-v2/config.json` |

### P1 — Fix in Next Sprint

| ID | Area | Issue | Effort |
|----|------|-------|--------|
| P1-A | Hooks | PostToolUse Write has no auto-format hook. New files created via Write are never formatted. | 5 min (hooks.json entry only) |
| P1-B | Hooks | security-scan-nudge matches file path not content, no cooldown. False positives on session-end.js, auth-utils.ts on every edit. | 1h |
| P1-C | Agents | 45/61 agents have no `## Examples` section. Raises health score ~0.33 points when fixed. Template now in agent-format.md. | 2 days (45 edits) |
| P1-D | Commands | `agent-review` breaks the `*-audit` pattern used by 9 other commands. | 30 min (rename + update refs) |
| P1-E | Commands | `deps` vs `dep-audit` ~60% overlap. `discover` vs `brainstorm` ~70% overlap. No cross-references. | 1h (description updates) |
| P1-F | Skills | go-patterns, python-patterns, security-review have broad triggers ("when writing Go code"). False activations. | 1h (3 trigger updates) |
| P1-G | Skills | e2e-testing and security-review contain Solana/Web3 domain-specific content. | 30 min (delete sections) |
| P1-H | Skills | tdd-workflow uses GitHub Actions v3 (now v4). | 15 min |
| P1-I | Skills | observe.sh uses `set -e` with no error trap. Silent failures when Python3 is missing. | 30 min |
| P1-J | Competitive | Repomap skill + session-start enrichment (P1 gap vs. Aider). | ~2 weeks |
| P1-K | Competitive | Slack/Linear webhook MCP commands (P1 gap vs. Devin). | ~1 week each |

### P2 — Backlog (Nice-to-Have)

| ID | Area | Issue |
|----|------|-------|
| P2-A | Agents | Security-reviewer and devsecops-reviewer need explicit scope delineation (OWASP overlap) |
| P2-B | Agents | 6 agents with Write/Edit/Bash need confirmation guardrail ("show diff before applying") |
| P2-C | Commands | `whats-the-rule` → rename to `rule-lookup` (naming convention) |
| P2-D | Commands | `*-test` semantic split: go-test/rust-test enforce TDD, python-test doesn't |
| P2-E | Skills | Add CI lint rule: warn at 500 lines, block at 600 lines in validate-skill-quality.js |
| P2-F | Skills | Add `See also:` sections to go-patterns, typescript-patterns, security-review |
| P2-G | Competitive | /mcp-setup with curated MCP registry (P2 gap vs. Windsurf) |
| P2-H | Competitive | @-mention shorthands for skills (P2 ergonomic gap vs. Continue.dev) |

---

## Workflow Coverage

**Result: PASS — All 6 developer journeys fully implemented**

| Journey | Status |
|---------|--------|
| New Feature from Scratch | PASS — /idea→/evaluate→/explore→/plan→/tdd→/code-review chain verified |
| Bug Fix | PASS — /tdd + /code-review + /build-fix routed correctly |
| Security Audit | PASS — 3 commands + security-reviewer agent layered correctly |
| Performance Issue | PASS — /profile + performance-analyst agent + performance-profiling skill |
| Language Onboarding | PASS — 19 language reviewer agents, all with commands as of this session |
| Learning Loop | PASS — /learn-eval→/instinct-status→/evolve→/agent-evolution flywheel complete |

---

## Competitive Position

**7 clarc-unique capabilities** with no direct competitors:
1. Self-improving learning flywheel (observe→instinct→promote→evolve→decay)
2. System self-review (/system-review reviews itself)
3. Structured product discovery methodology (/idea→/evaluate→/explore→/prd pipeline)
4. TDD enforcement at the hook level (tdd-sequence-guard hook + tdd-guide proactive)
5. Dual MCP role (client AND server — exposes clarc state via 8 MCP tools)
6. Cross-tool rules bridge (/cursor-setup deploys clarc rules into Cursor)
7. Production-grade CI validators (headless PR review + security scan scripts)

**Top 2 competitive gaps:**
- P1: No repomap/code-graph (Aider advantage) — `repomap` skill + session-start enrichment
- P1: No Slack/Linear integration (Devin advantage) — MCP-based commands

**Positioning:** "AI Engineering, not just AI Coding" — clarc is the methodology layer.

---

## Fixes Applied This Session

| Fix | File | Status |
|-----|------|--------|
| doc-updater model: haiku → sonnet | agents/doc-updater.md | ✅ Done |
| planner description (task decomp vs architect) | agents/planner.md | ✅ Done |
| architect description (system design vs planner) | agents/architect.md | ✅ Done |
| Mandatory ## Examples in agent-format.md | docs/contributing/agent-format.md | ✅ Done |
| 8 missing language review commands | commands/{kotlin,flutter,php,csharp,bash,scala,c,r}-review.md | ✅ Done |
| docker-patterns: postgres:18→17, redis:8→7.4 | skills/docker-patterns/SKILL.md | ✅ Done |
| observability: remove false Java claim | skills/observability/SKILL.md | ✅ Done |
| README + docs: 152→160 commands counter | README.md, docs/wiki/*, .clarc/brief.md | ✅ Done |
| docs/hub regenerated | docs/hub/ | ✅ Done |
| agents-reference.md: added manual command column | docs/wiki/agents-reference.md | ✅ Done |

---

## Recommended Roadmap for v1.0

**Sprint 1 (Before release — 1 week):**
1. Add `"async": true` to post-edit-typecheck.js and post-edit-typecheck-rust.js in hooks.json (30 min)
2. Fix evaluate-session.js stale config path (5 min)
3. Add PostToolUse Write → post-edit-format-dispatch.js hook entry (5 min)
4. Update tdd-workflow GitHub Actions v3 → v4 (15 min)
5. Fix security-scan-nudge: content-based trigger + cooldown (1h)

**Sprint 2 (Post v1.0 — 2 weeks):**
1. Add `## Examples` to all 45 agents missing them (+0.33 health score)
2. Split rust-patterns, gitops-patterns, api-design, terraform-patterns
3. Narrow triggers for go-patterns, python-patterns, security-review
4. Remove Solana/Web3 content from e2e-testing and security-review
5. Rename agent-review → agent-audit

**Roadmap (1–3 months):**
1. Repomap skill + session-start code graph enrichment (P1 competitive)
2. /slack-notify and /linear-create MCP commands (P1 competitive)
3. Add scanForSecrets() to auto-checkpoint.js (P0-B security)
4. Hosted instinct marketplace consideration (P2)

---

## Files Produced

```
docs/system-review/
├── 2026-03-10-full-report.md          ← this file
└── components-2026-03-10/
    ├── agents.md                       ← 7.72/10, 61 agents scored
    ├── agents-prompt-quality.md        ← 7.3/10 average, bottom 10 flagged
    ├── commands.md                     ← 7.6/10, 42 commands deep-audited
    ├── hooks.md                        ← 7.6/10, 19 hooks, 9 issues
    ├── skills.md                       ← 8.1/10, 25 skills sampled
    ├── workflow-check.md               ← PASS (6/6 journeys)
    └── competitive-analysis.md         ← vs 6 competitors, 7 unique capabilities
```
