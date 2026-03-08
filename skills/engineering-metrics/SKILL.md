---
name: engineering-metrics
description: "Engineering effectiveness metrics: DORA Four Keys (Deployment Frequency, Lead Time, Change Failure Rate, MTTR), SPACE Framework (Satisfaction, Performance, Activity, Communication, Efficiency), Goodhart's Law pitfalls, Velocity vs. Outcomes, Developer Experience measurement."
---

# Engineering Metrics Skill

"If you can't measure it, you can't improve it" — but measuring the wrong things destroys teams. This skill covers the metrics frameworks that correlate with actual engineering effectiveness, and how to avoid turning metrics into gaming incentives.

## When to Activate

- Setting up an engineering effectiveness program
- Running a quarterly engineering health review
- Reporting engineering team performance to leadership
- Diagnosing why a team feels slow despite high activity
- Designing a Developer Experience (DevEx) initiative

---

## DORA Four Keys

From Google's State of DevOps Research (2019+, DORA Institute), the four metrics that best predict software delivery performance and organizational outcomes.

### 1. Deployment Frequency

**What:** How often does the team successfully deploy to production?

| Performance | Frequency |
|-------------|-----------|
| Elite | Multiple times per day |
| High | Once per day to once per week |
| Medium | Once per week to once per month |
| Low | Less than once per month |

**Why it matters:** High deployment frequency → smaller batches → lower risk → faster feedback.

**How to measure:**
```bash
# GitHub: count successful production deployments
gh api repos/:owner/:repo/deployments \
  --jq '[.[] | select(.environment == "production")] | length'

# Or: count merges to main as a proxy
git log --after="30 days ago" --merges --oneline main | wc -l
```

**Common improvement paths:**
- Trunk-based development (no long-lived branches)
- Feature flags (decouple deploy from release)
- Automated deployment pipeline (remove manual gates)

### 2. Lead Time for Changes

**What:** Time from first code commit to successful production deployment.

| Performance | Lead Time |
|-------------|-----------|
| Elite | < 1 hour |
| High | 1 day to 1 week |
| Medium | 1 week to 1 month |
| Low | 1 to 6 months |

**How to measure:**
```bash
# Approximate: time from PR creation to merge
gh pr list --state=merged --json createdAt,mergedAt \
  --jq '[.[] | {duration: (((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600)}] |
        map(.duration) | add / length'

# Better: time from first commit in branch to deployment
# (requires deployment tracking in your CI/CD tool)
```

**Bottlenecks by phase:**

| Phase | Common Bottleneck | Fix |
|-------|------------------|-----|
| Coding → PR | Large PRs | Break into smaller PRs |
| PR open → merge | Slow reviews | SLA for reviews (e.g., <24h), PR size limit |
| Merge → deploy | Long CI pipeline | Parallelize tests, optimize Docker builds |
| Deploy → stable | Slow rollout | Automated canary, faster health checks |

### 3. Change Failure Rate

**What:** Percentage of deployments that result in a degraded service, requiring hotfix or rollback.

| Performance | Rate |
|-------------|------|
| Elite | 0–15% |
| High | 16–30% |
| Medium | 16–30% (same range as High; score depends on MTTR) |
| Low | 46–60% |

**How to measure:**
```bash
# Manual: incidents created within N hours of a deployment
# Automated: correlate deployment timestamps with PagerDuty/OpsGenie incident creation

# Simplified: rollback rate
git log --oneline --all | grep -i "revert\|rollback\|hotfix" | wc -l
# Divide by total deployments in period
```

### 4. Mean Time to Restore (MTTR)

**What:** How long to recover from a service degradation.

| Performance | MTTR |
|-------------|------|
| Elite | < 1 hour |
| High | < 1 day |
| Medium | 1 day to 1 week |
| Low | > 1 week |

**How to measure:** Incident duration from your on-call system (PagerDuty, OpsGenie, Grafana OnCall).

**Improvement paths:**
- Runbooks for every alert
- Faster incident detection (alerting SLOs)
- Incident commander role (clear ownership)
- Post-mortems → preventive action items

### DORA Team Classification

