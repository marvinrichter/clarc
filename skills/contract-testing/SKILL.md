---
name: contract-testing
description: "Contract Testing: Consumer-Driven Contract Testing with Pact (REST, messaging, Pact Broker, can-i-deploy), OpenAPI contract testing with Prism mock server and dredd, schema compatibility (ajv, Protobuf wire rules, Avro + Schema Registry), and breaking change detection with oasdiff in CI."
---

# Contract Testing

Test API contracts between services to catch breaking changes before deployment.

## When to Activate

- Setting up Pact consumer-driven contract tests for REST or message-based APIs
- Validating OpenAPI specs with Prism mock server or dredd
- Checking schema compatibility (JSON Schema, Protobuf, Avro)
- Detecting breaking changes in CI with oasdiff
- Implementing `can-i-deploy` gates before deployment
- Establishing a safety net between two independently deployed microservices so either team can release without coordinating manually
- Adding a CI gate that blocks any pull request that introduces a field removal, rename, or type change to a public REST API
- Testing a Kafka event consumer against the exact message schema that the producer publishes, without spinning up the full event pipeline

---

## Consumer-Driven Contract Testing (Pact)

```
 CONSUMER SIDE                    PROVIDER SIDE
┌──────────────┐                 ┌──────────────────┐
│ Consumer Test│ ──Pact File──▶  │ Provider          │
│ (defines     │                 │ Verification Test │
│  expectations│ ◀──Result────── │ (runs against     │
│  on API)     │                 │  real service)    │
└──────────────┘                 └──────────────────┘
        │                                 ▲
        └──────────▶ Pact Broker ─────────┘
                   (stores pacts,
                    tracks versions)
```

### Consumer Test (TypeScript)

```typescript
// consumer.pact.spec.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { OrderClient } from './order-client';

const { like, eachLike, iso8601DateTime } = MatchersV3;

const provider = new PactV3({
  consumer: 'order-ui',
  provider: 'order-api',
  dir: './pacts',  // Generated pact file location
  port: 8080,
});

describe('Order API', () => {
  describe('GET /orders/:id', () => {
    it('returns order details', async () => {
      await provider
        .given('order 123 exists')  // Provider state
        .uponReceiving('a request for order 123')
        .withRequest({
          method: 'GET',
          path: '/orders/123',
          headers: { Authorization: like('Bearer token') },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            orderId: like('123'),
            status: like('PLACED'),
            items: eachLike({
              productId: like('prod-1'),
              quantity: like(2),
              price: like(9.99),
            }),
            createdAt: iso8601DateTime(),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new OrderClient(mockServer.url);
          const order = await client.getOrder('123');

          expect(order.orderId).toBe('123');
          expect(order.items).toHaveLength(1);
        });
    });

    it('returns 404 when order does not exist', async () => {
      await provider
        .given('order 999 does not exist')
        .uponReceiving('a request for non-existent order')
        .withRequest({ method: 'GET', path: '/orders/999' })
        .willRespondWith({
          status: 404,
          body: { error: like('Order not found') },
        })
        .executeTest(async (mockServer) => {
          const client = new OrderClient(mockServer.url);
          await expect(client.getOrder('999')).rejects.toThrow('Order not found');
        });
    });
  });
});
```

### Provider Verification (TypeScript/Node)

```typescript
// provider.pact.spec.ts
import { Verifier } from '@pact-foundation/pact';
import { app } from './app';

describe('Provider Verification', () => {
  it('validates consumer pacts', async () => {
    const server = app.listen(3001);

    const result = await new Verifier({
      provider: 'order-api',
      providerBaseUrl: 'http://localhost:3001',

      // Load pacts from Pact Broker
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: true,
      providerVersion: process.env.GIT_SHA,

      // State handlers — set up test data for each state
      stateHandlers: {
        'order 123 exists': async () => {
          await testDb.orders.create({ id: '123', status: 'PLACED', items: [...] });
        },
        'order 999 does not exist': async () => {
          await testDb.orders.delete({ where: { id: '999' } });
        },
      },
    }).verifyProvider();

    server.close();
  });
});
```

### Message Contract Testing (Kafka/SQS)

```typescript
// Consumer specifies what events it expects to receive
const messagePact = new MessageConsumerPact({
  consumer: 'shipment-service',
  provider: 'order-service',
  dir: './pacts',
});

describe('OrderPlaced Event', () => {
  it('can process an order placed event', async () => {
    await messagePact
      .given('an order was placed')
      .expectsToReceive('an OrderPlaced event')
      .withContent({
        type: 'OrderPlaced',
        orderId: like('order-123'),
        customerId: like('cust-456'),
        items: eachLike({ productId: like('prod-1'), quantity: like(2) }),
      })
      .withMetadata({ 'content-type': 'application/json' })
      .verify(async (message) => {
        const event = JSON.parse(message.contents as string) as OrderPlacedEvent;
        const result = await shipmentService.onOrderPlaced(event);
        expect(result.shipmentId).toBeDefined();
      });
  });
});
```

---

## Pact Broker + can-i-deploy

```yaml
# docker-compose.yml — local Pact Broker
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
      POSTGRES_DB: pact

  pact-broker:
    image: pactfoundation/pact-broker
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: "postgres://pact:pact@postgres/pact"
```

