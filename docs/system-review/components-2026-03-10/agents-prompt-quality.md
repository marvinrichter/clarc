# Agent Prompt Quality Report — 2026-03-10

**System Average: 7.3 / 10**

## Bottom 10 (Needs Improvement)

| Agent | Score | Top Issue |
|-------|-------|-----------|
| `doc-updater` | 5.2 | No output format; no safety guardrails for Write/Edit |
| `architect` | 5.5 | All principles vague; no measurable thresholds; no output format |
| `security-reviewer` | 5.7 | OWASP table lacks remediation schema; Write/Edit without guardrails |
| `tdd-guide` | 5.8 | No output format; Write/Edit/Bash with no guardrails |
| `refactor-cleaner` | 5.9 | SAFE/CAREFUL/RISKY undefined; no confirmation before deletions |
| `orchestrator` | 6.2 | Pattern selection vague; no fallback when agent fails |
| `talk-coach` | 6.3 | Dimension scores undefined; zero concrete examples |
| `prompt-reviewer` | 6.4 | Vague "review" directives; no output schema |
| `presentation-designer` | 6.5 | Slide density rules vague; no example slide input/output |
| `workflow-os-competitor-analyst` | 6.6 | No scoring formula; output format loosely defined |

## All Agents Ranked (lowest to highest)

| Agent | Score |
|-------|-------|
| doc-updater | 5.2 |
| architect | 5.5 |
| security-reviewer | 5.7 |
| tdd-guide | 5.8 |
| refactor-cleaner | 5.9 |
| orchestrator | 6.2 |
| talk-coach | 6.3 |
| prompt-reviewer | 6.4 |
| presentation-designer | 6.5 |
| workflow-os-competitor-analyst | 6.6 |
| planner | 6.7 |
| code-reviewer | 6.8 |
| build-error-resolver | 6.9 |
| competitive-analyst | 7.0 |
| e2e-runner | 7.0 |
| feedback-analyst | 7.1 |
| platform-architect | 7.1 |
| finops-advisor | 7.2 |
| go-build-resolver | 7.2 |
| modernization-planner | 7.2 |
| design-critic | 7.3 |
| orchestrator-designer | 7.3 |
| resilience-reviewer | 7.3 |
| data-architect | 7.4 |
| docs-architect | 7.4 |
| gitops-architect | 7.4 |
| mlops-architect | 7.4 |
| product-evaluator | 7.4 |
| solution-designer | 7.4 |
| design-system-reviewer | 7.5 |
| frontend-architect | 7.5 |
| performance-analyst | 7.5 |
| sdk-architect | 7.5 |
| contract-reviewer | 7.6 |
| database-reviewer | 7.6 |
| supply-chain-auditor | 7.6 |
| devsecops-reviewer | 7.7 |
| skill-depth-analyzer | 7.7 |
| bash-reviewer | 7.8 |
| flutter-reviewer | 7.8 |
| kotlin-reviewer | 7.8 |
| scala-reviewer | 7.8 |
| elixir-reviewer | 7.9 |
| go-reviewer | 7.9 |
| r-reviewer | 7.9 |
| ruby-reviewer | 7.9 |
| php-reviewer | 8.0 |
| python-reviewer | 8.0 |
| rust-reviewer | 8.0 |
| swift-reviewer | 8.0 |
| android-reviewer | 8.1 |
| c-reviewer | 8.1 |
| csharp-reviewer | 8.1 |
| java-reviewer | 8.1 |
| cpp-reviewer | 8.2 |
| typescript-reviewer | 8.2 |
| hook-auditor | 8.3 |
| command-auditor | 8.4 |
| agent-quality-reviewer | 8.5 |
| agent-system-reviewer | 8.6 |
| prompt-quality-scorer | 8.7 |

## Key Patterns

**Strongest:** Meta-review agents (agent-quality-reviewer, agent-system-reviewer, prompt-quality-scorer, hook-auditor, command-auditor) — all 8.3+ due to explicit rubrics, dimensional scores, and output schemas.

**Weakest:** Creative/soft agents (talk-coach, presentation-designer) and core workflow agents (tdd-guide, security-reviewer, architect) — lack measurable thresholds and examples.

**Systemic gap:** Language-reviewer agents (7.8–8.2) score consistently but all lack inline examples. Adding one before/after snippet per agent would close the gap to 8.5+.
