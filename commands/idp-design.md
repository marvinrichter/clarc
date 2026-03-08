---
description: Design an Internal Developer Platform (IDP) for an engineering organization — guided discovery, component prioritization, make-vs-buy decision, and 90-day roadmap
---

# IDP Design Command

Design an Internal Developer Platform for: $ARGUMENTS

## Your Task

Guide the user through designing an IDP via a structured discovery process. Delegate deep analysis to the **platform-architect** agent.

## Step 1 — Quick Discovery Questions

Ask (or detect from context) the following. Collect answers before proceeding:

```
1. How many engineers in your organization? (approximate)
2. How many production services/repositories do you have?
3. What are the top 3 developer complaints right now?
   (Examples: "can't find who owns X", "takes 2 weeks to create a new service",
   "every team deploys differently", "no central documentation")
4. What's your primary cloud? (AWS / GCP / Azure / on-prem)
5. Are you using Kubernetes? (yes / no / planning to)
6. Do you have a dedicated platform/infra team? If so, how many people?
7. Have you tried anything for developer tooling before? What worked or didn't?
```

## Step 2 — Delegate to Platform Architect

Once discovery is complete, invoke the **platform-architect** agent with:
- Organization size and service count
- Top pain points (verbatim from user)
- Tech stack (cloud, k8s, CI/CD, monitoring)
- Platform team size (if any)

The agent will produce:
- IDP component priority list
- Make vs. Buy recommendation with TCO
- Adoption strategy
- 90-day implementation roadmap

## Step 3 — Validate Priorities

Before presenting the roadmap, verify with the user:

```
Based on your pain points, here's what I'd prioritize:

1. SERVICE CATALOG (Month 1) — solves "can't find owners/dependencies"
2. GOLDEN PATHS (Month 2) — solves "slow new service setup"
3. SELF-SERVICE INFRA (Month 3) — solves "Ops tickets for databases"

Does this match what's most painful? Should we reprioritize?
```

## Step 4 — Tool Decision

Present the make-vs-buy options for their situation:

```markdown
## Tool Recommendation

Given [N engineers] with [team size] dedicated platform engineers:

**Recommended:** [Backstage / Roadie / Port / Cortex]

Rationale:
- [Why this tool fits their situation]

Cost comparison (for [N] engineers):
| Option | Setup Time | Monthly Cost | 1-Year TCO |
|--------|-----------|--------------|-----------|
| Backstage (self-hosted) | 3-6 months | ~0.5 FTE | ~$120k |
| Roadie (hosted Backstage) | 1-2 weeks | $[N] | $[N] |
| Port (SaaS) | 1-2 weeks | $[N] | $[N] |
```

## Step 5 — Output the IDP Design Document

```markdown
# IDP Design — [Organization/Team Name]

**Date:** [today]
**Platform Team:** [N engineers]
**Scope:** [N engineers, N services]

## Problem Statement

[Top 3 pain points with specific impact]

## IDP Components — Priority Order

| Priority | Component | Pain Solved | Estimated Impact |
|---------|-----------|------------|-----------------|
| 1 | Service Catalog | ... | ... |
| 2 | Golden Paths | ... | ... |
| 3 | ... | ... | ... |

## Tool Decision

**Primary Platform:** [Backstage / SaaS Tool]
**Rationale:** [2-3 sentences]
**TCO (12 months):** $[N]

## Adoption Strategy

**Pilot Team:** [How to select]
**Success Criteria for Pilot:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

**Expansion Plan:**
1. Pilot team (Month 1-3)
2. Opt-in expansion (Month 4-6)
3. Full org (Month 7-12)

## 90-Day Roadmap

[Detailed week-by-week plan from platform-architect]

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Low adoption | High | Solve real pain for pilot team; don't mandate |
| Maintenance burden | Medium | Start with SaaS or hosted Backstage |
| Scope creep | High | Ship one component at a time, validate |

## Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|--------------|
| Time to find service owner | [N hours] | < 60 seconds |
| Time to create new service | [N weeks] | < 10 minutes |
| Developer NPS (platform) | [unknown] | ≥ 7 |
| Deployment frequency | [current DORA] | +50% |
```

## Reference Skills

- `platform-engineering` — IDP strategy, Team Topologies, maturity model
- `backstage-patterns` — catalog YAML, Scaffolder templates, plugins
