---
description: Set up consumer-driven contract testing with Pact — write consumer pact, configure Pact Broker, set up provider verification, and add can-i-deploy gate to CI
---

# Contract Test Command

Set up contract testing for: $ARGUMENTS

## Your Task

Guide the full contract testing setup: consumer pact → Pact Broker → provider verification → CI gate.

## Step 1 — Detect Project Setup

```bash
# Check existing API client code
find src/ -name "*client*" -o -name "*api*" -o -name "*service*" | grep -v test | head -10

# Check if Pact is already installed
cat package.json | grep -i pact
cat pom.xml 2>/dev/null | grep -i pact
cat build.gradle 2>/dev/null | grep -i pact

# Find existing API definitions
find . -name "openapi*.yaml" -o -name "swagger*.yaml" -o -name "asyncapi.yaml" | head -5
```

## Step 2 — Install Pact

### TypeScript/Node.js

```bash
npm install --save-dev @pact-foundation/pact

# Add to package.json scripts
{
  "scripts": {
    "test:pact:consumer": "jest --testPathPattern=pact --testTimeout=30000",
    "test:pact:provider": "jest --testPathPattern=provider.pact",
    "pact:publish": "pact-broker publish ./pacts --consumer-app-version $GIT_SHA"
  }
}
```

### Java / Spring Boot

```xml
<dependency>
  <groupId>au.com.dius.pact.consumer</groupId>
  <artifactId>junit5</artifactId>
  <version>4.6.x</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>au.com.dius.pact.provider</groupId>
  <artifactId>junit5spring</artifactId>
  <version>4.6.x</version>
  <scope>test</scope>
</dependency>
```

## Step 3 — Write Consumer Pact

Generate a consumer pact test for the primary API integration found in Step 1.

**Template (TypeScript):**

```typescript
// src/api/__tests__/order-api.pact.spec.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { OrderApiClient } from '../order-api-client';

const { like, eachLike, string, integer } = MatchersV3;

const provider = new PactV3({
  consumer: '[consumer-name]',    // ← Fill in
  provider: '[provider-name]',    // ← Fill in
  dir: path.resolve(process.cwd(), 'pacts'),
  port: 9090,
  logLevel: 'warn',
});

describe('[Consumer] → [Provider] Contract', () => {
  describe('GET /[resource]/:id', () => {
    it('returns [resource] for valid ID', async () => {
      await provider
        .given('[resource] with ID [example-id] exists')
        .uponReceiving('a GET request for [resource] [example-id]')
        .withRequest({
          method: 'GET',
          path: '/[resource]/[example-id]',
          headers: {
            Accept: 'application/json',
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: like('[example-id]'),
            // Add expected fields with matchers
          },
        })
        .executeTest(async (mockServer) => {
          const client = new OrderApiClient(mockServer.url);
          const result = await client.getResource('[example-id]');
          expect(result.id).toBeDefined();
        });
    });

    it('returns 404 when [resource] does not exist', async () => {
      await provider
        .given('[resource] with ID [missing-id] does not exist')
        .uponReceiving('a GET request for non-existent [resource]')
        .withRequest({ method: 'GET', path: '/[resource]/[missing-id]' })
        .willRespondWith({
          status: 404,
          body: { error: like('Not found') },
        })
        .executeTest(async (mockServer) => {
          const client = new OrderApiClient(mockServer.url);
          await expect(client.getResource('[missing-id]')).rejects.toThrow();
        });
    });
  });
});
```

## Step 4 — Pact Broker Setup

### Option A: Self-Hosted (Docker Compose)

```yaml
# docker-compose.pact.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
      POSTGRES_DB: pact
    volumes:
      - pact-db:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    depends_on:
      - postgres
    environment:
      PACT_BROKER_DATABASE_URL: "postgres://pact:pact@postgres/pact"
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: password

volumes:
  pact-db:
```

```bash
docker-compose -f docker-compose.pact.yml up -d
# Broker available at http://localhost:9292
```

### Option B: PactFlow SaaS (Recommended for teams)

```
1. Sign up at pactflow.io (free tier: 5 integrations)
2. Create API token in settings
3. Add to CI secrets: PACT_BROKER_TOKEN, PACT_BROKER_BASE_URL
```

## Step 5 — Publish Pacts

```bash
# After consumer tests pass, publish generated pact files
npx pact-broker publish ./pacts \
  --broker-base-url $PACT_BROKER_BASE_URL \
  --broker-token $PACT_BROKER_TOKEN \
  --consumer-app-version $(git rev-parse HEAD) \
  --branch $(git branch --show-current) \
  --tag $(git branch --show-current)
```

## Step 6 — Provider Verification

Add to the provider service's test suite:

```typescript
// src/__tests__/provider.pact.spec.ts
import { Verifier } from '@pact-foundation/pact';
import { app } from '../app';
import { seedTestData, cleanupTestData } from '../test/helpers';

describe('Provider Pact Verification', () => {
  let server: ReturnType<typeof app.listen>;

  beforeAll(() => {
    server = app.listen(3001);
  });

  afterAll(() => {
    server.close();
  });

  it('verifies all consumer pacts', async () => {
    await new Verifier({
      provider: '[provider-name]',
      providerBaseUrl: 'http://localhost:3001',

      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_SHA || 'local',
      providerVersionBranch: process.env.BRANCH_NAME || 'local',

      stateHandlers: {
        '[resource] with ID [example-id] exists': async () => {
          await seedTestData({ id: '[example-id]' });
        },
        '[resource] with ID [missing-id] does not exist': async () => {
          await cleanupTestData('[missing-id]');
        },
      },
    }).verifyProvider();
  });
});
```

## Step 7 — CI Integration

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  push:
    branches: [main]
  pull_request:

env:
  PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
  PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
  GIT_SHA: ${{ github.sha }}
  BRANCH_NAME: ${{ github.head_ref || github.ref_name }}

jobs:
  consumer-tests:
    name: Consumer Pact Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test:pact:consumer
      - name: Publish pacts to broker
        run: npm run pact:publish

  can-i-deploy:
    name: can-i-deploy Check
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - name: Check deployment safety
        run: |
          npx pact-broker can-i-deploy \
            --pacticipant [consumer-name] \
            --version ${{ github.sha }} \
            --to-environment staging \
            --broker-base-url $PACT_BROKER_BASE_URL \
            --broker-token $PACT_BROKER_TOKEN
        # Exits 1 if provider has not verified this pact version
```

## Step 8 — Report

```markdown
## Contract Testing Setup Complete

**Consumer:** [consumer-name]
**Provider:** [provider-name]
**Pact Broker:** [URL or PactFlow]

### What was configured
- [x] Consumer pact tests: `src/api/__tests__/*.pact.spec.ts`
- [x] Pact files generated in: `./pacts/`
- [x] Pact Broker: [self-hosted / PactFlow]
- [x] Provider verification: `src/__tests__/provider.pact.spec.ts`
- [x] CI workflow: `.github/workflows/contract-tests.yml`
- [x] `can-i-deploy` gate before staging deployment

### Next Steps
1. Add state handlers for all provider states in pact test
2. Add pact tests for remaining API endpoints
3. Add message/event contracts if using async messaging
4. Configure `can-i-deploy` for production environment gate
```

## Reference Skills

- `contract-testing` — Pact patterns, OpenAPI testing, schema compatibility, oasdiff
- `api-contract` — Contract-First API design, OpenAPI spec
- `api-design` — REST API design patterns

## After This

- `/tdd` — add unit tests for contract-tested components
- `/code-review` — review contract test implementation
