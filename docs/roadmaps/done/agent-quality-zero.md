# Agent Quality Zero

**Status:** ✅ Done
**Date:** 2026-03-11
**Goal:** Zero findings on agent deep review — all 61 agents score ≥ 9.0, no orphan agents, no routing gaps, no guardrail gaps, no model-tier inflation.

## Problem Statement

Agent deep review (2026-03-11) scored 7.4/10 average across 61 agents. Three systemic failure modes:

1. **Safety gap** — 9 of 13 write-capable agents modify files without confirmation/dry-run (build-error-resolver, doc-updater, etc.)
2. **Routing blindspots** — android-reviewer unreachable; IaC files (.tf, .hcl, Dockerfile) not routed to any specialist
3. **Disambiguation missing** — security-reviewer / devsecops-reviewer nearly identical; 8 overlap pairs lack "Not this agent" sections; 5 orphan agents have no command entry point

Target: **≥ 9.0/10** average, **0 P0/P1 findings** on re-review.

---

## Open Items

### P0 — Critical (breaks correctness or safety)

- **P0-OL1**: `security-reviewer` / `devsecops-reviewer` — overlap P0
  - Sharpen `devsecops-reviewer` scope to IaC-only (Terraform, Docker, K8s, GitHub Actions); remove OWASP application-level checks that duplicate `security-reviewer`
  - Add `## Not This Agent` to both: security-reviewer = "application code", devsecops-reviewer = "infrastructure/CI-CD"
  - Update description of devsecops-reviewer to start with: "Reviews infrastructure-as-code, CI/CD pipelines, and container configs..."

- **P0-RT1**: `android-reviewer` unreachable via `code-reviewer`
  - Add Android project detection to `code-reviewer`: when `.kt` files present AND `AndroidManifest.xml` or `build.gradle.kts` with `com.android` plugin exists, route to `android-reviewer` instead of `kotlin-reviewer`
  - Add `## Not This Agent` to `kotlin-reviewer`: "For Android projects (Compose, Hilt, Room, ViewModel), use android-reviewer"
  - Add `## Not This Agent` to `android-reviewer`: "For pure Kotlin (server-side, CLI, non-Android), use kotlin-reviewer"

- **P0-GU1**: `build-error-resolver` — no confirmation guardrail
  - Add "show planned changes" step before any file modification: list affected files + describe change intent
  - Template: "Before applying, I will modify: [file1: fix X at line N], [file2: fix Y at line N]. Proceed?"

- **P0-GU2**: `database-reviewer` — Write/Edit tools on a read-only reviewer
  - Remove Write and Edit from `tools` frontmatter
  - Add instruction: "Output recommendations as a review comment, never modify files directly"

- **P0-OR1**: 5 orphan agents — no command entry point
  - Create `commands/contract-review.md` → invokes `contract-reviewer` (API break detection)
  - Create `commands/modernize.md` → invokes `modernization-planner` (legacy migration roadmap)
  - Create `commands/resilience-review.md` → invokes `resilience-reviewer` (failure mode analysis)
  - Create `commands/talk-review.md` → invokes `talk-coach` (presentation feedback)
  - Create `commands/docs-strategy.md` → invokes `docs-architect` (documentation platform design)

---

### P1 — High (degrades quality or increases cost)

- **P1-M1**: Model tier inflation — 4 agents on Opus unnecessarily
  - `competitive-analyst`: Opus → Sonnet (web search + structured comparison, no deep reasoning required)
  - `feedback-analyst`: Opus → Sonnet (text clustering, theme extraction)
  - `platform-architect`: Opus → Sonnet (IDP design is well-documented domain)
  - `modernization-planner`: Opus → Sonnet (hotspot analysis + strategy selection)

