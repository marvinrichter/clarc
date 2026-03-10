---
name: message-queue-patterns
description: "Async message queue and event streaming patterns — AWS SQS/SNS, Kafka, RabbitMQ. Covers producer/consumer design, idempotency, dead-letter queues, fan-out, ordering guarantees, and backpressure. The reference for service-to-service async communication."
---

# Message Queue Patterns

Async service-to-service communication. Not the same as WebSockets (client push) or BullMQ (in-process jobs).

## When to Activate

- Decoupling services that don't need synchronous responses
- Building event-driven architectures or CQRS pipelines
- Handling traffic spikes with backpressure (queue absorbs bursts)
- Coordinating cross-service workflows without direct coupling
- Choosing between SQS, Kafka, RabbitMQ, or BullMQ
- Implementing idempotent consumers to handle at-least-once delivery without corrupting state on duplicate messages
- Designing dead-letter queues and replay strategies to recover from poison-pill messages without blocking the main queue

---

## Technology Decision Tree

```
Need guaranteed ordering within a partition?
├── YES → Kafka (or Kinesis)
└── NO
    ├── Need fan-out to multiple consumers?
    │   ├── YES → SNS (fan-out) → SQS (per-consumer queue)
    │   └── NO
    │       ├── Simple work queue, AWS stack?
    │       │   └── YES → SQS Standard
    │       ├── Complex routing, exchange patterns?
    │       │   └── YES → RabbitMQ
    │       └── In-process jobs (same Node.js process)?
    │           └── YES → BullMQ (see realtime-patterns)
```

| System | Ordering | Fan-out | Retention | Throughput | Best for |
|---|---|---|---|---|---|
| SQS Standard | No | No (use SNS) | 14 days | High | Work queues, decoupling |
| SQS FIFO | Per message group | No | 14 days | 3K/s | Ordered processing |
| SNS | No | Yes (up to 12.5M/s) | None (fire & forget) | Very High | Broadcast events |
| Kafka | Per partition | Yes (consumer groups) | Configurable (∞) | Very High | Event streaming, audit log |
| RabbitMQ | Per queue | Via exchanges | Until consumed | High | Complex routing, priority queues |

---

## SQS Patterns (AWS)

### Basic Producer — TypeScript

```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION });

interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  amount: number;
}

async function publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.ORDER_QUEUE_URL,
    MessageBody: JSON.stringify({
      type: 'order.created',
      version: '1',
      timestamp: new Date().toISOString(),
      data: event,
    }),
    // FIFO queues: deduplication within 5-minute window
    // MessageDeduplicationId: event.orderId,
    // MessageGroupId: event.userId,
  }));
}
```

### Basic Consumer with Idempotency

```typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION });

async function processOrders(): Promise<void> {
  while (true) {
    const { Messages } = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: process.env.ORDER_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,      // long polling — reduces empty receives
      VisibilityTimeout: 30,    // seconds to process before re-queue
    }));

    if (!Messages?.length) continue;

    await Promise.allSettled(
      Messages.map(msg => processMessage(msg))
    );
  }
}

async function processMessage(msg: SQSMessage): Promise<void> {
  const body = JSON.parse(msg.Body!);

  // IDEMPOTENCY: check if already processed
  const alreadyProcessed = await db.query(
    'SELECT 1 FROM processed_messages WHERE message_id = $1',
    [msg.MessageId]
  );
  if (alreadyProcessed.rows.length > 0) {
    // Still delete to prevent redelivery
    await deleteMessage(msg.ReceiptHandle!);
    return;
  }

  // Process in transaction — mark processed + apply side effect atomically
  await db.transaction(async (trx) => {
    await handleOrderCreated(body.data, trx);
    await trx.query(
      'INSERT INTO processed_messages (message_id, processed_at) VALUES ($1, NOW())',
      [msg.MessageId]
    );
  });

  // Only delete after successful processing
  await deleteMessage(msg.ReceiptHandle!);
}

async function deleteMessage(receiptHandle: string): Promise<void> {
  await sqs.send(new DeleteMessageCommand({
    QueueUrl: process.env.ORDER_QUEUE_URL,
    ReceiptHandle: receiptHandle,
  }));
}
```

