# clarc Developer Scenario Coverage Map
**Generated:** 2026-03-08
**Total scenarios:** 33 | ✅ Full: 30 | 🟡 Partial: 3 | ❌ None: 0

---

## Coding Workflow

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| Implement new feature | ✅ | /plan, /tdd | planner, tdd-guide | tdd-workflow | — |
| Fix a bug | ✅ | /tdd, /build-fix | tdd-guide, build-error-resolver | debugging-workflow | — |
| Refactor code | ✅ | /refactor | refactor-cleaner | — | — |
| Code review | ✅ | /code-review | code-reviewer | — | — |
| Fix build errors | ✅ | /build-fix | build-error-resolver | — | — |
| Security review | ✅ | /security | security-reviewer | security-review | — |

## Testing

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| Write tests (TDD) | ✅ | /tdd | tdd-guide | tdd-workflow | — |
| E2E testing | ✅ | /e2e | e2e-runner | e2e-testing | — |
| Test coverage audit | ✅ | /test-coverage | — | — | — |
| Load testing | ✅ | — | — | load-testing | — |

## Architecture

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| Architecture decision (ADR) | ✅ | /explore | solution-designer | adr-writing | — |
| API contract design | ✅ | — | — | api-contract, api-design | — |
| Database schema design | ✅ | /database-review | database-reviewer | postgres-patterns | — |
| arc42 documentation | ✅ | /arc42 | — | arc42-c4 | — |

## DevOps

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| CI/CD setup | ✅ | /setup-ci | — | ci-cd-patterns | — |
| Deployment planning | ✅ | — | — | deployment-patterns | — |
| Incident management | ✅ | /incident | — | incident-response | — |
| SLO definition | ✅ | /slo | — | slo-workflow | — |
| Observability setup | ✅ | — | — | observability | — |

## Product

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| Idea evaluation | ✅ | /evaluate | product-evaluator | product-lifecycle | — |
| PRD writing | ✅ | /prd | — | product-lifecycle | — |
| User feedback analysis | ✅ | /analyze-feedback | feedback-analyst | — | — |
| Competitive analysis | 🟡 | — | — | — | /competitive-review, agent:workflow-os-competitor-analyst |

## AI/LLM

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| Prompt engineering | 🟡 | — | — | — | agent:prompt-quality-scorer |
| RAG implementation | ✅ | — | — | rag-patterns | — |
| Agent system design | ✅ | — | — | autonomous-loops | — |
| Eval harness | ✅ | /learn-eval | — | eval-harness | — |
| LLM cost optimization | ✅ | — | — | cost-aware-llm-pipeline | — |

## Self-Review

| Scenario | Status | Command | Agent | Skill | Missing |
|----------|--------|---------|-------|-------|---------|
| Agent quality review | ✅ | /agent-review | agent-quality-reviewer | — | — |
| Skill depth analysis | ✅ | /skill-depth | skill-depth-analyzer | — | — |
| Command audit | ✅ | /command-audit | command-auditor | — | — |
| Hook audit | ✅ | /hook-audit | hook-auditor | — | — |
| Full system review | 🟡 | — | — | — | /system-review, agent:agent-system-reviewer |

---

## Prioritized Gaps

| Priority | Scenario | Category | Missing Components |
|----------|----------|----------|-------------------|
| P1 | Competitive analysis | Product | /competitive-review, agent:workflow-os-competitor-analyst |
| P2 | Full system review | Self-Review | /system-review, agent:agent-system-reviewer |
| P3 | Prompt engineering | AI/LLM | agent:prompt-quality-scorer |
