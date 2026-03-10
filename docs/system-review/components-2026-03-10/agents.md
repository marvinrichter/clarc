# clarc Agent Quality Review — 2026-03-10 (Round 2)

**Overall Health Score: 8.4 / 10**
Risk distribution: **0 HIGH · 1 MEDIUM · 60 GOOD**
Agents reviewed: 61

> Note: Round 1 (7.72/10, 4 MEDIUM) used description-only scoring. Round 2 read full instruction bodies — this is the authoritative report.

---

## Score Table (all 61 agents, alphabetical)

Columns: Cl=Clarity, Mo=Model, To=Tools, Tr=Trigger, Ex=Exit, Xm=Examples, Ov=Overlap, Sf=Safety

| Agent | Cl | Mo | To | Tr | Ex | Xm | Ov | Sf | Score | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| agent-quality-reviewer | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 10 | **8.90** | GOOD |
| agent-system-reviewer | 9 | 10 | 8 | 9 | 8 | 6 | 9 | 10 | **8.65** | GOOD |
| android-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 8 | 10 | **8.20** | GOOD |
| architect | 8 | 10 | 9 | 9 | 8 | 6 | 9 | 10 | **8.55** | GOOD |
| bash-reviewer | 8 | 8 | 8 | 9 | 8 | 6 | 9 | 10 | **8.10** | GOOD |
| build-error-resolver | 8 | 8 | 9 | 8 | 8 | 6 | 8 | 7 | **7.90** | GOOD |
| c-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| code-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 8 | 10 | **8.20** | GOOD |
| command-auditor | 8 | 8 | 9 | 8 | 9 | 7 | 9 | 10 | **8.30** | GOOD |
| competitive-analyst | 8 | 10 | 7 | 8 | 8 | 7 | 8 | 9 | **8.10** | GOOD |
| contract-reviewer | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 9 | **8.65** | GOOD |
| cpp-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| csharp-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| data-architect | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| database-reviewer | 8 | 8 | 9 | 8 | 8 | 6 | 9 | 7 | **7.95** | GOOD |
| design-critic | 9 | 8 | 8 | 8 | 9 | 4 | 9 | 10 | **8.10** | GOOD |
| design-system-reviewer | 9 | 8 | 9 | 8 | 9 | 6 | 9 | 10 | **8.45** | GOOD |
| devsecops-reviewer | 9 | 8 | 9 | 7 | 9 | 8 | 7 | 9 | **8.35** | GOOD |
| doc-updater | 8 | 8 | 9 | 7 | 8 | 5 | 9 | 8 | **7.75** | GOOD |
| docs-architect | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 10 | **8.70** | GOOD |
| e2e-runner | 8 | 8 | 9 | 8 | 8 | 6 | 9 | 8 | **8.00** | GOOD |
| elixir-reviewer | 8 | 8 | 9 | 8 | 8 | 6 | 9 | 10 | **8.10** | GOOD |
| feedback-analyst | 8 | 9 | 8 | 9 | 8 | 7 | 9 | 9 | **8.30** | GOOD |
| finops-advisor | 9 | 8 | 9 | 8 | 9 | 7 | 9 | 10 | **8.55** | GOOD |
| flutter-reviewer | 8 | 8 | 8 | 8 | 8 | 6 | 9 | 10 | **7.95** | GOOD |
| frontend-architect | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 9 | **8.65** | GOOD |
| gitops-architect | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 10 | **8.70** | GOOD |
| go-build-resolver | 8 | 8 | 9 | 9 | 8 | 6 | 8 | 7 | **8.05** | GOOD |
| go-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 8 | 10 | **8.20** | GOOD |
| hook-auditor | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 10 | **8.70** | GOOD |
| java-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| kotlin-reviewer | 8 | 8 | 7 | 9 | 8 | 6 | 7 | 10 | **7.85** | GOOD |
| mlops-architect | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 10 | **8.70** | GOOD |
| modernization-planner | 9 | 10 | 9 | 9 | 9 | 8 | 9 | 9 | **9.05** | GOOD |
| orchestrator | 9 | 10 | 9 | 9 | 9 | 7 | 9 | 10 | **9.00** | GOOD |
| orchestrator-designer | 9 | 10 | 8 | 9 | 9 | 7 | 8 | 10 | **8.80** | GOOD |
| performance-analyst | 9 | 8 | 9 | 9 | 10 | 9 | 9 | 10 | **9.00** | GOOD |
| php-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| platform-architect | 9 | 10 | 9 | 9 | 9 | 8 | 9 | 10 | **9.10** | GOOD |
| planner | 9 | 10 | 9 | 9 | 9 | 9 | 9 | 10 | **9.20** | GOOD |
| presentation-designer | 9 | 8 | 8 | 8 | 9 | 7 | 7 | 9 | **8.25** | GOOD |
| product-evaluator | 9 | 10 | 8 | 9 | 9 | 7 | 9 | 10 | **8.85** | GOOD |
| prompt-quality-scorer | 8 | 8 | 9 | 8 | 9 | 6 | 7 | 10 | **8.10** | GOOD |
| prompt-reviewer | 8 | 8 | 8 | 8 | 8 | 6 | 7 | 10 | **7.85** | GOOD |
| python-reviewer | 8 | 8 | 9 | 8 | 8 | 6 | 9 | 10 | **8.10** | GOOD |
| r-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| refactor-cleaner | 8 | 8 | 9 | 8 | 8 | 5 | 9 | 7 | **7.85** | GOOD |
| resilience-reviewer | 9 | 8 | 9 | 8 | 9 | 7 | 9 | 10 | **8.55** | GOOD |
| ruby-reviewer | 8 | 8 | 9 | 8 | 8 | 6 | 9 | 10 | **8.10** | GOOD |
| rust-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| scala-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| sdk-architect | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 10 | **8.70** | GOOD |
| security-reviewer | 9 | 8 | 9 | 8 | 9 | 6 | 8 | 7 | **8.25** | GOOD |
| skill-depth-analyzer | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 10 | **8.70** | GOOD |
| solution-designer | 9 | 10 | 9 | 9 | 9 | 8 | 9 | 10 | **9.10** | GOOD |
| supply-chain-auditor | 9 | 8 | 9 | 9 | 9 | 7 | 8 | 10 | **8.65** | GOOD |
| swift-reviewer | 8 | 8 | 9 | 9 | 8 | 6 | 9 | 10 | **8.25** | GOOD |
| talk-coach | 8 | 8 | 8 | 7 | 9 | 5 | 6 | 10 | **7.65** | GOOD |
| tdd-guide | 8 | 8 | 9 | 8 | 9 | 5 | 9 | 7 | **7.95** | GOOD |
| typescript-reviewer | 8 | 8 | 9 | 8 | 8 | 7 | 8 | 10 | **8.15** | GOOD |
| workflow-os-competitor-analyst | 8 | 8 | 7 | 7 | 8 | 6 | 6 | 9 | **7.45** | MEDIUM |