```bash
# Publish pact after consumer tests
npx pact-broker publish ./pacts \
  --broker-base-url $PACT_BROKER_URL \
  --broker-token $PACT_BROKER_TOKEN \
  --consumer-app-version $GIT_SHA \
  --branch main \
  --tag main

# can-i-deploy: check before deployment
npx pact-broker can-i-deploy \
  --pacticipant order-ui \
  --version $GIT_SHA \
  --to-environment production \
  --broker-base-url $PACT_BROKER_URL \
  --broker-token $PACT_BROKER_TOKEN
# Exits 0 if safe to deploy, 1 if not
```

```yaml
# .github/workflows/pact.yml
name: Contract Tests

on: [push, pull_request]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --testPathPattern=pact
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
      - name: Publish pacts
        run: npx pact-broker publish ./pacts --consumer-app-version $GITHUB_SHA

  can-i-deploy:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - run: npx pact-broker can-i-deploy --pacticipant order-ui --version $GITHUB_SHA --to-environment staging
```

---

## OpenAPI Contract Testing

### Prism — Mock Server from OpenAPI Spec

```bash
# Install
npm install -g @stoplight/prism-cli

# Start mock server from OpenAPI spec
prism mock ./api/openapi.yaml --port 4010

# Prism validates:
# - Request parameters match the spec
# - Response body matches the spec schema
# - Required headers are present

# Proxy to real server and validate responses
prism proxy ./api/openapi.yaml http://localhost:3000 --port 4010
# Every real response is validated against the spec
```

```typescript
// Consumer tests run against Prism mock — no real server needed
const client = new OrderClient('http://localhost:4010');

// Prism returns example values from the spec
const order = await client.getOrder('123');
// Prism validates the request matches spec and returns spec-compliant response
```

### dredd — Spec Smoke Tests

```bash
# Install
npm install -g dredd

# Run spec against real server
dredd ./api/openapi.yaml http://localhost:3000

# dredd calls every endpoint in the spec with example values
# and validates actual responses against the spec

# Configuration file
cat > dredd.yml << EOF
dry-run: false
hookfiles: ./dredd-hooks.js
language: nodejs
sandbox: false
server: npm start
server-wait: 5
endpoint: 'http://localhost:3000'
path:
  - ./api/openapi.yaml
reporter:
  - dot
  - junit
output:
  - ./test-results/dredd.xml
EOF
```

---

## Schema Compatibility

### JSON Schema with ajv

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);

const orderSchema = {
  type: 'object',
  required: ['orderId', 'status', 'items'],
  properties: {
    orderId: { type: 'string' },
    status: { type: 'string', enum: ['PLACED', 'SHIPPED', 'CANCELLED'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
          price: { type: 'number', minimum: 0 },
        },
      },
    },
  },
};

const validate = ajv.compile(orderSchema);

function validateOrder(data: unknown): void {
  if (!validate(data)) {
    throw new Error(
      `Schema validation failed: ${ajv.errorsText(validate.errors)}`
    );
  }
}
```

### Protobuf Wire Compatibility

```protobuf
// v1
message Order {
  string order_id = 1;
  string status = 2;
}

// v2 — SAFE changes:
message Order {
  string order_id = 1;     // Same field number — compatible
  string status = 2;       // Same field number — compatible
  string customer_id = 3;  // New field — old readers ignore it ✅
}

// v2 — BREAKING changes:
// - Renaming field 1 (wire encoding uses numbers, but tooling breaks)
// - Changing field 1 type from string to int
// - Reusing field number 2 for a different field (corrupts old data)
```

---

## Breaking Change Detection with oasdiff

```bash
# Install
brew install tufin/tufin/oasdiff
# or
go install github.com/tufin/oasdiff@latest

# Compare two OpenAPI specs
oasdiff breaking api/v1/openapi.yaml api/v2/openapi.yaml

# Output:
# [error] DELETE /api/orders/{id} - deleted endpoint
# [error] GET /api/orders: response property 'customerId' removed
# [warning] GET /api/orders: new required request header 'X-Request-ID'
```

```yaml
# .github/workflows/api-breaking.yml
name: API Breaking Change Detection

on:
  pull_request:
    paths:
      - 'api/**/*.yaml'

jobs:
  breaking-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install oasdiff
        run: go install github.com/tufin/oasdiff@latest

      - name: Check for breaking changes
        run: |
          git show HEAD~1:api/openapi.yaml > /tmp/old-spec.yaml
          oasdiff breaking /tmp/old-spec.yaml api/openapi.yaml
          # Exits non-zero if breaking changes found
```

---

## Testing Pyramid for Contracts

```
          ┌─────────────────┐
          │   NEVER         │ E2E tests for contract validation
          │   (too fragile) │ (service combinations in staging)
          └─────────────────┘
        ┌──────────────────────┐
        │   INTEGRATION         │ Provider verification tests
        │   (real service)      │ (verify pact against real impl)
        └──────────────────────┘
      ┌──────────────────────────┐
      │   UNIT                    │ Pact consumer tests
      │   (no real service)       │ (fast, isolated, in CI)
      └──────────────────────────┘
```

---

## Reference

- `api-contract` — Contract-First API design, OpenAPI spec generation
- `api-design` — REST API design patterns
- `event-driven-patterns` — Kafka message contracts
