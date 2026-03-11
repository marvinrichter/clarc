# clarc System Review — 2026-03-10 (Post-Hardening)

## Overall Health Score: 8.1 / 10

Weighted composite: Agents (25%) + Hooks (20%) + Commands (30%) + Skills (25%).

| Weight | Component | Score   | Weighted |
|--------|-----------|---------|----------|
| 25%    | Agents    | 8.82    | 2.21     |
| 20%    | Hooks     | 7.75    | 1.55     |
| 30%    | Commands  | 7.20    | 2.16     |
| 25%    | Skills    | 8.80    | 2.20     |
| **100%** | **Total** | | **8.12** |

## Component Scores

| Component | Score | Total | Issues (H/M/L) | Notes |
|-----------|-------|-------|-----------------|-------|
| Agents    | 8.82  | 61    | 0/5/55 | 1 HIGH fixed this session (agent-system-reviewer tools) |
| Hooks     | 7.75  | 20    | 2/5/6  | Weakest dimensions: false-positive risk (6.0), performance (6.0) |
| Commands  | 7.20  | 162   | 2/7/5  | Weakest dimensions: overlap detection (6.0), naming (7.0) |
| Skills    | 8.80  | 237*  | 0/12/3 | 2 HIGHs fixed this session; *45 of 237 analyzed |

### Issues Already Fixed This Session (excluded from open counts)

- **agent-system-reviewer**: Write+Edit added to tools list (was HIGH)
- **go-patterns/SKILL.md**: golang-patterns-advanced -> go-patterns-advanced cross-ref fixed (was HIGH)
- **continuous-learning-v2**: version bumped to 2.2.0, frontmatter/body mismatch resolved (was HIGH)

---

## Cross-Cutting Patterns

### Pattern 1: Hook Performance Is the Biggest Risk to User Experience

The hooks subsystem scores lowest (7.75) and contains both HIGH-severity issues. Two PostToolUse hooks (`post-edit-typecheck.js` for TypeScript, `post-edit-typecheck-rust.js` for Rust) lack timeouts and can stall sessions for 5-60 seconds per Edit. Combined with `post-edit-format-dispatch.js` using synchronous `execFileSync` despite declaring `async:true`, every code edit in a TypeScript or Rust project triggers multiple sequential blocking operations. This is the single most user-visible quality issue in clarc.

**Affects:** hooks (H-P1, H-P2, H-M3), user experience across all TS/Rust projects.

### Pattern 2: Naming and Overlap Inconsistency Across Commands

The command system (162 commands, score 7.2) suffers from two distinct problems that compound each other:
- **Naming drift:** `promote` lacks the `instinct-` prefix its siblings use; `deps` is a truncated noun while `dep-audit` follows noun-verb; `security` is a bare noun while peers use `*-review`/`*-audit`.
- **Semantic overlap:** `eval` vs `evaluate`, `deps` vs `dep-audit`, and the entire `multi-*` family (5 commands) all create user confusion without cross-references.

These are not isolated issues — they indicate the command namespace grew organically without a naming convention enforced at creation time.

**Affects:** commands (C-H1, C-H2, C-M1 through C-M3, C-M7), user discoverability.

### Pattern 3: Process/Lifecycle Skills Lag Behind Technical Skills

Technical skills average 58% actionability; process/lifecycle skills average 29%. Five skills (`product-lifecycle`, `strategic-ddd`, `agent-conflict-resolution`, `instinct-lifecycle`, `continuous-learning-v2`) describe *what* to do but lack step-by-step workflows and decision trees. This pattern was partially addressed by fixing continuous-learning-v2's version mismatch, but the underlying actionability gap remains.

**Affects:** skills (SYS-03), onboarding quality, agent effectiveness when delegating to these skills.

### Pattern 4: Secret Scanning Has a Write-Tool Blind Spot

The pre-bash secret guard (`pre-bash-dispatch.js`) scans git commits, but no PreToolUse Write hook exists. Secrets written via the Write tool sit unguarded on disk until a git commit triggers the scan. This is a defense-in-depth gap — the git-commit guard catches it eventually, but the Write-time check would prevent the secret from ever reaching the filesystem.

**Affects:** hooks (H-M4), security posture.

### Pattern 5: Agent-to-Command Wiring Gaps

Two agents (`orchestrator-designer`, `sdk-architect`) have no corresponding slash command. Users cannot invoke them without knowing the agent name. A third agent (`solution-designer`) lacks the Write tool despite generating ADR documents. These are wiring gaps — the components exist but are not properly connected.

**Affects:** agents (solution-designer tool gap), commands (C-M4, C-M5).

---

## Priority Matrix

### P0 — Must Fix Before v1.0

| # | Issue | Component | Impact | Fix |
|---|-------|-----------|--------|-----|
| 1 | post-edit-typecheck.js has no timeout | hooks (H-P1) | Session stalls 5-30s per TS edit | Add `timeout:30, async:true` to hooks.json entry |
| 2 | post-edit-typecheck-rust.js has no timeout | hooks (H-P2) | Session stalls 30-60s per Rust edit | Add `timeout:60, async:true` to hooks.json entry |
| 3 | auto-checkpoint.js uses `git add -A` | hooks (H-M2) | Stages unrelated dirty files into checkpoint commits | Stage only `tool_input.file_path` |
| 4 | async race: auto-checkpoint vs format-dispatch | hooks (H-M5) | Checkpoint captures pre- or post-formatted code non-deterministically | Remove `async:true` from auto-checkpoint or enforce ordering |

