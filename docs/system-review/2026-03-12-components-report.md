# clarc Components Review — 2026-03-12

**Mode:** Components (`/system-review components`)
**Date:** 2026-03-12
**Components reviewed:** Agents (62), Skills (30/247 sampled), Commands (172), Hooks (21)

---

## Overall Health Score: 7.5 / 10

| Component | Score | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Agents | 9.7/10 (38.82/40 avg) | 0 | 2 | 12 | 25 |
| Skills (sample) | 7.6/10 | 0 | 1 | 12 | 14 |
| Commands | 7.35/10 | 0 | 3 | 8 | 5 |
| Hooks | 7.4/10 | 0 | 1 | 4 | 4 |
| **Total** | **7.5/10** | **0** | **7** | **36** | **48** |

---

## Priority Matrix

### P0 — Fix Immediately (Broken User-Facing Links)

These cause immediate UX failures: a user following documented instructions hits a dead end.

| # | Component | File | Issue |
|---|---|---|---|
| P0-1 | Commands | `commands/quickstart.md` | References `/security` — correct command is `/security-review` |
| P0-2 | Commands | `commands/clarc-way.md` | References `/guide <task>` — `commands/guide.md` does not exist |
| P0-3 | Commands | `commands/talk-outline.md` | References `/cfp` — `commands/cfp.md` does not exist (but `cfp-coach` agent is ready) |

**Fix:** 3 one-line changes + 1 new command file (cfp.md backed by cfp-coach agent).

---

### P1 — Fix This Week (Systemic Quality Gaps)

#### P1-A: Write-Without-Confirm Pattern (5 agents)
`frontend-architect`, `platform-architect`, `presentation-designer`, `product-evaluator`, `solution-designer` all have `Write` in their tools but lack an explicit confirm-before-write guardrail.

**Reference implementation:** `data-architect.md` and `refactor-cleaner.md` — add: *"Before writing any file, announce target path and ask: 'Write this file? [yes/no]'"*

#### P1-B: Hook Formatter Dispatcher Has No Startup Validation (HIGH)
`scripts/hooks/post-edit-format-dispatch.js` dispatches 18 sub-formatter scripts via runtime EXT_MAP. If `CLAUDE_PLUGIN_ROOT` is wrong or any script is missing, **all 18 language formatters silently die** with no error output.

**Fix:** Add EXT_MAP validation at startup — verify each resolved script path exists, emit a `stderr` warning for any missing entry.

#### P1-C: Security Boundary Undocumented in 18 Language Reviewers
Every language reviewer covers some security patterns but none document the handoff to `security-reviewer` for comprehensive OWASP coverage. Creates routing ambiguity: users don't know when to invoke both.

**Fix:** Add a standard 1-line note to each language reviewer: *"For comprehensive OWASP Top 10 → also invoke `security-reviewer` in parallel."*

#### P1-D: autonomous-loops Skill — 24% Actionability (HIGH)
Only 24% of the 498-line `autonomous-loops` skill is code or commands. Three of six patterns are pure prose descriptions of external projects. Also contains an incorrect model name: `Codex` (OpenAI) instead of `claude-sonnet-latest`.

**Fix:** Add minimal runnable quick-start block for each of the 6 patterns (~10-20 lines each). Replace `Codex` with `claude-sonnet-latest`.

#### P1-E: Example Density Gap in 3 Meta-Agents
`summarizer-haiku`, `workflow-os-competitor-analyst`, and `agent-quality-reviewer` lack complete I/O examples. These are infrastructure agents called by orchestrators — without examples, output format cannot be verified.

**Fix:** Add 1 complete I/O example to each (input → actual output text, not stubs).

---

### P2 — Address in Next Roadmap Cycle (Systemic Improvements)

#### P2-A: Command Naming Inconsistencies (4 commands)
`instinct-projects`, `instinct-promote`, `multi-backend`, `multi-frontend` show incorrect short-form names in their own usage sections.

**Fix:** Update usage examples to show the full correct command name.

#### P2-B: 5 Commands Exceed 8-Step Ceiling
`wasm-build`, `arc42`, `release`, `onboard`, `backstage-setup` all have 9 steps.

**Fix:** Merge 1-2 consecutive related steps in each.

#### P2-C: 4 Commands Missing Agent Delegations
`data-mesh-review` should delegate to `data-architect`. `frontend-arch-review` should delegate to `frontend-architect`. `mlops-review` and `resilience-review` describe agent delegation in their description but body steps contain no delegation instruction.

