---
name: serverless-patterns-advanced
description: Advanced Serverless patterns — Lambda idempotency (Lambda Powertools + DynamoDB persistence layer), Lambda cost model (pricing formula, break-even vs containers), and CloudWatch Insights observability queries for cold starts, duration, and errors.
---

# Serverless Patterns — Advanced

This skill extends `serverless-patterns` with idempotency, cost modeling, and observability. Load `serverless-patterns` first.

## When to Activate

- Lambda receives duplicate events and needs idempotency (at-least-once delivery)
- Calculating whether Lambda or containers are more cost-effective at current request volume
- Writing CloudWatch Insights queries for cold start analysis, duration percentiles, or error rates

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

- `serverless-patterns` — cold starts, Step Functions, Lambda Powertools (Logger, Metrics, Tracer)
- `edge-patterns` — Cloudflare Workers, Vercel Edge Middleware
- `observability` — OpenTelemetry, Grafana, distributed tracing
- `chaos-engineering` — Testing Lambda failure modes (throttling, DLQ exhaustion)