---

## System-Wide Dimension Averages

| Dimension | Avg Score | Notes |
|-----------|-----------|-------|
| Instruction Clarity | ~8.5 | Strong across all agents |
| Model Appropriateness | ~8.7 | Accurate tier selection; Opus justified for 10 strategic agents |
| Tool Coverage | ~8.8 | Well-calibrated; 2 exceptions (kotlin-reviewer missing Bash, competitive-analyst missing Glob) |
| Trigger Precision | ~8.5 | Clear descriptions with 3 overlap exception pairs |
| Exit Criteria | ~8.6 | Most agents have output format |
| **Example Density** | **~6.5** | **System-wide weak point — 45/61 agents score ≤6** |
| Overlap Detection | ~8.7 | Well-differentiated overall |
| Safety Guardrails | ~9.1 | Read-only agents score 10; write-capable agents average 7.5 |

---

## Top 5 Weakest

| Rank | Agent | Score | Key Issues |
|------|-------|-------|------------|
| 1 | workflow-os-competitor-analyst | 7.45 | Bash tool never used in instructions; trigger overlaps competitive-analyst; both produce feature matrices |
| 2 | talk-coach | 7.65 | No worked example (outline → annotated feedback); trigger overlaps presentation-designer for "slide deck review" |
| 3 | doc-updater | 7.75 | Broad trigger; no concrete codemap before/after example |
| 4 | kotlin-reviewer | 7.85 | Missing Bash tool (cannot run `./gradlew ktlintCheck`); overlap ambiguity with android-reviewer for .kt files |
| 5 | refactor-cleaner | 7.85 | No worked example (knip output → removed files); no explicit dry-run confirmation before deletions |

