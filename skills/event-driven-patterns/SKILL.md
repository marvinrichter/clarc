---
name: event-driven-patterns
description: "Event-Driven Architecture: Kafka deep-dive (partitioning, consumer groups, exactly-once semantics, Schema Registry, DLQ, compacted topics), AWS EventBridge (content filtering, cross-account, archive/replay), Pub/Sub patterns (CloudEvents standard, fan-out, event versioning), and at-least-once delivery with idempotency."
---

# Event-Driven Patterns

Deep patterns for production event-driven systems.

## When to Activate

- Designing Kafka producers, consumers, or consumer groups
- Implementing exactly-once semantics or idempotent consumers
- Using Schema Registry with Avro/Protobuf/JSON Schema
- Setting up AWS EventBridge routing and filtering
- Implementing fan-out, CloudEvents envelope, or event versioning
- Adding DLQ handling for failed message processing

---

## Kafka Deep-Dive

### Partitioning Strategy

```
Topic: order-events (6 partitions)
        │
        ├── Partition 0: orders for customer A
        ├── Partition 1: orders for customer B
        ├── Partition 2: orders for customer C
        └── ...

Ordering guarantee: ONLY within a single partition.
Cross-partition ordering: NOT guaranteed.
```

```java
// Producer: choose partition key carefully
ProducerRecord<String, OrderEvent> record = new ProducerRecord<>(
    "order-events",
    order.getCustomerId(),  // Partition key — all orders for same customer → same partition
    orderEvent
);

// If ordering within a category matters, use a composite key:
String partitionKey = order.getRegion() + ":" + order.getCustomerId();
```

**Partition key strategies:**

| Strategy | Use When | Tradeoff |
|----------|----------|----------|
| Customer/User ID | Per-user ordering needed | Hot partitions if skewed |
| Round-robin (null key) | Max throughput, no ordering | No ordering guarantee |
| Region/Tenant | Geographic routing | May limit parallelism |
| Event type | Consumer specialization | All events of type go to one partition |

### Consumer Groups and Rebalancing

```java
// Consumer configuration — critical settings
Properties props = new Properties();
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-processor-v2");
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);  // Manual commit!

// Heartbeat tuning — reduce rebalances
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000);
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);  // 5 min for slow processing

KafkaConsumer<String, OrderEvent> consumer = new KafkaConsumer<>(props);
consumer.subscribe(List.of("order-events"));

while (true) {
    ConsumerRecords<String, OrderEvent> records = consumer.poll(Duration.ofMillis(100));

    for (ConsumerRecord<String, OrderEvent> record : records) {
        processOrder(record.value());
    }

    // Commit AFTER processing (at-least-once semantics)
    consumer.commitSync();
}
```

**Rebalancing causes:**
- Consumer joins or leaves the group
- Consumer crashes (heartbeat timeout)
- `max.poll.interval.ms` exceeded (processing too slow)
- Topic partition count changes

### Exactly-Once Semantics

```java
// Producer: enable idempotent writes + transactions
Properties producerProps = new Properties();
producerProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
producerProps.put(ProducerConfig.ACKS_CONFIG, "all");
producerProps.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
producerProps.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-processor-txn-1");

KafkaProducer<String, Event> producer = new KafkaProducer<>(producerProps);
producer.initTransactions();

// Consume → Process → Produce in atomic transaction
producer.beginTransaction();
try {
    for (ConsumerRecord<String, OrderEvent> record : records) {
        ShipmentEvent shipment = processOrder(record.value());
        producer.send(new ProducerRecord<>("shipment-events", record.key(), shipment));
    }

    // Commit consumer offsets AS PART of the transaction
    producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
    // Re-process from last committed offset
}
```

### Schema Registry

```java
// Avro producer with Schema Registry
Properties props = new Properties();
props.put("schema.registry.url", "http://schema-registry:8081");
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
props.put("auto.register.schemas", false);  // False in production — use CI to register

// Compatibility modes (set per-subject in Schema Registry):
// BACKWARD — new schema can read old data (safest for most cases)
// FORWARD  — old schema can read new data
// FULL     — both backward and forward
// NONE     — no compatibility check

// Adding a field: set default → BACKWARD compatible
// Renaming a field: NOT compatible (add new field + deprecate old)
// Removing a required field: NOT backward compatible
```

### Dead Letter Queue (DLQ)

```java
// Route failed messages to DLQ after max retries
public class DlqErrorHandler implements ConsumerRecordRecoverer {
    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final String dlqTopic;

    @Override
    public void accept(ConsumerRecord<?, ?> record, Exception ex) {
        ProducerRecord<String, byte[]> dlqRecord = new ProducerRecord<>(
            dlqTopic,
            (String) record.key(),
            (byte[]) record.value()
        );

        // Preserve context in headers
        dlqRecord.headers()
            .add("x-original-topic", record.topic().getBytes())
            .add("x-original-partition", String.valueOf(record.partition()).getBytes())
            .add("x-original-offset", String.valueOf(record.offset()).getBytes())
            .add("x-error-message", ex.getMessage().getBytes())
            .add("x-failed-at", Instant.now().toString().getBytes());

        kafkaTemplate.send(dlqRecord);
        log.error("Message sent to DLQ: topic={} partition={} offset={}",
            record.topic(), record.partition(), record.offset(), ex);
    }
}

// Consumer lag is the most important Kafka operational metric
// Monitor: consumer_lag > threshold → alert → scale consumers
```