### Dead-Letter Queue (DLQ) Setup

```typescript
// terraform/sqs.tf equivalent in CDK
// In CloudFormation/Terraform: set maxReceiveCount + DLQ on source queue

// The pattern:
// 1. Set maxReceiveCount=3 on source queue → after 3 failures, SQS moves to DLQ
// 2. DLQ has separate consumer for inspection + alerting
// 3. Fix code → replay from DLQ to source queue

// Replay DLQ to source (manual recovery):
async function replayDLQ(): Promise<void> {
  const dlqUrl = process.env.ORDER_DLQ_URL!;
  const sourceUrl = process.env.ORDER_QUEUE_URL!;

  let count = 0;
  while (true) {
    const { Messages } = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: dlqUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
    }));
    if (!Messages?.length) break;

    for (const msg of Messages) {
      await sqs.send(new SendMessageCommand({
        QueueUrl: sourceUrl,
        MessageBody: msg.Body!,
      }));
      await deleteMessage(msg.ReceiptHandle!); // from DLQ
      count++;
    }
  }
  console.log(`Replayed ${count} messages from DLQ`);
}
```

---

## SNS Fan-out Pattern

```
                     ┌──────────────┐
                     │     SNS      │   order.created topic
                     └──────┬───────┘
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        SQS Queue      SQS Queue    SQS Queue
        (billing)    (inventory)   (analytics)
```

```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({ region: process.env.AWS_REGION });

async function publishEvent(topicArn: string, event: unknown): Promise<void> {
  await sns.send(new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(event),
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: 'order.created',
      },
    },
  }));
}
```

**Terraform (SNS → SQS subscription):**
```hcl
resource "aws_sns_topic_subscription" "billing_queue" {
  topic_arn            = aws_sns_topic.orders.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.billing.arn
  raw_message_delivery = true  # skip SNS envelope wrapping
}
```

---

## Kafka Patterns

### Producer — Node.js (kafkajs)

```typescript
import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: process.env.KAFKA_BROKERS!.split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!,
  },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});

await producer.connect();

// Publish with key = partition key (same key → same partition → ordered)
await producer.send({
  topic: 'orders',
  messages: [{
    key: event.userId,          // all events for same user go to same partition
    value: JSON.stringify(event),
    headers: {
      eventType: 'order.created',
      schemaVersion: '1',
    },
  }],
});
```

### Consumer Group

```typescript
const consumer = kafka.consumer({ groupId: 'billing-service' });

await consumer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: false });

await consumer.run({
  // eachBatchAutoResolve: false → manual offset commit for exactly-once semantics
  eachMessage: async ({ topic, partition, message, heartbeat }) => {
    const event = JSON.parse(message.value!.toString());

    try {
      await processBillingEvent(event);
      // Offset commits automatically on success (commitOffsetsIfNecessary)
    } catch (err) {
      // Don't throw for poison pill messages → move to DLT manually
      if (isPoisonPill(err)) {
        await sendToDeadLetterTopic(topic, message);
        return;
      }
      throw err; // retriable error → consumer will retry
    }

    await heartbeat(); // prevent session timeout for slow processing
  },
});
```

### Kafka Topic Design Rules

```
✅ One topic per event type:  orders.created, orders.cancelled, payments.completed
✅ Partition by entity ID:    key = orderId or userId (keeps related events ordered)
✅ Retention policy set:      production: 7 days min, audit: 90 days
✅ Replication factor: 3      in production (tolerates 2 broker failures)
❌ One giant topic for all    events — loses ordering semantics
❌ Partition by timestamp      — hot partition, no ordering benefit
❌ No key (random partition)  — events for same entity arrive out of order
```

---

## RabbitMQ Patterns