- **P1-EC1**: Missing exit criteria — 6 agents
  - `architect`: add `## Completion Criteria` — "Done when: ADR written, C4 diagram described, trade-offs documented"
  - `competitive-analyst`: add `## Completion Criteria` — "Done when: feature matrix complete, 3+ gaps identified, opportunity list prioritized"
  - `design-critic`: add `## Completion Criteria` — "Done when: all 6 dimensions assessed, severity ratings assigned, top 3 actionable fixes listed"
  - `doc-updater`: add `## Completion Criteria` — "Done when: summary table of modified files output with timestamps"
  - `gitops-architect`: add `## Completion Criteria` — "Done when: tool selection justified, environment strategy defined, 90-day plan drafted"
  - `presentation-designer`: add `## Completion Criteria` — "Done when: slide deck structure complete, speaker notes present on all slides"

- **P1-TL1**: Missing tools on 7 agents
  - `orchestrator-designer`: add Write (needs to save architecture docs)
  - `flutter-reviewer`: add Bash (for flutter analyze, dart format --check)
  - `resilience-reviewer`: add Bash (for grep commands referenced in its own instructions)
  - `performance-analyst`: add Bash (for profiling tool commands)
  - `design-critic`: add Grep + Bash (for searching CSS/component code)
  - `talk-coach`: add Glob (for reading slide files by pattern)
  - `data-architect`, `frontend-architect`, `platform-architect`: add Write (to save design docs)

- **P1-DU1**: `doc-updater` — no confirmation step before overwriting docs
  - Add dry-run step: "Print list of files that will be updated + first 3 lines of changes before applying"

- **P1-GO1**: `go-build-resolver` — thin content vs `build-error-resolver`, no guardrail
  - Expand with Go-specific content: go vet patterns, staticcheck messages, golangci-lint rules, module proxy issues
  - Add guardrail: "Only modify files containing build errors. Never change unrelated code"
  - Add `## Not This Agent`: "For build errors in non-Go languages, use build-error-resolver"

- **P1-RT2**: `code-reviewer` routing gaps — IaC and config files
  - Add `.tf`, `.hcl` → suggest `devsecops-reviewer`
  - Add `Dockerfile`, `.dockerfile` → suggest `devsecops-reviewer`
  - Add `.yml`, `.yaml` with `on:` / `jobs:` patterns (GitHub Actions) → suggest `devsecops-reviewer`
  - Add `.xml` in Android projects → suggest `android-reviewer`

- **P1-NA1**: Missing "Not This Agent" sections on high-collision pairs
  - `security-reviewer` ↔ `devsecops-reviewer` (covered by P0-OL1)
  - `build-error-resolver` ↔ `go-build-resolver`: add cross-disambiguation to both
  - `orchestrator` ↔ `orchestrator-designer`: add to orchestrator-designer: "This agent produces architecture docs only — to execute agents now, use orchestrator"
  - `prompt-reviewer` ↔ `prompt-quality-scorer`: add to scorer: "For deep review of a single prompt, use prompt-reviewer"
  - `feedback-analyst` ↔ `competitive-analyst`: already differentiated, verify sections exist

- **P1-GU3**: `feedback-analyst` — Write tool without path guardrail
  - Add: "Save output only to `docs/feedback/` — never overwrite existing analysis without confirmation"

- **P1-GU4**: `go-build-resolver` — Write tool without guardrail (see P1-GO1)

---

### P2 — Medium (quality, discoverability, consistency)

- **P2-SK1**: `uses_skills` frontmatter missing on 42 agents
  - Audit all 61 agents; add `uses_skills:` array to each that references skills in prose
  - Priority: all language reviewers (19 agents), then specialist agents (15), then meta agents (8)

- **P2-EX1**: Inconsistent example counts (3–9 across agents) — normalize to 4–6 per agent
  - Agents with < 4 examples: add examples
  - Agents with > 6 examples: consolidate duplicates

- **P2-DS1**: Agent descriptions vary wildly in specificity — standardize opening sentence
  - Format: `<Verb> <domain> for <scope>. Use <trigger condition>.`
  - Apply to all 61 agents