---

## Top 5 Strongest

| Rank | Agent | Score | Key Strengths |
|------|-------|-------|---------------|
| 1 | planner | 9.20 | Full Stripe subscription worked example with 5 phases; clarc component mapping step; Opus justified; exact plan format |
| 2 | solution-designer | 9.10 | Complete ADR template with trade-off matrix; 2-4 option generation process; Opus justified |
| 3 | platform-architect | 9.10 | Diagnose-first with org-size decision trees; make-vs-buy framework; 90-day roadmap output |
| 4 | modernization-planner | 9.05 | Concrete git churn bash commands; Churn×Complexity hotspot methodology; phased migration patterns |
| 5 | orchestrator / performance-analyst | 9.00 | 5-pattern selection table; Conflicts Resolved section; or: strong examples, tool-specific profiler instructions |

---

## Action Items

### HIGH (fix immediately)
1. **kotlin-reviewer**: Add `Bash` to tools list — needed for `./gradlew ktlintCheck`
2. **design-critic**: Add ≥2 worked examples — currently has zero despite clear output format
3. **workflow-os-competitor-analyst**: Remove `Bash` from tools — never used; only WebSearch + Read referenced
4. **competitive-analyst**: Add `Glob` to tools — instructions reference `agents/`, `commands/`, `skills/` directories but lacks Glob to traverse them

### MEDIUM (next sprint)
5. Add worked example to `talk-coach` — e.g., "Given this outline → annotated feedback per dimension"
6. Add worked example to `doc-updater` — e.g., "Given this function signature → codemap entry generated"
7. Add worked example to `refactor-cleaner` — e.g., "knip found 15 unused exports → removed 3 safely"
8. Add explicit dry-run step to `refactor-cleaner` — show list before deleting, wait for confirmation
9. Add "show diff before applying" guardrail to `security-reviewer`
10. Tighten `talk-coach` trigger to distinguish from `presentation-designer`
11. Tighten `devsecops-reviewer` trigger to emphasize "git diff of changed files" vs `security-reviewer`'s broader scope
12. Tighten `workflow-os-competitor-analyst` trigger to "clarc vs AI coding tools" (not general product competitive research)

### LOW (backlog)
13. Add overlap disambiguation note between `prompt-reviewer` and `prompt-quality-scorer`
14. Mandate `## Examples` section in `agent-format.md` ✅ (done this session) — would raise system health 8.4 → ~8.7

---

## Systemic Observations

**Example Density Gap (45/61 agents score ≤6):** Adding a required `## Examples` section is the single highest-leverage improvement. The 16 agents with examples are the strongest performers.

**Safety Guardrail Gap (6 agents):** Agents with Write/Edit/Bash lacking confirmation steps: security-reviewer, database-reviewer, build-error-resolver, go-build-resolver, refactor-cleaner, tdd-guide. Add "show diff / list changes before applying" clause.

**Model Calibration is Accurate:** Opus used for 10 agents where strategic multi-step reasoning is essential (planner, architect, orchestrator, product-evaluator, solution-designer, competitive-analyst, feedback-analyst, modernization-planner, platform-architect, orchestrator-designer). No misallocations.

**Overlap is Well-Managed:** 3 exception pairs need trigger precision improvements (not merges): competitive-analyst / workflow-os-competitor-analyst, talk-coach / presentation-designer, devsecops-reviewer / security-reviewer.