| Level | Deploy Freq | Lead Time | CFR | MTTR |
|-------|------------|-----------|-----|------|
| Elite | Multiple/day | < 1h | 0–15% | < 1h |
| High | Daily/weekly | 1d–1wk | 16–30% | < 1d |
| Medium | Weekly/monthly | 1wk–1mo | 16–30% | 1d–1wk |
| Low | Monthly/less | 1–6mo | 46–60% | > 1wk |

A team's level = the *lowest* single-metric rating (weakest link).

---

## SPACE Framework

From GitHub Research (2021). Five dimensions of developer productivity:

| Dimension | What It Measures | Example Metrics |
|-----------|-----------------|-----------------|
| **S**atisfaction | Wellbeing, engagement, retention | eNPS, survey scores, attrition rate |
| **P**erformance | Outcomes achieved | Feature delivery, quality (defect rate), reliability |
| **A**ctivity | Work artifacts produced | PRs merged, commits, code reviews completed |
| **C**ommunication | Knowledge flow, collaboration | Cross-team PRs, documentation coverage, review turnaround |
| **E**fficiency | Flow state, low friction | Interruption rate, build time, onboarding time |

**Critical SPACE insight**: Never measure only Activity. A team can maximize commits while delivering zero business value.

Healthy signal: **S + P improving** while A stays constant = efficiency gain.
Warning signal: **A increasing** while S declining = burnout, unsustainable pace.

---

## Goodhart's Law and Gaming

**Goodhart's Law**: "When a measure becomes a target, it ceases to be a good measure."

### Common DORA Gaming Patterns

| Metric | How Teams Game It | Consequence |
|--------|------------------|-------------|
| Deployment Frequency | Deploy config-only changes, trivial PRs | High frequency, no value delivery |
| Lead Time | Mark PRs as created late, skip code review | Fast on paper, poor quality |
| Change Failure Rate | Don't declare incidents, "it was a feature" | Hidden failures, no learning |
| MTTR | Close incidents prematurely, reopen later | Looks fast, actually slow |

### Anti-gaming Principles

1. **Never rank individuals by DORA** — only teams
2. **Never use DORA for performance reviews** — it will be gamed
3. **Show trends, not absolutes** — "improving" matters more than "Elite"
4. **Combine DORA with qualitative signals** — survey + metrics
5. **Let teams own their metrics** — not management measuring teams

---

## Velocity and Story Points

**What velocity is good for**: Sprint planning (capacity estimation), not performance measurement.

**What velocity is bad for**:
- Comparing teams (different story point calibrations)
- Measuring productivity (output ≠ outcome)
- Predicting business value (20 points of non-critical work ≠ 20 points of revenue-critical work)

**Better alternatives to velocity for effectiveness**:
- **Cycle time** (time from "in progress" to "done"): objective, no estimation bias
- **Throughput** (items completed/week): counts finished work, not estimated work
- **Flow efficiency** (active time / total time): % of time item is actually being worked on

---

## Developer Experience (DevEx)

From "DevEx: What Actually Drives Productivity" (Noda et al., 2023), three core factors:

1. **Flow State**: Ability to stay focused without interruptions
2. **Feedback Loops**: Quickly knowing if work is correct (fast CI, fast review)
3. **Cognitive Load**: How hard it is to understand and change the system (documentation, complexity, tooling)

**Quick proxy survey questions (1–7 scale):**
```
1. I can get into a flow state during my work (rarely 1 → often 7)
2. I feel confident that changes I make work correctly before deployment (1 → 7)
3. I understand how my work contributes to company goals (1 → 7)
4. Our development tools support my work effectively (1 → 7)
5. I feel energized by my work rather than drained (1 → 7)
```

Score < 4 on any item = action required.

---

## Leading vs. Lagging Indicators

DORA metrics are **lagging** — they tell you what already happened.

| Leading Indicator | Predicts |
|------------------|---------|
| PR size (lines of code) | Lead time (large PRs → slower review) |
| CI duration | Lead time (slow CI → slow delivery) |
| PR review turnaround | Lead time |
| Test coverage | Change failure rate |
| Incident runbook coverage | MTTR |
| Onboarding time | Team efficiency long-term |

**Track leading indicators weekly** to catch problems before they show in DORA.

---

## Reference Commands

- `/dora-baseline` — measure current DORA baseline for your team
- `/devex-survey` — design and run a developer experience survey
- `/engineering-review` — monthly engineering health review workflow
- `dora-implementation` skill — technical setup for extracting DORA data from GitHub/GitLab