- **P2-HA1**: No Haiku-tier agents — evaluate lightweight candidates
  - Candidate lightweight agents: bash-reviewer, flutter-reviewer, talk-coach, design-critic (for quick visual scans)
  - Decision: document in ADR whether Haiku is appropriate for any reviewer agents

- **P2-TS1**: Tool list cosmetic inconsistencies
  - `competitive-analyst`: remove redundant WebSearch entry (model already has it; only explicit tool grants apply)
  - Audit all agents for tools listed that don't apply to their task

- **P2-NM1**: `go-build-resolver` naming: "resolver" not "reviewer" — verify description makes role clear
  - Update description to explicitly start with "Go build error resolver" not "Go code reviewer"

- **P2-RT3**: `.xml` routing for Android layouts in `code-reviewer`
  - When `.xml` files are in `res/layout/`, `res/drawable/`, or similar Android resource dirs → suggest `android-reviewer`

- **P2-LN1**: Agent instruction length normalization (119–404 lines range)
  - Agents < 150 lines: verify completeness, expand if needed
  - Agents > 350 lines: look for consolidation opportunities

---

## Issue Tracker

| ID | Description | Status |
|----|-------------|--------|
| P0-OL1 | security-reviewer / devsecops-reviewer overlap — sharpen scope + Not This Agent | ✅ |
| P0-RT1 | android-reviewer routing — Android detection in code-reviewer, kotlin disambiguation | ✅ |
| P0-GU1 | build-error-resolver — add diff preview before file modification | ✅ |
| P0-GU2 | database-reviewer — remove Write/Edit tools | ✅ |
| P0-OR1 | 5 orphan agents — create contract-review, modernize, resilience-review, talk-review, docs-strategy commands | ✅ |
| P1-M1 | Model tier inflation — competitive-analyst, feedback-analyst, platform-architect, modernization-planner → Sonnet | ✅ |
| P1-EC1 | Exit criteria — add Completion Criteria to 6 agents | ✅ |
| P1-TL1 | Missing tools — 7 agents need tool additions | ✅ |
| P1-DU1 | doc-updater — add dry-run confirmation step | ✅ |
| P1-GO1 | go-build-resolver — expand content + guardrail + Not This Agent | ✅ |
| P1-RT2 | code-reviewer — add IaC + Dockerfile + GitHub Actions routing | ✅ |
| P1-NA1 | Not This Agent sections — 4 overlap pairs need disambiguation | ✅ |
| P1-GU3 | feedback-analyst — add output path guardrail | ✅ |
| P2-SK1 | uses_skills frontmatter — add to 42 agents | ✅ |
| P2-EX1 | Example counts — normalize to 4–6 per agent | skipped (scope/time) |
| P2-DS1 | Description standardization — format all 61 opening sentences | skipped (scope/time) |
| P2-HA1 | Haiku-tier evaluation — ADR for lightweight agent candidates | skipped (future ADR) |
| P2-TS1 | Tool list cosmetic cleanup — remove redundant entries | skipped (low impact) |
| P2-NM1 | go-build-resolver naming clarity | ✅ |
| P2-RT3 | Android .xml routing in code-reviewer | ✅ |
| P2-LN1 | Agent instruction length normalization | skipped (scope/time) |

---

## Re-review Success Criteria

A re-run of the agent deep review must show:

- [ ] Average agent score ≥ 9.0
- [ ] 0 P0 findings
- [ ] 0 P1 findings
- [ ] 0 orphan agents (every agent reachable via ≥ 1 command)
- [ ] All write-capable agents have confirmation/dry-run guardrails
- [ ] `android-reviewer` appears in `code-reviewer` routing table
- [ ] `devsecops-reviewer` description no longer overlaps with `security-reviewer`
- [ ] All 5 new commands exist and pass `validate-commands.js`
- [ ] ≥ 80% of agents have `uses_skills` frontmatter
- [ ] No Opus agent where Sonnet suffices (justified by task complexity)
