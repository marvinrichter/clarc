---
name: slo-workflow
description: "SLI/SLO/SLA and error budget workflow: define service level indicators, set objectives, calculate error budgets, implement burn rate alerting, and use error budgets to gate risky deployments. Covers Prometheus, Datadog, and Google SRE methodology."
---

# SLO Workflow

> **Scope**: Reliability engineering — defining what "good" looks like and alerting when you're heading toward bad.
> For implementing the monitoring infrastructure, see [observability](../observability/SKILL.md).
> For incident response when SLOs are breached, see [incident-response](../incident-response/SKILL.md).

## When to Activate

- Defining reliability targets for a new service
- Setting up error budget tracking and burn rate alerts
- Deciding whether to pause a risky deployment (error budget gating)
- Creating an SLA with a customer or business unit
- Reviewing whether current alerting reflects user pain

---

## Concepts

| Term | Definition | Example |
|------|-----------|---------|
| **SLI** | Service Level Indicator — the measured metric | 99.2% of requests completed in < 500ms over last 28 days |
| **SLO** | Service Level Objective — the internal reliability target | 99.5% availability |
| **SLA** | Service Level Agreement — the customer-facing contractual commitment | 99.9% uptime, compensated if breached |
| **Error Budget** | The allowed amount of unreliability: `1 - SLO` | 0.5% = 3.65 hours of downtime per month |

**Rule**: SLA < SLO < actual performance. Buffer between SLO and SLA absorbs measurement lag.

---

## Step 1: Choose Your SLIs

SLIs should measure **user pain**, not infrastructure health. Prefer request-level metrics over host metrics.

### SLI taxonomy (Google SRE)

| Service type | Recommended SLIs |
|-------------|-----------------|
| Request/response (API) | Availability (% success), Latency (p95/p99) |
| Data pipeline | Freshness (time since last update), Correctness |
| Storage | Durability (data loss rate), Throughput |
| Streaming | Throughput (events/sec), Consumer lag |

### Availability SLI

```promql
# Prometheus: fraction of successful requests
sum(rate(http_requests_total{status!~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

### Latency SLI (histogram)

```promql
# Fraction of requests completing in < 300ms
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) < 0.3
```

---

## Step 2: Set the SLO

### SLO selection heuristics

- Start with observed performance minus a small buffer: if you're currently at 99.8%, set SLO at 99.5%
- Match customer expectations: B2B enterprise needs stricter SLOs than B2C
- Consider the cost of reliability: 99.99% costs ~10x more than 99.9%
- Set latency SLOs at p95, not p99 initially (p99 is expensive to achieve)

### SLO values and their meaning

| SLO | Max downtime/month | Max downtime/year |
|-----|-------------------|------------------|
| 99% | 7.2 hours | 3.65 days |
| 99.5% | 3.6 hours | 1.83 days |
| 99.9% | 43.8 minutes | 8.76 hours |
| 99.95% | 21.9 minutes | 4.38 hours |
| 99.99% | 4.4 minutes | 52.6 minutes |

---

## Step 3: Calculate Error Budget

```python
def error_budget(slo_percent, window_days=28):
    """Calculate error budget for a given SLO and window."""
    error_rate = 1 - (slo_percent / 100)
    total_minutes = window_days * 24 * 60
    budget_minutes = total_minutes * error_rate
    budget_requests_per_million = error_rate * 1_000_000
    return {
        'budget_minutes': budget_minutes,
        'budget_hours': budget_minutes / 60,
        'budget_rpm': budget_requests_per_million,
    }

