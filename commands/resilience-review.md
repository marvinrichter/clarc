---
description: Resilience audit — failure mode analysis, missing circuit breakers, unprotected external calls, retry anti-patterns, and distributed system resilience gaps. Invokes the resilience-reviewer agent.
---

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

1. **Failure Mode Analysis** — What happens when each external dependency is slow, returns errors, or times out?
2. **Circuit Breaker Audit** — Are circuit breakers in place for all external HTTP calls, DB queries, queue operations?
3. **Retry Pattern Review** — Are retries idempotent? Is exponential backoff with jitter used? Are retry storms possible?
4. **Timeout Coverage** — Does every external call have an explicit timeout? Are they at the right layer?
5. **Bulkhead / Isolation** — Can one slow dependency starve thread pools and take down unrelated functionality?
6. **Graceful Degradation** — Does the system degrade gracefully or fail completely when a dependency is unavailable?

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

## After This

- `/chaos-experiment` — validate resilience findings with real fault injection
- `/slo` — define SLOs (error rate, latency p99) that reflect resilience requirements
- `/observability` — add circuit breaker metrics and retry counters to dashboards
