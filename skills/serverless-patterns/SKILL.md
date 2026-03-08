---
name: serverless-patterns
description: "Serverless patterns: cold start optimization (Provisioned Concurrency, SnapStart, keep-warm), event source mapping (S3/SQS/DynamoDB Streams/EventBridge), AWS Step Functions, Lambda Powertools (logging/metrics/tracing), idempotency, cost model, and observability with X-Ray."
---

# Serverless Patterns

Production patterns for AWS Lambda and serverless architectures — cold starts, event routing, orchestration, and observability.

## When to Activate

- Diagnosing Lambda cold start latency
- Designing event-driven workflows (S3 → Lambda, SQS batch processing)
- Building Step Functions state machines
- Adding structured logging/tracing with Lambda Powertools
- Calculating serverless cost vs. container cost
- Implementing idempotency for at-least-once delivery

---

## Cold Start Deep Dive

### What Causes Cold Starts

```
Cold Start = Container Boot + Runtime Init + Function Init
             ~100-500ms    + ~50-200ms    + your code

Warm Start = (container already running)
             ~1-10ms (just your function code)
```

**Cold Start by Runtime (approximate):**

| Runtime | Cold Start |
|---------|-----------|
| Rust (custom runtime) | ~1ms |
| Go | ~5ms |
| Node.js 20 | ~80–150ms |
| Python 3.12 | ~100–300ms |
| Java 21 (without SnapStart) | ~1000–3000ms |
| Java 21 (with SnapStart) | ~100–200ms |

### Mitigation Strategies

**1. Provisioned Concurrency (eliminates cold starts)**

```yaml
# serverless.yml / SAM template
ProvisionedConcurrencyConfig:
  ProvisionedConcurrentExecutions: 5  # Always warm instances

# Schedule scaling (cost optimization)
# Scale up before peak, down after
aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:my-function:prod \
  --scalable-dimension lambda:function:ProvisionedConcurrency

aws application-autoscaling put-scheduled-action \
  --service-namespace lambda \
  --resource-id function:my-function:prod \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --scheduled-action-name scale-up-morning \
  --schedule "cron(0 7 * * ? *)" \
  --scalable-target-action MinCapacity=10,MaxCapacity=10
```

**2. SnapStart (Java only — Firecracker MicroVM snapshot)**

```yaml
# SAM template
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    SnapStart:
      ApplyOn: PublishedVersions
    AutoPublishAlias: prod
```

**3. Keep-Warm Pings (free mitigation)**

```typescript
// handler — detect and discard warm pings
export const handler = async (event: any) => {
  if (event.source === 'keep-warm') {
    return { statusCode: 200 };
  }
  return handleRealRequest(event);
};
```

```yaml
# EventBridge rule — ping every 5 minutes
KeepWarmRule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: rate(5 minutes)
    Targets:
      - Id: MyLambdaTarget
        Arn: !GetAtt MyFunction.Arn
        Input: '{"source": "keep-warm"}'
```

**4. Minimize Package Size**

```bash
# Check your Lambda deployment size
aws lambda get-function --function-name my-function \
  --query 'Configuration.CodeSize'

# Reduce: only bundle what you need
# Node.js: esbuild with tree-shaking
esbuild src/handler.ts --bundle --minify --target=node20 \
  --platform=node --outfile=dist/handler.js

# Python: pip install --no-deps, use Lambda Layers for shared deps
```

**5. Move Initialization Outside Handler**

```typescript
// WRONG: DB connection created on every invocation
export const handler = async (event) => {
  const db = new Database(process.env.DB_URL);  // ❌ Cold start every time
  return db.query('SELECT ...');
};

// CORRECT: Initialize once, reuse across warm invocations
const db = new Database(process.env.DB_URL);  // ✅ Runs once per container

export const handler = async (event) => {
  return db.query('SELECT ...');
};
```

---

## Event Source Mapping

### S3 → Lambda

```typescript
// S3 event structure
interface S3Event {
  Records: Array<{
    s3: {
      bucket: { name: string };
      object: { key: string; size: number; eTag: string };
    };
    eventName: string;  // 'ObjectCreated:Put', 'ObjectRemoved:Delete'
  }>;
}

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const { bucket, object } = record.s3;
    const key = decodeURIComponent(object.key.replace(/\+/g, ' '));

    const file = await s3.getObject({
      Bucket: bucket.name,
      Key: key,
    }).promise();

    await processFile(file.Body as Buffer, key);
  }
};
```