### P1 — Fix in Next Sprint

| # | Issue | Component | Impact | Effort |
|---|-------|-----------|--------|--------|
| 5 | `eval` vs `evaluate` naming collision | commands (C-H1) | User invokes wrong command | Rename `eval` -> `llm-eval`; add cross-refs |
| 6 | `multi-*` family lacks disambiguation | commands (C-H2) | 5 commands overlap core workflow commands | Add "When to use this vs /plan" to each |
| 7 | post-edit-format-dispatch.js has no path exclusion | hooks (H-M1) | Formatter runs on node_modules/vendor/dist | Skip excluded paths |
| 8 | post-edit-format-dispatch.js uses execFileSync | hooks (H-M3) | Blocks Node event loop 200ms-2s despite async:true | Replace with spawn + promise |
| 9 | No PreToolUse Write secret scan | hooks (H-M4) | Secrets sit on disk until git commit | Add PreToolUse Write hook with scanForSecrets() |
| 10 | solution-designer missing Write tool | agents | Cannot save ADR documents | Add Write to tools list |
| 11 | Process/lifecycle skills low actionability | skills (SYS-03) | 5 skills at 29% actionability vs 58% for technical | Add step-by-step workflows and decision trees |
| 12 | RFC 7807 inconsistency: tdd-workflow vs api-design | skills (SYS-05) | Conflicting guidance on error response shape | Update tdd-workflow example to use RFC 7807 |
| 13 | orchestrator-designer has no command | commands (C-M4) | Agent unreachable via slash command | Add commands/orchestrator-design.md |
| 14 | sdk-architect has no command | commands (C-M5) | Agent unreachable via slash command | Add commands/sdk-design.md |

### P2 — Backlog

| # | Issue | Component | Impact | Effort |
|---|-------|-----------|--------|--------|
| 15 | `promote` lacks `instinct-` prefix | commands (C-M1) | Naming inconsistency | Rename to instinct-promote |
| 16 | `deps` naming inconsistency | commands (C-M2) | Unclear scope boundary with dep-audit | Rename to dep-update; cross-ref |
| 17 | `security` bare noun naming | commands (C-M3) | Breaks verb-noun pattern | Rename to security-review |
| 18 | `deps` vs `dep-audit` overlap | commands (C-M7) | No cross-reference in deps.md | Add reciprocal cross-reference |
| 19 | /deploy command missing | commands (C-M6) | No deployment workflow command | Add commands/deploy.md |
| 20 | typescript-reviewer has only 1 example | agents | Most-used reviewer has sparse examples | Add second example |
| 21 | command-auditor has only 1 example | agents | Sparse examples | Add second example |
| 22 | hook-auditor has only 1 example | agents | Sparse examples | Add second example |
| 23 | doc-updater trigger too broad | agents | Overlaps with planner and architect | Narrow trigger description |
| 24 | competitive-analyst vs workflow-os-competitor-analyst model inconsistency | agents | Similar tasks, different model tiers | Document routing boundary |
| 25 | prompt-quality-scorer vs prompt-reviewer overlap | agents | No clear routing boundary | Add disambiguation line to each |
| 26 | scala-reviewer missing uses_skills | agents | No skill linkage | Add uses_skills frontmatter |
| 27 | 31% of skills exceed 400-line ideal | skills (SYS-04) | Large skill files reduce focus | Extract advanced sections into companion skills |
| 28 | 6 instinct-* commands below 3-step minimum | commands (C-L1) | Thin command instructions | Add precondition/execution/output steps |
| 29 | /onboard has 9 steps (above 6-step max) | commands (C-L2) | Too many top-level steps | Restructure to 4 top-level with sub-tasks |
| 30 | 192 of 237 skills not yet analyzed | skills | Coverage gap in quality data | Run skill-depth-analyzer on remaining skills |

---

## Recommended Next Roadmap

Top 5 actions for the next planning session, ranked by impact-to-effort ratio:

1. **Hook timeout and ordering hardening** (P0 items 1-4) — Add timeouts to typecheck hooks, fix auto-checkpoint staging scope, resolve async race condition. Highest user-experience impact, low effort (hooks.json config + ~20 lines of JS).

2. **Command namespace cleanup** (P1 items 5-6, P2 items 15-18) — Rename `eval` -> `llm-eval`, add `multi-*` disambiguation, fix naming inconsistencies (`promote`, `deps`, `security`). Addresses the systemic naming drift pattern. Medium effort, high discoverability impact.

3. **PreToolUse Write secret scan** (P1 item 9) — Close the defense-in-depth gap. The `scanForSecrets()` function already exists in pre-bash-dispatch.js; this is a new hook entry + thin wrapper. Low effort, meaningful security improvement.

4. **Process skill actionability lift** (P1 item 11) — Add decision trees and step-by-step workflows to the 5 lowest-scoring process skills. Addresses Pattern 3. Medium effort, improves agent delegation quality.

5. **Agent wiring completion** (P1 items 10, 13, 14) — Add Write tool to solution-designer, create commands for orchestrator-designer and sdk-architect. Closes Pattern 5 wiring gaps. Low effort per item.

---

*Report generated from component analyses in `docs/system-review/components-2026-03-10-post-hardening/`. Three issues were resolved during this session and are excluded from open counts.*