# SLO 99.5%, 28-day window
budget = error_budget(99.5)
# → {'budget_minutes': 201.6, 'budget_hours': 3.36, 'budget_rpm': 5000}
```

### Error budget consumption tracking

```promql
# Availability error budget consumed in 28 days (%)
(
  1 - (
    sum(increase(http_requests_total{status!~"5.."}[28d]))
    /
    sum(increase(http_requests_total[28d]))
  )
) / 0.005  # divide by (1 - SLO) = error budget
```

---

## Step 4: Burn Rate Alerting

Paging on SLO breach (threshold alerts) is too slow. Use **burn rate** to alert early.

### Burn rate concept

A burn rate of 1 = consuming error budget at exactly the rate that would exhaust it by the end of the window.
A burn rate of 14.4 over 1 hour = will exhaust the entire 28-day budget in 2 hours.

### Multi-window, multi-burn-rate alerts (Google SRE Book recommendation)

| Alert | Short window | Long window | Burn rate | Severity |
|-------|-------------|-------------|-----------|---------|
| Page | 5 min | 1 hour | 14.4x | Critical |
| Page | 30 min | 6 hours | 6x | Critical |
| Ticket | 6 hours | 3 days | 3x | Warning |
| Notify | 3 days | — | 1x | Info |

```yaml
# Prometheus alerting rules (99.5% SLO, 28-day window)
groups:
  - name: slo_burn_rate
    rules:
      - alert: ErrorBudgetCritical
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m]))
          ) > 14.4 * 0.005  # 14.4x burn rate * (1 - SLO)
          and
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            / sum(rate(http_requests_total[1h]))
          ) > 14.4 * 0.005
        for: 0m
        labels:
          severity: page
        annotations:
          summary: "Error budget burning at 14.4x — exhausted in 2 hours"

      - alert: ErrorBudgetWarning
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[30m]))
            / sum(rate(http_requests_total[30m]))
          ) > 6 * 0.005
          and
          (
            sum(rate(http_requests_total{status=~"5.."}[6h]))
            / sum(rate(http_requests_total[6h]))
          ) > 6 * 0.005
        for: 0m
        labels:
          severity: ticket
        annotations:
          summary: "Error budget burning at 6x — exhausted in ~2 days"
```

---

## Step 5: Error Budget Policy

Define what happens at each budget threshold:

| Budget remaining | Policy |
|-----------------|--------|
| > 50% | Normal velocity: ship features, run experiments |
| 25–50% | Review risky changes before shipping |
| 10–25% | Freeze non-critical deployments; focus on reliability |
| < 10% | Freeze all deployments; all-hands reliability sprint |
| 0% | SLA breach risk; escalate to VP/CTO |

### Deployment gating (CI/CD integration)

```bash
#!/bin/bash
# check-error-budget.sh — fail CI if budget < 10%
BUDGET_PCT=$(curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode "query=error_budget_remaining_pct" \
  | jq -r '.data.result[0].value[1]')

if (( $(echo "$BUDGET_PCT < 10" | bc -l) )); then
  echo "ERROR: Error budget at ${BUDGET_PCT}% — deployment blocked"
  exit 1
fi
echo "Error budget at ${BUDGET_PCT}% — deployment allowed"
```

---

## SLO Document Template

```markdown
## SLO: [Service Name] — [SLI Type]

**Owner**: [team]
**SLI**: [exact metric definition]
**SLO**: [X]% over a 28-day rolling window
**SLA** (if applicable): [Y]% — breach triggers [compensation/escalation]

### Error budget
- 28-day budget: [N minutes / N requests per million]
- Budget policy: [link to policy doc]

### Alert thresholds
| Alert | Condition | Severity | Response |
|-------|-----------|----------|---------|
| Page | 14.4x burn (5m + 1h windows) | Critical | On-call response < 15min |
| Ticket | 6x burn (30m + 6h windows) | Warning | Next business day |

### Measurement
- Query: [Prometheus/Datadog query]
- Dashboard: [link]
- Report cadence: Weekly in engineering all-hands

### History
| Month | SLO met? | Budget consumed | Incidents |
|-------|----------|----------------|-----------|
```

---

## Related

- [observability](../observability/SKILL.md) — metrics infrastructure
- [incident-response](../incident-response/SKILL.md) — when SLOs breach
- `/slo` command — define and document SLOs for a service