### SQS → Lambda (Batch Processing)

```typescript
import { SQSEvent, SQSBatchResponse } from 'aws-lambda';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: SQSBatchResponse['batchItemFailures'] = [];

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const message = JSON.parse(record.body);
        await processMessage(message);
      } catch (error) {
        // Partial batch failure — only failed items go back to queue
        failures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures: failures };
};
```

```yaml
# SAM/CDK — SQS trigger configuration
MyFunction:
  Events:
    SQSQueue:
      Type: SQS
      Properties:
        Queue: !GetAtt MyQueue.Arn
        BatchSize: 10
        FunctionResponseTypes:
          - ReportBatchItemFailures  # Required for partial failure handling
        MaximumBatchingWindowInSeconds: 5
```

### DynamoDB Streams → Lambda (CDC)

```typescript
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    const eventType = record.eventName;  // 'INSERT' | 'MODIFY' | 'REMOVE'

    if (eventType === 'INSERT' || eventType === 'MODIFY') {
      const newItem = unmarshall(record.dynamodb?.NewImage ?? {});
      await syncToSearchIndex(newItem);
    }

    if (eventType === 'REMOVE') {
      const oldItem = unmarshall(record.dynamodb?.OldImage ?? {});
      await removeFromSearchIndex(oldItem.id);
    }
  }
};
```

### EventBridge → Lambda

```typescript
// EventBridge event
interface OrderPlacedEvent {
  source: string;         // 'myapp.orders'
  'detail-type': string;  // 'Order Placed'
  detail: {
    orderId: string;
    customerId: string;
    amount: number;
  };
}

export const handler = async (event: EventBridge.EventBridgeEvent<'Order Placed', OrderDetail>) => {
  const { orderId, customerId, amount } = event.detail;
  await processOrder({ orderId, customerId, amount });
};
```

```yaml
# EventBridge rule — content-based filtering
OrderRule:
  Type: AWS::Events::Rule
  Properties:
    EventPattern:
      source: ['myapp.orders']
      detail-type: ['Order Placed']
      detail:
        amount: [{ numeric: ['>', 100] }]  # Only large orders
    Targets:
      - Id: ProcessLargeOrder
        Arn: !GetAtt ProcessOrderFunction.Arn
```

---

## AWS Step Functions

### State Machine Types

| Type | Duration | Pricing | Use Case |
|------|----------|---------|---------|
| Standard | Up to 1 year | Per state transition | Long-running workflows, auditing |
| Express (Async) | Up to 5 minutes | Per invocation + duration | High-volume events |
| Express (Sync) | Up to 5 minutes | Per invocation + duration | Request-response |

### State Types

```json
{
  "Comment": "Order processing workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:ValidateOrder",
      "Next": "ChargePayment",
      "Catch": [{
        "ErrorEquals": ["ValidationError"],
        "Next": "HandleValidationError"
      }],
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2.0
      }]
    },

    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "ChargePayment",
        "Payload": {
          "orderId.$": "$.orderId",
          "taskToken.$": "$$.Task.Token"
        }
      },
      "HeartbeatSeconds": 300,
      "Next": "FulfillOrder"
    },

    "FulfillOrder": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "ShipItems",
          "States": {
            "ShipItems": { "Type": "Task", "Resource": "...", "End": true }
          }
        },
        {
          "StartAt": "SendConfirmation",
          "States": {
            "SendConfirmation": { "Type": "Task", "Resource": "...", "End": true }
          }
        }
      ],
      "Next": "UpdateInventory"
    },

    "WaitForRestock": {
      "Type": "Wait",
      "Seconds": 86400,
      "Next": "CheckInventory"
    },

    "OrderComplete": {
      "Type": "Succeed"
    },

    "HandleValidationError": {
      "Type": "Fail",
      "Error": "ValidationFailed",
      "Cause": "Order validation failed"
    }
  }
}
```

### Map State (Fan-Out)

```json
{
  "ProcessItems": {
    "Type": "Map",
    "ItemsPath": "$.items",
    "MaxConcurrency": 10,
    "Iterator": {
      "StartAt": "ProcessItem",
      "States": {
        "ProcessItem": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...:function:ProcessItem",
          "End": true
        }
      }
    },
    "Next": "Aggregate"
  }
}
```