### Direct Exchange (point-to-point)

```typescript
import amqplib from 'amqplib';

const conn = await amqplib.connect(process.env.RABBITMQ_URL!);
const ch = await conn.createChannel();

// Declare exchange + queue (idempotent)
await ch.assertExchange('orders', 'direct', { durable: true });
await ch.assertQueue('billing-queue', { durable: true });
await ch.bindQueue('billing-queue', 'orders', 'order.created');

// Producer
await ch.publish(
  'orders',
  'order.created',
  Buffer.from(JSON.stringify(event)),
  { persistent: true, contentType: 'application/json' }
);

// Consumer
await ch.prefetch(10); // backpressure: max 10 unacked messages
await ch.consume('billing-queue', async (msg) => {
  if (!msg) return;
  try {
    await processBillingEvent(JSON.parse(msg.content.toString()));
    ch.ack(msg);
  } catch {
    // nack + requeue=false → goes to DLX if configured
    ch.nack(msg, false, false);
  }
});
```

### Topic Exchange (pattern routing)

```typescript
// Bind with wildcard: '#' = zero or more words, '*' = exactly one word
await ch.assertExchange('events', 'topic', { durable: true });
await ch.bindQueue('order-queue', 'events', 'order.#');      // all order events
await ch.bindQueue('payment-queue', 'events', '*.completed'); // any completed event
```

---

## Universal Patterns

### Envelope Schema

All messages should follow the same envelope regardless of broker:

```typescript
interface MessageEnvelope<T> {
  id: string;           // UUID — for idempotency key
  type: string;         // 'order.created' — dot-separated, noun.verb
  version: '1';         // schema version — increment on breaking changes
  timestamp: string;    // ISO 8601
  source: string;       // 'order-service'
  correlationId?: string; // trace across services
  data: T;
}
```

### Idempotency Checklist

Every consumer MUST be idempotent. At-least-once delivery means duplicates will arrive:

```
✅ Check processed_messages table before side effects
✅ Use upsert (INSERT ... ON CONFLICT DO NOTHING) instead of INSERT
✅ Mark processed atomically with the side effect (same DB transaction)
✅ Use message.id (not content hash) as idempotency key
✅ Design handlers to be safe to call twice with same input
❌ Fire external API calls without idempotency key header
❌ Increment counters directly (use SET instead of +1)
```

### Backpressure

```typescript
// SQS: control concurrency via MaxNumberOfMessages + processing cap
const CONCURRENCY = 10;
const semaphore = new Semaphore(CONCURRENCY);

await Promise.all(messages.map(async (msg) => {
  await semaphore.acquire();
  try {
    await processMessage(msg);
  } finally {
    semaphore.release();
  }
}));

// RabbitMQ: ch.prefetch(N) — broker won't send more than N unacked
// Kafka: pause/resume consumer per partition when downstream is slow
```

### Poison Pill / Dead Letter

Messages that consistently fail should never block the queue. Always configure:

| Broker | Mechanism | Config |
|---|---|---|
| SQS | DLQ | `maxReceiveCount` on source queue |
| Kafka | Dead Letter Topic | Manual: send to `{topic}.DLT` on N failures |
| RabbitMQ | Dead Letter Exchange | `x-dead-letter-exchange` queue argument |

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| No idempotency | Duplicate messages corrupt state | processed_messages table + upserts |
| Deleting message before processing | Message lost on crash | Delete only after successful processing |
| No DLQ/DLT | Poison pills block queue forever | Always configure DLQ with alert |
| Synchronous calls inside consumer | Cascading failures, timeouts | Queue the side effect, don't call synchronously |
| Huge message bodies | Memory pressure, slow serialization | Store payload in S3/DB, pass reference URL |
| One partition for all events | No parallelism | Partition by entity ID |
| Sharing consumer group across env | Dev consumes prod messages | Always namespace by environment |
| Missing schema versioning | Breaking changes break consumers | Always include `version` in envelope |
