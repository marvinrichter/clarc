---
description: Systematic resilience audit of an architecture or codebase — inventories dependencies, checks failure handling, identifies SPOFs, outputs prioritized action plan
---

# Resilience Audit Command

Conduct a systematic resilience audit: $ARGUMENTS

## Your Task

Perform a structured resilience audit by inventorying all external dependencies and analyzing how well the system handles failures. Produce a prioritized action plan.

## Step 1 — Dependency Inventory

Identify and list ALL external dependencies:

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
```

For each dependency, create a table:

| Dependency | Type | Calls/s | Has Timeout? | Has Retry? | Has Circuit Breaker? | Has Fallback? | Health Check? |
|------------|------|---------|-------------|-----------|---------------------|--------------|--------------|
| PostgreSQL | DB | 500 | ? | ? | ? | ? | ? |
| Stripe API | HTTP | 10 | ? | ? | ? | ? | ? |
| Redis | Cache | 1000 | ? | ? | ? | ? | ? |

## Step 2 — Read the Codebase

For each dependency identified:

1. **Find the client initialization** — are timeouts set?
2. **Find call sites** — is there error handling?
3. **Find retry logic** — does it exist? Is it correct (jitter, idempotency)?
4. **Find circuit breakers** — Resilience4j, opossum, gobreaker, pybreaker?
5. **Find fallback logic** — what happens when the call fails?

## Step 3 — Single Points of Failure Analysis

Check for SPOFs:

1. **No replica / no failover:**
   - Single database instance without read replica?
   - Single instance of a critical service?
   - Single external API with no fallback provider?

2. **Stateful in-memory without persistence:**
   - In-memory cache without external backing?
   - Session state stored only in-process?

3. **Synchronous dependency in critical path:**
   - Is a non-critical feature blocking the critical path?
   - Can the primary flow complete if secondary feature fails?

4. **Shared thread pools / connection pools:**
   - All requests sharing one HTTP connection pool?
   - Analytics queries sharing write DB connections?

## Step 4 — Health Check Review

Examine health check implementations:

```bash
# Find health endpoint implementations
grep -rn "health\|liveness\|readiness" \
  --include="*.ts" --include="*.go" --include="*.py" --include="*.java" .

# Find Kubernetes probe configs
grep -rn "livenessProbe\|readinessProbe\|startupProbe" \
  --include="*.yaml" --include="*.yml" .
```

Verify:
- Liveness probe does NOT call databases (only checks process health)
- Readiness probe DOES check critical dependencies
- Probes complete in <100ms
- Failure thresholds are sensible (not too sensitive, not too slow to respond)

## Step 5 — Output: Prioritized Action Plan

Produce a structured report:

```markdown
# Resilience Audit Report

**Service:** [name]
**Date:** [YYYY-MM-DD]
**Scope:** [files/modules reviewed]

## Dependency Inventory

| Dependency | Type | Timeout | Retry | CB | Fallback | Health |
|------------|------|---------|-------|----|----------|--------|
| [name] | [type] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |

## CRITICAL — Fix Before Next Production Incident

1. **[Service]: No timeout on [dependency] call**
   - Location: `src/payments/client.ts:42`
   - Risk: One slow Stripe response hangs thread indefinitely
   - Fix: Add `timeout: 5000` to axios config
   - Effort: 30 minutes

## HIGH — Fix This Sprint

1. **[Service]: No circuit breaker for [dependency]**
   - Location: `src/inventory/repository.ts`
   - Risk: If inventory service is down, checkout service queues requests until timeout
   - Fix: Add opossum circuit breaker, return cached inventory on open state
   - Effort: 2 hours

## MEDIUM — Fix Next Sprint

1. **[Service]: Retry without jitter**
   - Location: `src/notifications/sender.ts:88`
   - Risk: After email service outage, all retries hit simultaneously (thundering herd)
   - Fix: Add exponential backoff with decorrelated jitter
   - Effort: 1 hour

## Single Points of Failure

| SPOF | Impact | Mitigation |
|------|--------|-----------|
| [name] | [what breaks] | [recommended fix] |

## Positive Patterns Observed

- [What's already implemented well]
- [Circuit breakers already in place]
- [Good timeout configurations]

## Recommended Chaos Experiments

Based on this audit, high-value chaos experiments to validate fixes:
1. [Experiment]: [what it validates]
2. [Experiment]: [what it validates]

## Metrics to Set Up

To measure steady state before chaos experiments:
- [Metric]: [how to instrument]
```

## Reference Skills

- `resilience-patterns` — implementation examples for each pattern
- `chaos-engineering` — validating that fixes work under fault injection
- `observability` — setting up the metrics to measure resilience

## After This

- `/tdd` — add chaos and failure scenario tests
- `/chaos-experiment` — run structured chaos experiments for flagged failure modes
