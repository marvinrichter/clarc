---
description: Define SLIs, SLOs, and error budgets for a service. Produces a complete SLO document with burn rate alert rules and deployment gating policy.
---

# SLO — Service Level Objective Design

Define SLOs for: $ARGUMENTS

---

## Step 1 — Identify the service and user journey

From $ARGUMENTS, determine:
- What does this service do from a user perspective?
- What is the primary user-visible action (API call, page load, job execution)?
- Who are the users (internal, external, enterprise, consumer)?

## Step 2 — Choose SLIs

Select 1-3 SLIs from the taxonomy:

| Service type | SLI options |
|-------------|------------|
| HTTP API | Availability (% non-5xx), Latency (p95 < Xms) |
| Background job | Freshness (time since last success), Completion rate |
| Database | Query latency p99, Replication lag |
| Queue consumer | Consumer lag, Message processing latency |

Write the exact Prometheus/Datadog query for each SLI.

## Step 3 — Set the SLO value

Calculate error budget for candidate SLO values:

```
99%   → 7.2 hours downtime/month
99.5% → 3.6 hours downtime/month
99.9% → 43.8 minutes downtime/month
```

Choose based on:
- Current actual performance (set SLO slightly below it)
- Customer expectations
- Cost of achieving higher reliability

## Step 4 — Define the error budget policy

| Budget remaining | Policy |
|-----------------|--------|
| > 50% | Ship freely |
| 25–50% | Review risky changes |
| < 25% | Freeze non-critical deploys |
| < 10% | Full reliability sprint |

## Step 5 — Generate burn rate alert rules

Produce Prometheus alerting rules using the multi-window pattern:
- Critical (page): 14.4x burn rate over 5m + 1h
- Warning (ticket): 6x burn rate over 30m + 6h

## Step 6 — Output the SLO document

Produce a complete document in this format:

```markdown
## SLO: [Service] — [SLI Type]

**Owner**: [team]
**SLI**: [metric + query]
**SLO**: [X]% over 28-day rolling window
**Error budget**: [N minutes or N requests per million]

### Budget policy
[table from Step 4]

### Prometheus alert rules
[generated YAML from Step 5]

### Dashboard query
[query to track budget remaining]
```

## After This

- `/instrument` — add instrumentation to measure the defined SLOs
- `/engineering-review` — include SLO progress in the monthly review