---

## Lambda Powertools

Unified library for structured logging, metrics, and tracing:

```bash
npm install @aws-lambda-powertools/logger @aws-lambda-powertools/metrics @aws-lambda-powertools/tracer
```

### Logger

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'order-service',
  logLevel: 'INFO',
});

export const handler = async (event: any) => {
  // Automatically adds requestId, function name, cold start flag
  logger.info('Processing order', { orderId: event.orderId });

  try {
    const result = await processOrder(event.orderId);
    logger.info('Order processed', { orderId: event.orderId, result });
    return result;
  } catch (error) {
    logger.error('Order processing failed', { error, orderId: event.orderId });
    throw error;
  }
};
```

### Metrics

```typescript
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const metrics = new Metrics({ namespace: 'OrderService', serviceName: 'order-processor' });

export const handler = async (event: any) => {
  metrics.addMetric('OrdersReceived', MetricUnit.Count, 1);

  const start = Date.now();
  await processOrder(event);
  metrics.addMetric('ProcessingTime', MetricUnit.Milliseconds, Date.now() - start);

  metrics.addMetric('OrdersSucceeded', MetricUnit.Count, 1);
  metrics.publishStoredMetrics();  // Flush to CloudWatch
};
```

### Tracer (X-Ray)

```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'order-service' });

export const handler = async (event: any) => {
  const segment = tracer.getSegment();
  const subsegment = segment?.addNewSubsegment('processOrder');

  try {
    const result = await processOrder(event);
    tracer.putAnnotation('orderId', event.orderId);
    tracer.putMetadata('result', result);
    return result;
  } catch (error) {
    subsegment?.addError(error as Error);
    throw error;
  } finally {
    subsegment?.close();
  }
};
```

---

## Idempotency

Lambda can be invoked multiple times for the same event (at-least-once delivery). Always design for idempotency.

```typescript
import { makeHandlerIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: 'IdempotencyTable',
});

// Wrap handler — duplicate events return cached result
export const handler = makeHandlerIdempotent(
  async (event: OrderEvent) => {
    await chargePayment(event.paymentId, event.amount);
    await createOrder(event);
    return { orderId: event.orderId, status: 'created' };
  },
  { persistenceStore }
);
```

```yaml
# Required DynamoDB table
IdempotencyTable:
  Type: AWS::DynamoDB::Table
  Properties:
    AttributeDefinitions:
      - AttributeName: id
        AttributeType: S
    KeySchema:
      - AttributeName: id
        KeyType: HASH
    TimeToLiveSpecification:
      AttributeName: expiration
      Enabled: true
    BillingMode: PAY_PER_REQUEST
```

---

## Cost Model

**Lambda pricing (us-east-1):**
- Requests: $0.20 per 1M invocations
- Duration: $0.0000166667 per GB-second
- Provisioned Concurrency: $0.0000041667 per GB-second (always-on)

**Break-Even: Lambda vs. Container**

```
Lambda cost/month = requests × $0.0000002 + (avg_duration_s × memory_GB × requests × $0.0000166667)

Example: 10M requests/month, 200ms avg, 512MB
= 10M × $0.0000002 + (0.2 × 0.5 × 10M × $0.0000166667)
= $2 + $16.67
= ~$18.67/month

ECS Fargate (0.25 vCPU, 0.5GB) = ~$12/month (continuous)

Rule of thumb: Lambda wins below ~5M requests/month or spiky traffic.
Containers win with constant high-volume predictable load.
```

---

## Observability

```bash
# CloudWatch Insights — Lambda performance
fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed, @initDuration
| filter @type = "REPORT"
| stats avg(@duration), max(@duration), avg(@initDuration) by bin(5m)

# Cold starts only
fields @timestamp, @initDuration
| filter @type = "REPORT" and ispresent(@initDuration)
| stats count(), avg(@initDuration) by bin(1h)

# Errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

## Reference

- `edge-patterns` — Cloudflare Workers, Vercel Edge Middleware (CPU-constrained, no cold starts)
- `observability` — General observability patterns (OpenTelemetry, Grafana)
- `chaos-engineering` — Testing Lambda failure modes (throttling, DLQ exhaustion)
