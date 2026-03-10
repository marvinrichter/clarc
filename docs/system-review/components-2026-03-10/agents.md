# clarc Agent Quality Review — 2026-03-10

**Overall Health Score: 7.72 / 10**
Risk distribution: **0 HIGH · 4 MEDIUM · 57 GOOD**
Agents reviewed: 61

## Summary Table (ascending by score)

| Agent | Score | Risk | Top Issue |
|-------|-------|------|-----------|
| planner | 6.50 | MEDIUM | Trigger collision with architect; no exit format |
| architect | 6.55 | MEDIUM | Trigger collision with planner; no output format spec |
| doc-updater | 6.60 | MEDIUM | `model: haiku` used for Sonnet-level write/edit tasks |
| security-reviewer | 6.65 | MEDIUM | Write/Edit tools with no confirmation guardrail |
| r-reviewer | 7.05 | GOOD | No examples; limited skill references |
| tdd-guide | 7.20 | GOOD | No examples; exit criteria vague |
| refactor-cleaner | 7.25 | GOOD | Safety gap on file deletion; no examples |
| competitive-analyst | 7.30 | GOOD | Overlaps workflow-os-competitor-analyst |
| workflow-os-competitor-analyst | 7.35 | GOOD | Overlaps competitive-analyst |
| build-error-resolver | 7.45 | GOOD | No examples; safety gap on Bash execution |
| go-build-resolver | 7.50 | GOOD | No examples; overlaps build-error-resolver for Go |
| data-architect | 7.55 | GOOD | No examples; exit format partial |
| modernization-planner | 7.60 | GOOD | No examples |
| e2e-runner | 7.65 | GOOD | No examples |
| database-reviewer | 7.65 | GOOD | Write/Edit with no confirmation; no examples |
| resilience-reviewer | 7.70 | GOOD | No examples |
| supply-chain-auditor | 7.70 | GOOD | No examples |
| finops-advisor | 7.70 | GOOD | No examples |
| platform-architect | 7.75 | GOOD | No examples |
| mlops-architect | 7.75 | GOOD | No examples |
| gitops-architect | 7.75 | GOOD | No examples |
| frontend-architect | 7.75 | GOOD | No examples |
| sdk-architect | 7.80 | GOOD | No examples |
| docs-architect | 7.80 | GOOD | No examples |
| orchestrator-designer | 7.85 | GOOD | No examples |
| feedback-analyst | 7.90 | GOOD | No examples |
| contract-reviewer | 7.90 | GOOD | No examples |
| devsecops-reviewer | 7.90 | GOOD | Overlaps security-reviewer on OWASP |
| flutter-reviewer | 7.95 | GOOD | No examples |
| android-reviewer | 7.95 | GOOD | No examples |
| design-critic | 7.95 | GOOD | No examples |
| talk-coach | 7.95 | GOOD | No examples |
| presentation-designer | 8.00 | GOOD | No examples |
| prompt-reviewer | 8.00 | GOOD | No examples |
| bash-reviewer | 8.00 | GOOD | No examples |
| c-reviewer | 8.05 | GOOD | No examples |
| csharp-reviewer | 8.05 | GOOD | No examples |
| php-reviewer | 8.05 | GOOD | No examples |
| scala-reviewer | 8.05 | GOOD | No examples |
| kotlin-reviewer | 8.05 | GOOD | No examples |
| swift-reviewer | 8.10 | GOOD | No examples |
| rust-reviewer | 8.10 | GOOD | No examples |
| go-reviewer | 8.10 | GOOD | No examples |
| ruby-reviewer | 8.10 | GOOD | No examples |
| python-reviewer | 8.10 | GOOD | No examples |
| elixir-reviewer | 8.15 | GOOD | No examples |
| cpp-reviewer | 8.15 | GOOD | No examples |
| design-system-reviewer | 8.15 | GOOD | No examples |
| solution-designer | 8.20 | GOOD | No inline examples |
| performance-analyst | 8.20 | GOOD | Strong examples; no issues |
| skill-depth-analyzer | 8.25 | GOOD | No complete example |
| command-auditor | 8.25 | GOOD | No complete example |
| hook-auditor | 8.25 | GOOD | No complete example |
| prompt-quality-scorer | 8.25 | GOOD | No complete example |
| agent-system-reviewer | 8.30 | GOOD | No examples |
| orchestrator | 8.35 | GOOD | No worked example |
| product-evaluator | 8.35 | GOOD | No complete evaluation example |
| agent-quality-reviewer | 8.40 | GOOD | System benchmark |
| java-reviewer | 8.40 | GOOD | System benchmark |
| typescript-reviewer | 8.45 | GOOD | System benchmark |
| code-reviewer | 8.45 | GOOD | System benchmark |

## Top 5 Weakest — Improvement Suggestions

**1. planner (6.50):** Differentiate from architect — description should read "Generates PRDs, task lists, and implementation timelines. Use when you need WHAT tasks to execute, not HOW to architect the system." Add exit format schema.

**2. architect (6.55):** Description should read "System design, component boundaries, ADRs, C4/arc42. Use when you need to decide HOW to structure the system." Add exit criteria: arc42 section + ADR output path.

**3. doc-updater (6.60):** One-line fix — change `model: haiku` → `model: sonnet`. Add write confirmation guardrail.

**4. security-reviewer (6.65):** Add guardrail: "Never auto-apply remediations — show diff first, confirm with user." Delineate scope from devsecops-reviewer.

**5. r-reviewer (7.05):** Add vectorization before/after example. Standardize output format to match typescript-reviewer.

## Top 5 Strongest — System Benchmarks

**1. code-reviewer (8.45):** 18-language routing table is unambiguous. Universal fallback checks. Agent tool delegation explicit.

**2. typescript-reviewer (8.45):** Hexagonal violations named with exact import path conditions. RFC 7807 with `Content-Type: application/problem+json`. `uses_skills` declared.

**3. java-reviewer (8.40):** Spring Boot 4 `ProblemDetail` by class name. DDD violations enumerated with specific anti-patterns. JPA N+1 with `@EntityGraph` fix.

**4. agent-quality-reviewer (8.40):** JSON output schema with filled example values. 8-dimension rubric with score bands. Self-referentially well-designed.

**5. orchestrator (8.35):** Pattern selection table deterministic. Conflict resolution references priority hierarchy. `### Conflicts Resolved` section in output format.

## Systemic Findings

**P0 — Planner/Architect Routing Collision:** Both descriptions share "complex features" and "refactoring" keywords. Routing bug — both activate on identical trigger. Fix: differentiate descriptions (planner=task decomposition, architect=system design).

**P0 — Model Tier Error in doc-updater:** `model: haiku` for Sonnet-level write/edit tasks. One-line fix: change to `model: sonnet`.

**P1 — Safety Guardrail Gap (6 agents):** security-reviewer, doc-updater, database-reviewer, build-error-resolver, go-build-resolver, refactor-cleaner have Write/Edit/Bash tools with no confirmation guardrail. Add standard clause: "Show diff and confirm before applying destructive changes."

**P1 — Universal Example Deficit (45/61 agents):** No `## Examples` section. Add to `docs/contributing/agent-format.md` as mandatory. Would raise health score from 7.72 → ~8.05.

**P2 — Competitive Analysis Overlap:** competitive-analyst and workflow-os-competitor-analyst share methodology. Add explicit routing disambiguation or merge.

## Health Score

Mean: **7.72 / 10** | HIGH: 0 | MEDIUM: 4 | GOOD: 57
