---
name: test-data
description: "Test data management patterns: factory functions, fixtures, database seeders, test isolation strategies, and safely anonymizing production data for testing. Covers TypeScript, Python, and Go."
---

# Test Data Skill

Bad test data leads to flaky tests, test interdependence, and production data leaking into dev. Good test data is isolated, realistic, and generated programmatically.

## When to Activate

- Setting up test infrastructure for a new project
- Tests are slow because they share state
- Tests fail when run in different order (order-dependent tests)
- Writing integration tests that need DB rows
- Creating realistic seed data for development
- Replacing hard-coded fixture JSON files with programmatic factory functions
- Ensuring production data is anonymized before being restored to a staging or development environment
- Choosing between transaction rollback, truncation, or unique-ID strategies for test isolation

---

## Core Principles

1. **Each test creates its own data** — never depend on state from another test
2. **Use factories, not fixtures** — factories generate data, fixtures are static snapshots
3. **Clean up after yourself** — or use transactions that roll back
4. **Realistic but fake** — use faker, not `test@test.com` / `password`
5. **Seeders for dev, factories for tests** — different tools for different purposes

---

## Pattern 1: Factory Functions

### TypeScript (with Drizzle/Prisma)

```typescript
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { db } from '../../src/db';
import { users } from '../../src/db/schema';

interface UserOptions {
  email?: string;
  role?: 'admin' | 'manager' | 'customer';
  plan?: 'free' | 'pro';
}

export async function createUser(options: UserOptions = {}) {
  const [user] = await db.insert(users).values({
    email: options.email ?? faker.internet.email(),
    name: faker.person.fullName(),
    role: options.role ?? 'customer',
    plan: options.plan ?? 'free',
    passwordHash: await bcrypt.hash('test-password', 10),
    createdAt: new Date(),
  }).returning();
  return user;
}

// Compose factories for related data
export async function createOrderWithItems(userId: string, itemCount = 2) {
  const [order] = await db.insert(orders).values({
    userId,
    status: 'pending',
    total: 0,
  }).returning();

  const items = await Promise.all(
    Array.from({ length: itemCount }, async () => {
      const product = await createProduct();
      return db.insert(orderItems).values({
        orderId: order.id,
        productId: product.id,
        quantity: faker.number.int({ min: 1, max: 5 }),
        price: product.price,
      }).returning();
    })
  );

  return { order, items: items.flat() };
}
```

### Python (with SQLAlchemy)

```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from faker import Faker

fake = Faker()

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session = None  # set in conftest

    email = factory.LazyAttribute(lambda _: fake.email())
    name = factory.LazyAttribute(lambda _: fake.name())
    role = 'customer'
    plan = 'free'
    password_hash = factory.LazyAttribute(lambda _: bcrypt.hash('test-password'))

# Usage
user = UserFactory.create()
admin = UserFactory.create(role='admin', plan='pro')
users = UserFactory.create_batch(5)
```

### Go

```go
// tests/factories/user.go
package factories

import (
    "github.com/brianvoe/gofakeit/v7"
    "github.com/myapp/internal/domain"
)

type UserFactory struct{ db *sqlx.DB }

func (f *UserFactory) Create(opts ...func(*domain.User)) (*domain.User, error) {
    u := &domain.User{
        Email: gofakeit.Email(),
        Name:  gofakeit.Name(),
        Role:  "customer",
    }
    for _, opt := range opts {
        opt(u)
    }
    return f.db.InsertUser(context.Background(), u)
}

// Usage
user, _ := factory.Create(func(u *domain.User) { u.Role = "admin" })
```

---

## Pattern 2: Test Isolation

### Option A: Transaction Rollback (fastest)

```typescript
// vitest / jest
let txn: Transaction;

beforeEach(async () => {
  txn = await db.transaction();
  // Override db in the module under test to use this transaction
});

afterEach(async () => {
  await txn.rollback();  // All changes undone — no cleanup needed
});
```

### Option B: Truncate After Each Test

```typescript
// If rollback isn't possible (e.g. autocommit drivers)
afterEach(async () => {
  await db.execute(sql`TRUNCATE users, orders, order_items RESTART IDENTITY CASCADE`);
});
```

### Option C: Unique Data Per Test (no cleanup needed)

```typescript
// Use a unique prefix so tests don't collide even without cleanup
const testId = randomUUID();
const user = await createUser({ email: `test+${testId}@example.com` });
```

---

## Pattern 3: Database Seeder (for development)

```typescript
// scripts/seed.ts — for local development, not tests
import { faker } from '@faker-js/faker';

async function seed() {
  console.log('Seeding database...');

  // Create predictable users for easy login
  const admin = await createUser({ email: 'admin@example.com', role: 'admin' });
  const user = await createUser({ email: 'user@example.com', role: 'customer' });

  // Create realistic random data
  await Promise.all(
    Array.from({ length: 50 }, () => createUser())
  );

  await Promise.all(
    Array.from({ length: 100 }, () => createOrderWithItems(user.id, faker.number.int({ min: 1, max: 5 })))
  );

  console.log('Done.');
}

seed().then(() => process.exit(0)).catch(console.error);
```