**Fix:** Add Step 0 delegation instruction to each, matching the pattern in `security-review.md`.

#### P2-D: Skill Length Inflation (7 skills)
`go-patterns` (549L), `python-patterns` (554L), `typescript-patterns` (484L), `auth-patterns` (471L), `agent-reliability` (434L), `arc42-c4` (434L), `multi-agent-patterns` (440L) all exceed the 400-line ideal.

**Fix (systematic):** Move advanced sections to `-advanced` variant files for go-patterns, python-patterns, typescript-patterns. Move arc42 template to `docs/templates/arc42-template.md`.

#### P2-E: Meta-Skills Lack Worked Examples
`clarc-way`, `clarc-onboarding`, `continuous-learning-v2` score 7.1–7.4 because they describe workflows without showing them in action. `clarc-onboarding` has a transcript example — replicate this pattern in the other two.

#### P2-F: Hook Performance Issues (2 medium)
- `auto-checkpoint.js`: up to 5 synchronous `spawnSync` git calls per Edit/Write — migrate to async
- `response-dashboard.js`: reads full JSONL transcript on every Stop — add 5MB file-size guard reading only the tail

#### P2-G: agent-quality-reviewer Model Mismatch
Frontmatter specifies `sonnet` but agent body recommends Opus for `--all` mode. Self-referential gap: the agent reviewing quality runs below the quality level it prescribes.

**Fix:** Change frontmatter to `model: opus`.

---

## Component Highlights

### Agents (62 total — 37% perfect score)
- **23 agents scored 40/40** (no issues): `android-reviewer`, `bash-reviewer`, `c-reviewer`, `code-reviewer`, `contract-reviewer`, `data-architect`, `database-reviewer`, `design-system-reviewer`, `devsecops-reviewer`, `docs-architect`, `finops-advisor`, `gitops-architect`, `go-build-resolver`, `hook-auditor`, `mlops-architect`, `modernization-planner`, `prompt-reviewer`, `r-reviewer`, `refactor-cleaner`, `resilience-reviewer`, `sdk-architect`, `security-reviewer`, `talk-coach`
- Lowest scoring: `agent-quality-reviewer` (34/40) — audits itself and scores lowest
- Highest issue concentration: **safety_guardrails** dimension (5 write-without-confirm agents)

### Skills (30/247 sampled)
- Reference quality bar: `debugging-workflow`, `auth-patterns`, `docker-patterns`, `clarc-hooks-authoring` (8.3–8.7/10)
- Root cause of length inflation: `-advanced` split convention exists but is underused
- Only freshness error found: `autonomous-loops` references `Codex` (OpenAI model name)

### Commands (172 total)
- Score of 10/10 on built-in conflict avoidance — no clashes with `/cost`, `/help`, `/clear`, etc.
- Score of 6/10 on step count and missing commands — both need focused cleanup
- All 3 HIGH issues are broken cross-references (dead `/cfp`, `/guide`, `/security` links)

### Hooks (21 hooks, 39 scripts)
- All 14 directly referenced scripts verified to exist (0 dead refs)
- 18 sub-formatter scripts are indirect via dispatcher — fragile but documented
- Ordering issue: `auto-checkpoint` (sync) commits before `post-edit-format-dispatch` (async) — checkpoint captures unformatted code

---

## Recommended Next Roadmap

Create roadmap: `docs/roadmaps/system-review-fixes-2026-03-12.md`

**Priority order:**
1. Fix 3 broken command cross-references (P0-1, P0-2, P0-3) — 30 min
2. Create `commands/cfp.md` backed by existing `cfp-coach` agent (P0-3) — 1h
3. Add write-confirm guardrail to 5 agents (P1-A) — 2h
4. Add hook dispatcher startup validation (P1-B) — 1h
5. Add security boundary notes to 18 language reviewers (P1-C) — 2h
6. Fix `autonomous-loops` skill actionability + Codex error (P1-D) — 2h
7. Add I/O examples to 3 meta-agents (P1-E) — 3h

---

## Artifacts

```
docs/system-review/components-2026-03-12/
├── agents.json     — 62 agents scored, avg 38.82/40
├── skills.json     — 30/247 skills scored, avg 7.6/10
├── commands.json   — 172 commands audited, score 7.35/10
└── hooks.json      — 21 hooks, score 7.4/10
```
