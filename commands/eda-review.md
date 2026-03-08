---
description: Review event-driven code for idempotency, ordering guarantees, schema evolution compatibility, DLQ handling, and observability — produces prioritized findings
---

# EDA Review Command

Review event-driven code for: $ARGUMENTS

## Your Task

Systematically audit event-driven code across 5 quality dimensions and produce prioritized findings.

## Step 1 — Identify EDA Code

```bash
# Find producers (event publishers)
grep -rn "publish\|emit\|send\|produce\|putEvents\|sendMessage" src/ \
  --include="*.ts" --include="*.java" --include="*.py" | grep -v "test\|spec" | head -30

# Find consumers (event handlers)
grep -rn "subscribe\|consume\|@EventHandler\|@KafkaListener\|@SqsListener\|addEventListener" src/ \
  --include="*.ts" --include="*.java" --include="*.py" | grep -v "test\|spec" | head -30

# Find event schemas
find src/ -name "*Event*.ts" -o -name "*Event*.java" -o -name "*.avsc" -o -name "*.proto" | head -20

# Find DLQ configurations
grep -rn "deadLetter\|dlq\|DLQ\|dead-letter" . --include="*.ts" --include="*.yaml" --include="*.json" | head -10
```

## Step 2 — Idempotency Check

**Question: Can the same message be safely processed twice?**

For each consumer, check:

```bash
# Look for idempotency patterns
grep -rn "idempotency\|deduplication\|processedIds\|messageId" src/ --include="*.ts" --include="*.java" | head -20

# Look for database upserts (good) vs. inserts without checks (risky)
grep -rn "INSERT INTO\|\.create(\|\.save(\|\.insert(" src/ --include="*.ts" --include="*.java" | grep -v "test" | head -20

# Check if unique constraints exist
grep -rn "UNIQUE\|unique:\s*true\|@Column(unique" src/ --include="*.ts" --include="*.java" --include="*.sql" | head -10
```

**Classify each consumer:**
- ✅ **Idempotent** — uses upsert, checks processed-set, or has unique DB constraint
- ⚠️ **Partially idempotent** — some paths are safe, others are not
- ❌ **NOT idempotent** — plain insert, no deduplication check

**Fix for non-idempotent consumers:**
```typescript
// Before processing, check if already handled
const isDuplicate = await redis.exists(`processed:${event.messageId}`);
if (isDuplicate) { logger.info('Duplicate — skipping', { messageId }); return; }

await processEvent(event);
await redis.setEx(`processed:${event.messageId}`, 86400, '1');
```

## Step 3 — Ordering Guarantee Check

**Question: Does the code assume ordering that isn't guaranteed?**

```bash
# Check Kafka topic configurations for partition count
grep -rn "partitions\|numPartitions" . --include="*.yaml" --include="*.ts" --include="*.java" | head -10

# Look for cross-partition ordering assumptions
grep -rn "ORDER BY\|sort\|sequence\|version" src/ --include="*.ts" | head -20

# Check if consumers handle out-of-order events
grep -rn "version\|timestamp\|sequenceNumber" src/ --include="*.ts" | head -10
```

**Findings format:**
- ✅ **Correct** — partition key ensures ordering for related events, no cross-partition assumption
- ⚠️ **Risk** — code assumes ordering but uses multiple partitions; add version/timestamp check
- ❌ **Broken** — SQS Standard used but code requires strict ordering; switch to SQS FIFO or Kafka

## Step 4 — Schema Evolution Check

**Question: Will old consumers break when this schema changes?**

```bash
# Check schema registry usage
grep -rn "SchemaRegistry\|schema.registry" . --include="*.ts" --include="*.java" --include="*.yaml" | head -10

# Check for backward compatibility annotations
grep -rn "BACKWARD\|FORWARD\|FULL\|NONE" . --include="*.yaml" --include="*.json" | head -10

# Check if consumers use strict deserialization (breaks on unknown fields)
grep -rn "FAIL_ON_UNKNOWN_PROPERTIES\|strict:\s*true\|additionalProperties.*false" src/ \
  --include="*.ts" --include="*.java" | head -10
```