### Compacted Topics for Event Sourcing

```
Compacted topic: latest value per key is retained (old values for same key are deleted)
Regular topic:   all messages retained per retention.ms

Use compacted topics for:
- User profile snapshots (latest profile per user)
- Configuration state (latest config per key)
- Materialized views (latest aggregate per entity)
```

---

## AWS EventBridge

### Event Pattern Matching (Content-Based Filtering)

```json
// Only route events matching specific criteria
{
  "source": ["com.myapp.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {
    "amount": [{ "numeric": [">=", 1000] }],
    "region": ["EU", "APAC"],
    "customer": {
      "tier": ["premium", "enterprise"]
    }
  }
}
```

### Cross-Account Event Bus

```yaml
# Sending account: permit receiving account
Resources:
  EventBusSendPermission:
    Type: AWS::Events::EventBusPolicy
    Properties:
      EventBusName: !Ref EventBus
      StatementId: AllowSharedAccount
      Action: events:PutEvents
      Principal: "123456789012"  # Receiving account ID

# Receiving account: create rule targeting event bus in sending account
Resources:
  CrossAccountRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref ReceivingEventBus
      EventPattern:
        source:
          - com.myapp.orders
      Targets:
        - Arn: arn:aws:events:us-east-1:123456789012:event-bus/main
          Id: SendToSendingAccount
          RoleArn: !GetAtt CrossAccountRole.Arn
```

### Archive and Replay

```bash
# Create archive
aws events create-archive \
  --archive-name order-events-archive \
  --event-source-arn arn:aws:events:us-east-1:123:event-bus/main \
  --event-pattern '{"source":["com.myapp.orders"]}' \
  --retention-days 90

# Replay events (e.g., after bug fix)
aws events start-replay \
  --replay-name replay-orders-2026-03 \
  --source-arn arn:aws:events:us-east-1:123:archive/order-events-archive \
  --event-start-time 2026-03-01T00:00:00Z \
  --event-end-time 2026-03-08T00:00:00Z \
  --destination '{"Arn":"arn:aws:events:us-east-1:123:event-bus/main"}'
```

---

## Pub/Sub Patterns

### CloudEvents Standard Envelope

```json
{
  "specversion": "1.0",
  "type": "com.myapp.order.placed",
  "source": "/myapp/orders",
  "id": "A234-1234-1234",
  "time": "2026-03-08T12:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "amount": 99.99
  }
}
```

```typescript
// TypeScript CloudEvents SDK
import { CloudEvent, HTTP } from 'cloudevents';

const event = new CloudEvent({
  type: 'com.myapp.order.placed',
  source: '/myapp/orders',
  data: { orderId: 'order-123', customerId: 'cust-456', amount: 99.99 },
});

const message = HTTP.binary(event);  // Binary encoding (more efficient)
// message.headers + message.body ready for HTTP transport
```

### Fan-Out Pattern

```
         Order Placed Event
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
  Inventory  Payment    Analytics
  Service    Service    Service
(reserve)  (charge)   (track)
```

```typescript
// All consumers receive the same event independently
// Each consumer maintains its own offset/cursor — failure in one doesn't affect others
const consumers = [inventoryService, paymentService, analyticsService];

// AWS SNS → SQS fan-out
// Kafka: multiple consumer groups on same topic
// EventBridge: multiple rules matching same event
```

### Event Versioning

```typescript
// ADDITIVE changes — backward compatible
interface OrderPlacedV1 {
  orderId: string;
  customerId: string;
  amount: number;
}

interface OrderPlacedV2 {
  orderId: string;
  customerId: string;
  amount: number;
  currency?: string;    // New optional field — additive ✅
  metadata?: object;   // New optional field — additive ✅
}

// BREAKING changes — require new event type or explicit versioning
// - Renaming fields
// - Changing field types
// - Removing required fields

// Version in event type string
const eventType = 'com.myapp.order.placed.v2';

// Or version in schema registry (Avro/Protobuf)
// Use BACKWARD compatibility: new consumers can read old events
```

### At-Least-Once Delivery + Idempotency

```typescript
// Every consumer MUST be idempotent — the same event may arrive multiple times
async function processOrderEvent(event: OrderPlacedEvent): Promise<void> {
  const idempotencyKey = `order-placed:${event.orderId}`;

  // Check if already processed
  const processed = await redis.exists(idempotencyKey);
  if (processed) {
    logger.info('Duplicate event — skipping', { orderId: event.orderId });
    return;
  }

  // Process in a transaction
  await db.transaction(async (tx) => {
    await tx.createOrder(event);
    await tx.reserveInventory(event.items);
  });

  // Mark as processed (TTL > message retention period)
  await redis.setEx(idempotencyKey, 7 * 24 * 3600, '1');
}
```

---

## Key Operational Metrics

| Metric | Tool | Alert When |
|--------|------|------------|
| Consumer lag | Kafka JMX / Burrow | > 10k messages |
| DLQ message count | CloudWatch / Datadog | > 0 (any failure) |
| Event processing latency | Custom metric | p99 > SLO |
| Schema compatibility failures | Schema Registry API | Any failure in CI |
| EventBridge failed invocations | CloudWatch | > 0 |

---

## Reference

- `cqrs-event-sourcing` — CQRS, Event Sourcing, Outbox Pattern, Saga
- `message-queue-patterns` — SQS, RabbitMQ, and basic async patterns
- `realtime-patterns` — WebSockets, SSE, and real-time delivery
