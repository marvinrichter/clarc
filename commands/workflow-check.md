---
description: Check whether clarc supports 6 critical end-to-end developer journeys — Idea-to-Production, Bug-to-Fix, New Developer Onboarding, Incident Response, Architecture Decision, and LLM App Development. Identifies which journey steps lack Command, Agent, or Skill coverage.
---

# Workflow Completeness Check

Verify that clarc provides end-to-end support for critical developer journeys — not just individual commands, but complete multi-step workflows.

## Usage

```
/workflow-check              — check all 6 critical journeys
/workflow-check idea-to-prod — check a specific journey
```

## The 6 Critical Journeys

### J1: Idea → Production

```
idea → evaluate → explore (ADR) → prd → plan → tdd → code-review → security → deploy
```

Expected coverage:
- `/idea` → captures idea
- `/evaluate` → product-evaluator agent → Go/No-Go
- `/explore` → solution-designer agent → ADR
- `/prd` → PRD document
- `/plan` → planner agent → task breakdown
- `/tdd` → tdd-guide agent → implementation
- `/code-review` → code-reviewer agent → quality
- `/security-review` → security-reviewer agent → safety
- deployment → skills/deployment-patterns, skills/ci-cd-patterns

### J2: Bug Report → Fix → Release

```
bug-report → debugging → tdd (regression) → code-review → release
```

Expected coverage:
- debugging → skills/debugging-workflow
- regression test → `/tdd`
- code-review → `/code-review`
- `/release` → release command or process

### J3: New Developer Onboarding

```
onboard → setup-dev → first-feature → tdd → code-review → PR
```

Expected coverage:
- `/onboard` → onboarding docs generation
- `/setup-dev` → dev environment setup
- TDD workflow for first feature
- PR creation workflow

### J4: Incident → Root Cause → Postmortem

```
incident → observability → debugging → fix → postmortem → SLO-update
```

Expected coverage:
- `/incident` → incident management command
- observability → skills/observability
- debugging → skills/debugging-workflow
- `/slo` → SLO definition/update

### J5: Architecture Decision

```
idea → arc42 → explore (ADR) → prd → plan → implement → arc42-update
```

Expected coverage:
- `/arc42` → architecture documentation
- `/explore` → solution-designer → ADR
- arc42 update after implementation → `/arc42 section-N`

### J6: LLM App Development

```
prompt-engineering → eval-harness → rag-patterns → cost-aware-llm → deploy
```

Expected coverage:
- prompt engineering → skills/prompt-quality or agent
- eval harness → skills/eval-harness, `/learn-eval`
- RAG → skills/rag-patterns
- cost optimization → skills/cost-aware-llm-pipeline
- deployment → standard deploy path

## Steps Claude Should Follow

1. **Inventory clarc**: Read `commands/`, `agents/`, and check key skill names
2. **Check each journey step**: For each step, verify Command + Agent + Skill exist
3. **Mark coverage**: ✅ full, 🟡 partial, ❌ missing for each step
4. **Compute journey health**: A journey is ✅ if ≥80% of steps are covered
5. **Produce report**: Journey map with coverage status and gap list
6. **Recommend fixes**: For each ❌ step, suggest what to add

## Output Format

```markdown
# Workflow Completeness Check — YYYY-MM-DD

## Journey Health Overview
| Journey | Coverage | Steps | Issues |
|---------|----------|-------|--------|
| J1: Idea → Production | ✅ 90% | 9/9 covered | /deploy missing |
| J2: Bug → Fix | 🟡 75% | 6/8 covered | postmortem step missing |
| ...

## Detailed Journey Maps

### J1: Idea → Production
| Step | Command | Agent | Skill | Status |
|------|---------|-------|-------|--------|
| Capture idea | /idea | — | product-lifecycle | ✅ |
| Evaluate | /evaluate | product-evaluator | — | ✅ |
| ADR | /explore | solution-designer | adr-writing | ✅ |
| PRD | /prd | — | product-lifecycle | ✅ |
| Plan | /plan | planner | — | ✅ |
| TDD | /tdd | tdd-guide | tdd-workflow | ✅ |
| Code review | /code-review | code-reviewer | — | ✅ |
| Security | /security | security-reviewer | security-review | ✅ |
| Deploy | ❌ | ❌ | deployment-patterns | 🟡 |

### ...

## Gaps Requiring Action
1. **Deployment command** — J1 final step has skill but no command/agent
2. **Postmortem support** — J4 missing postmortem template and workflow
3. **LLM prompt agent** — J6 prompt engineering has no dedicated agent

## Recommended Additions
- `commands/deploy.md` — deploy command with CI/CD integration
- `commands/postmortem.md` — incident postmortem workflow
- `agents/prompt-engineer.md` — prompt engineering specialist
```

Save to: `docs/system-review/workflow-check-YYYY-MM-DD.md`

## After This

- `/system-review full` — full system review after workflow gaps are fixed
- `/competitive-review` — compare clarc workflow coverage against competitors