**Schema change classification:**
| Change | Compatible? | Action |
|--------|-------------|--------|
| Add optional field | ✅ Yes | Safe to deploy |
| Remove optional field | ⚠️ Maybe | Check if consumers use it |
| Rename field | ❌ No | Add new + deprecate old |
| Change field type | ❌ No | New field + migrate consumers |
| Remove required field | ⚠️ Risk | Consumers may fail if they send it |

## Step 5 — DLQ Handling Check

**Question: What happens to messages that can't be processed?**

```bash
# Check DLQ configuration
grep -rn "deadLetterQueue\|RedrivePolicy\|dlq\|maxReceiveCount" . \
  --include="*.yaml" --include="*.json" --include="*.ts" | head -10

# Check if DLQ is monitored
grep -rn "DLQ\|dead.letter" .github/ monitoring/ alerts/ 2>/dev/null | head -10

# Check for retry configuration
grep -rn "maxRetries\|retryCount\|retryable\|backoff" src/ --include="*.ts" --include="*.java" | head -10
```

**DLQ checklist:**
- [ ] DLQ is configured (not just silently dropping failed messages)
- [ ] DLQ message count is monitored + alerts on any message
- [ ] DLQ messages preserve original headers for debugging (original topic, offset, error)
- [ ] Process exists to replay or investigate DLQ messages
- [ ] Max retry count is configured (not infinite retry loop)

## Step 6 — Observability Check

**Question: Can you trace a message from producer to consumer?**

```bash
# Check for correlation IDs
grep -rn "correlationId\|traceId\|requestId\|x-correlation" src/ --include="*.ts" --include="*.java" | head -10

# Check for consumer lag monitoring
grep -rn "lag\|consumerLag\|kafka.consumer.fetch" . --include="*.yaml" --include="*.json" | head -10

# Check for structured logging in consumers
grep -rn "logger\.\|log\." src/ --include="*.ts" | grep -v "test\|spec" | head -10
```

**Observability checklist:**
- [ ] Correlation/trace ID propagated from event headers to logs
- [ ] Consumer lag monitored (Kafka: `records-lag-max` metric)
- [ ] Processing time logged per message
- [ ] Failed messages logged with full context (topic, partition, offset, error)
- [ ] Event schema version logged

## Step 7 — Generate Report

```markdown
## EDA Review Report

**Scope:** [files/services reviewed]
**Date:** [today]

---

### 1. Idempotency

**Status:** 🔴 / 🟡 / 🟢

| Consumer | Idempotent? | Issue |
|----------|-------------|-------|
| OrderEventHandler | ❌ No | Plain INSERT without deduplication check |
| ShipmentHandler | ✅ Yes | Upsert + processed-set in Redis |

**Fix required:**
[Code fix for non-idempotent consumers]

---

### 2. Ordering

**Status:** 🔴 / 🟡 / 🟢

[Findings]

---

### 3. Schema Evolution

**Status:** 🔴 / 🟡 / 🟢

[Findings + specific schema changes at risk]

---

### 4. DLQ Handling

**Status:** 🔴 / 🟡 / 🟢

[Findings + missing DLQ configuration or monitoring]

---

### 5. Observability

**Status:** 🔴 / 🟡 / 🟢

[Findings + missing correlation IDs or lag monitoring]

---

### Prioritized Actions

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Add idempotency check to OrderEventHandler | 2h |
| P0 | Configure DLQ for payment-events topic | 1h |
| P1 | Add DLQ alert (any message → PagerDuty) | 30min |
| P1 | Propagate correlationId through all event headers | 3h |
| P2 | Enable Schema Registry BACKWARD compatibility | 1h |
```

## Reference Skills

- `event-driven-patterns` — Kafka, EventBridge, pub/sub, CloudEvents, DLQ
- `cqrs-event-sourcing` — CQRS, Event Sourcing, Outbox Pattern, Saga
- `observability` — tracing, metrics, structured logging