```json
// package.json
"scripts": {
  "db:seed": "tsx scripts/seed.ts",
  "db:reset": "npx prisma migrate reset --force && npm run db:seed"
}
```

---

## Pattern 4: Anonymizing Production Data

When you need production-scale data for realistic load tests or debugging:

```typescript
// scripts/anonymize.ts — run AFTER dumping production DB to staging
async function anonymize() {
  await db.execute(sql`
    UPDATE users SET
      email = 'user_' || id || '@example-test.com',
      name = 'Test User ' || id,
      phone = NULL,
      address = NULL
    WHERE email NOT LIKE '%@yourcompany.com'  -- preserve internal accounts
  `);

  await db.execute(sql`
    UPDATE orders SET
      shipping_address = '123 Test Street, Testville',
      billing_address = '123 Test Street, Testville'
  `);

  // Delete actual payment data — never anonymize, always delete
  await db.execute(sql`UPDATE orders SET stripe_payment_intent_id = NULL`);

  console.log('Anonymization complete.');
}
```

**Rules for anonymization:**
- Never bring real emails into dev/staging (GDPR, accidental emails to real users)
- Never bring real payment methods or tokens
- Never bring real passwords (hash them to a known value)
- Preserve data shape/volume (the whole point is realistic scale)

---

## Anti-Patterns

### Using Hard-Coded Fixture Files Shared Across Tests

**Wrong:**
```typescript
// tests/fixtures/users.json — shared by all tests
[{ "id": "1", "email": "alice@example.com", "role": "admin" }]

// test-a.test.ts
const user = fixtures.users[0]
user.role = 'customer' // mutates shared object — breaks test-b
```

**Correct:**
```typescript
// Each test creates isolated data via factory
const user = await createUser({ role: 'admin' })
// No shared mutable state — test runs in any order
```

**Why:** Shared fixture files create hidden dependencies between tests; factories produce isolated, independent data for every test run.

### Using Predictable or Real-Looking PII as Test Data

**Wrong:**
```typescript
const user = await createUser({
  email: 'test@test.com',
  name: 'Test User',
  phone: '555-1234',
})
```

**Correct:**
```typescript
import { faker } from '@faker-js/faker'

const user = await createUser({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  phone: faker.phone.number(),
})
```

**Why:** Placeholder values like `test@test.com` can end up in logs, emails, or analytics; faker-generated data is realistic enough to catch formatting bugs without leaking patterns.

### Not Cleaning Up Between Tests (Leaving DB State)

**Wrong:**
```typescript
it('creates an order', async () => {
  const order = await createOrder({ userId: 'user-1' })
  expect(order.status).toBe('pending')
  // no cleanup — next test sees this order
})

it('lists pending orders', async () => {
  const orders = await listPendingOrders()
  expect(orders).toHaveLength(1) // fails if previous test ran first and left data
})
```

**Correct:**
```typescript
beforeEach(async () => { await db.execute(sql`TRUNCATE orders RESTART IDENTITY CASCADE`) })

it('creates an order', async () => { ... })
it('lists pending orders', async () => { expect(orders).toHaveLength(0) }) // always clean
```

**Why:** Tests that rely on implicit pre-existing data fail unpredictably depending on run order, parallelism, or leftover data from prior failures.

### Using Seeders (Dev Scripts) Inside Unit/Integration Tests

**Wrong:**
```typescript
beforeAll(async () => {
  await runSeedScript() // seeds 50 users, 100 orders — slow and imprecise
})

it('finds admin users', async () => {
  const admins = await findByRole('admin')
  expect(admins.length).toBeGreaterThan(0) // fragile — depends on seed content
})
```

**Correct:**
```typescript
it('finds admin users', async () => {
  await createUser({ role: 'admin' })
  await createUser({ role: 'customer' }) // control exact state

  const admins = await findByRole('admin')
  expect(admins).toHaveLength(1)
})
```

**Why:** Seeders are designed for developer convenience with bulk data, not test precision; factories give each test exact control over what exists in the database.

### Bringing Real Production Data Into Development Without Anonymization

**Wrong:**
```bash
# Restore prod dump directly to dev DB
pg_restore --dbname=myapp_dev prod-backup.dump
# Real emails, names, payment tokens now in dev
```

**Correct:**
```bash
pg_restore --dbname=myapp_dev prod-backup.dump
tsx scripts/anonymize.ts  # replace PII before any developer touches the data
```

**Why:** Real PII in dev environments violates GDPR, risks accidental emails to real users, and exposes payment tokens — anonymize immediately after restore, never after.

## Checklist

- [ ] Tests use factories, not shared fixture files
- [ ] Each test creates its own data (no test order dependency)
- [ ] Tests clean up (rollback, truncate, or unique IDs)
- [ ] Seeders use realistic fake data (faker) not `test@test.com`
- [ ] Production data anonymized before use in dev/staging
- [ ] No real PII (emails, names, payment data) in dev environments
- [ ] Factory defaults are sensible (no required fields without defaults)
