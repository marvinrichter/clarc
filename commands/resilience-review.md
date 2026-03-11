---
description: Resilience audit — failure mode analysis, missing circuit breakers, unprotected external calls, retry anti-patterns, and distributed system resilience gaps. Invokes the resilience-reviewer agent.
---

> Note: this command replaces /resilience-audit (removed due to overlap)

# Resilience Review

Systematically identify how your service fails under realistic production conditions before they cause incidents.

## Usage

```
/resilience-review                  — full review across all resilience dimensions
/resilience-review circuit-breakers — circuit breaker coverage only
/resilience-review retries          — retry strategy and backoff analysis
/resilience-review timeouts         — timeout configuration review
/resilience-review dependencies     — external call protection review
```

Pass `$ARGUMENTS` as the focus area. Without arguments, all dimensions are reviewed.

## What This Command Does

1. **Dependency Inventory** — Scan the codebase to find all HTTP clients, DB connections, queues, and config dependencies
2. **Failure Mode Analysis** — What happens when each external dependency is slow, returns errors, or times out?
3. **Circuit Breaker Audit** — Are circuit breakers in place for all external HTTP calls, DB queries, queue operations?
4. **Retry Pattern Review** — Are retries idempotent? Is exponential backoff with jitter used? Are retry storms possible?
5. **Timeout Coverage** — Does every external call have an explicit timeout? Are they at the right layer?
6. **Bulkhead / Isolation** — Can one slow dependency starve thread pools and take down unrelated functionality?
7. **Graceful Degradation** — Does the system degrade gracefully or fail completely when a dependency is unavailable?
8. **Health Check Review** — Are liveness/readiness/startup probes correctly separated and fast enough?

## Step 0 — Delegate to resilience-reviewer Agent

**Invoke the `resilience-reviewer` agent** to perform the resilience audit.

Pass `$ARGUMENTS` (focus area or file path) to the agent. The agent will:
- Inventory all external dependencies (HTTP, DB, queue, config)
- Analyse failure modes and check for circuit breakers, timeouts, retries, and fallbacks
- Produce a CRITICAL/HIGH/MEDIUM report with recommended chaos experiments

> For a focused review (e.g., circuit-breakers only), Step 0 alone may be sufficient. Continue to the Scan Phase for a full manual deep scan.

---

## Scan Phase

Before reviewing code manually, run these scans to inventory all external dependencies:

```bash
# Find HTTP clients
grep -rn "fetch\|axios\|got\|httpx\|requests\.\|http\.Get\|HttpClient\|RestTemplate" \
  --include="*.ts" --include="*.py" --include="*.go" --include="*.java" .

# Find database connections
grep -rn "pg\|mysql\|mongodb\|redis\|dynamodb\|pool\|createConnection" \
  --include="*.ts" --include="*.js" .

# Find queue/event connections
grep -rn "kafka\|rabbitmq\|sqs\|pubsub\|amqp" \
  --include="*.ts" --include="*.py" --include="*.go" -i .

# Find config/service discovery
grep -rn "consul\|etcd\|zookeeper\|configserver" \
  --include="*.ts" --include="*.yaml" --include="*.go" -i .

# Find health endpoints
grep -rn "livenessProbe\|readinessProbe\|startupProbe" \
  --include="*.yaml" --include="*.yml" .
```

For each dependency found, build an inventory table:

| Dependency | Type | Has Timeout? | Has Retry? | Has Circuit Breaker? | Has Fallback? | Health Check? |
|------------|------|-------------|-----------|---------------------|--------------|--------------|
| PostgreSQL | DB | ? | ? | ? | ? | ? |
| Stripe API | HTTP | ? | ? | ? | ? | ? |

## When to Use

- Before adding a new external service, database, or queue dependency
- Before a chaos engineering experiment
- When designing a distributed system component
- After a production incident involving cascading failures
- As part of a pre-launch checklist for critical services

## Severity Levels

### CRITICAL
- External HTTP call with no timeout
- No circuit breaker on a critical dependency
- Retries on a non-idempotent operation without deduplication

### HIGH
- Retry without backoff (retry storm risk)
- Missing bulkhead — shared thread pool across dependencies
- No fallback behavior when dependency is down

### MEDIUM
- Retry max attempts not bounded
- Timeout configured but not tested
- Health check endpoint missing for service mesh

## Scope vs Related Commands

| Need | Command |
|------|---------|
| Chaos engineering experiment | `/chaos-experiment` |
| SLO definition | `/slo` |
| Full security review | `/security-review` |
| This command: resilience and failure modes | `/resilience-review` |

## Report Format

The agent produces a structured report:

```markdown
# Resilience Review Report

**Service:** [name]
**Date:** [YYYY-MM-DD]
**Scope:** [files/modules reviewed]

## Dependency Inventory

| Dependency | Type | Timeout | Retry | CB | Fallback | Health |
|------------|------|---------|-------|----|----------|--------|
| [name] | [type] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |

## CRITICAL — Fix Before Next Production Incident
...

## HIGH — Fix This Sprint
...

## MEDIUM — Fix Next Sprint
...

## Single Points of Failure

| SPOF | Impact | Mitigation |
|------|--------|-----------|
| [name] | [what breaks] | [recommended fix] |

## Positive Patterns Observed
- [What's already implemented well]

## Recommended Chaos Experiments

Based on this audit, high-value chaos experiments to validate fixes:
1. [Experiment]: [what it validates]

## Metrics to Set Up

To measure steady state before chaos experiments:
- [Metric]: [how to instrument]
```

## After This

- `/chaos-experiment` — validate resilience findings with real fault injection
- `/slo` — define SLOs (error rate, latency p99) that reflect resilience requirements
- `/add-observability` — add circuit breaker metrics and retry counters to dashboards
- `observability` skill — setting up metrics to measure resilience in steady state
