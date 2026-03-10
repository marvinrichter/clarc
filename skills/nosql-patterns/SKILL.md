---
name: nosql-patterns
description: "NoSQL database patterns: MongoDB document design (embedding vs. referencing), DynamoDB single-table design with access patterns, Redis as primary store, and when to use each NoSQL database vs. Postgres."
---

# NoSQL Patterns Skill

## When to Activate

- Evaluating whether to use MongoDB, DynamoDB, or Redis over Postgres
- Designing a MongoDB schema (embedding vs. referencing decisions)
- Designing DynamoDB tables (single-table design, access patterns)
- Building high-throughput key/value or session storage
- Handling unstructured or highly variable document shapes
- Defining all DynamoDB access patterns upfront before committing to a key schema and GSI layout
- Deciding whether to embed or reference child data in MongoDB to avoid unbounded document growth or N+1 lookup patterns

---

## When to Choose NoSQL vs. Postgres

| Situation | Choose | Reason |
|-----------|--------|--------|
| Relational data, joins, ACID transactions | Postgres | Best default |
| Documents with highly variable schema | MongoDB | Flexible schema |
| Serverless, auto-scaling, single-digit ms latency | DynamoDB | AWS-native, infinite scale |
| Ephemeral data, sessions, rate limiting, pub/sub | Redis | In-memory, TTL built-in |
| Analytical queries, Parquet/CSV files, local OLAP | DuckDB | Embedded, zero infra, columnar |
| Time-series (metrics, events) | TimescaleDB | Optimized for append + range queries |
| Graph relationships | Neo4j or Postgres + pgvector | Purpose-built |

**Default: Postgres.** Only switch to NoSQL when there's a specific, concrete reason.

---

## MongoDB: Document Design

### Embedding vs. Referencing

```
Embed when:
- Data is always accessed together (one query is better than two)
- Child data doesn't grow unboundedly
- Child doesn't need to be accessed independently

Reference when:
- Many-to-many relationship
- Child data is large and not always needed
- Child is shared across multiple parents
- Child grows unboundedly (e.g., comments on a post)
```

```javascript
// WRONG: Embedding unbounded arrays
// This document grows forever as comments are added
{
  _id: ObjectId("..."),
  title: "My Post",
  comments: [  // Could be 10,000 items — BSON document limit is 16MB
    { user: "alice", text: "Great post!" },
  ]
}

// CORRECT: Reference for unbounded one-to-many
// posts collection
{
  _id: ObjectId("post123"),
  title: "My Post",
  authorId: ObjectId("user456"),
  commentCount: 42,  // Denormalized counter for display (no extra query)
  createdAt: ISODate("2024-01-15")
}

// comments collection (separate, referenced by postId)
{
  _id: ObjectId("..."),
  postId: ObjectId("post123"),
  userId: ObjectId("user456"),
  text: "Great post!",
  createdAt: ISODate("2024-01-15")
}

// CORRECT: Embedding for bounded, co-accessed data
{
  _id: ObjectId("order123"),
  customerId: ObjectId("user456"),
  // Embed address (snapshot at time of order — doesn't change)
  shippingAddress: {
    street: "123 Main St",
    city: "Berlin",
    country: "DE",
    postalCode: "10115"
  },
  // Embed line items (bounded, always accessed with order)
  items: [
    { productId: ObjectId("prod789"), name: "Widget", qty: 2, price: 19.99 },
    { productId: ObjectId("prod101"), name: "Gadget", qty: 1, price: 49.99 }
  ],
  total: 89.97,
  status: "shipped"
}
```

### Indexes

```javascript
// Always index fields used in queries
db.orders.createIndex({ customerId: 1, createdAt: -1 });  // compound
db.comments.createIndex({ postId: 1, createdAt: -1 });

// Text index for search
db.products.createIndex({ name: "text", description: "text" });

// TTL index for expiring documents automatically
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Unique constraint
db.users.createIndex({ email: 1 }, { unique: true });

// Partial index (saves space when most docs have status: 'inactive')
db.orders.createIndex(
  { assignedTo: 1, createdAt: -1 },
  { partialFilterExpression: { status: 'open' } }
);
```

### TypeScript with Mongoose

```typescript
import { Schema, model, Document, Types } from 'mongoose';

interface IOrder extends Document {
  customerId: Types.ObjectId;
  items: Array<{ productId: Types.ObjectId; name: string; qty: number; price: number }>;
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [{
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true },
      qty: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    }],
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', orderSchema);
```

---

## DynamoDB: Single-Table Design

DynamoDB requires you to **define all access patterns upfront**. Start there.

### Step 1: Define Access Patterns

```
Entity: User, Order, Product

Access patterns:
1. Get user by ID
2. Get order by ID
3. Get all orders for a user (newest first)
4. Get all pending orders (across all users)
5. Get product by ID
```

### Step 2: Design Key Schema

```
Table: AppTable
PK (Partition Key): string
SK (Sort Key): string

Entities:
USER        | PK: USER#userId      | SK: USER#userId
ORDER       | PK: USER#userId      | SK: ORDER#orderId
PRODUCT     | PK: PRODUCT#id       | SK: PRODUCT#id

GSI1 (for access pattern 4 — query by status):
GSI1PK: ORDER_STATUS#status  | GSI1SK: ORDER#createdAt
```

```typescript
// DynamoDB with AWS SDK v3
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DYNAMODB_TABLE!;

// Get user by ID (access pattern 1)
async function getUser(userId: string) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `USER#${userId}` },
  }));
  return result.Item;
}

// Get all orders for user, newest first (access pattern 3)
async function getUserOrders(userId: string) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'ORDER#',
    },
    ScanIndexForward: false,  // Descending (newest first)
  }));
  return result.Items;
}

// Create order
async function createOrder(order: Order) {
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `USER#${order.userId}`,
      SK: `ORDER#${order.id}`,
      // GSI keys (for getPendingOrders via GSI1)
      GSI1PK: `ORDER_STATUS#PENDING`,
      GSI1SK: `ORDER#${order.createdAt.toISOString()}`,
      ...order,
    },
  }));
}
```

---

## Redis as Primary Store

```typescript
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });

// Session storage with rolling TTL
async function createSession(sessionId: string, userId: string, ttlSeconds = 86400) {
  await redis.setEx(
    `session:${sessionId}`,
    ttlSeconds,
    JSON.stringify({ userId, createdAt: new Date().toISOString() })
  );
}

async function getSession(sessionId: string) {
  const key = `session:${sessionId}`;
  const data = await redis.get(key);
  if (!data) return null;
  await redis.expire(key, 86400);  // Reset TTL (sliding window)
  return JSON.parse(data);
}

// Rate limiting with sliding window counter
async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const rateLimitKey = `ratelimit:${key}`;

  // Remove expired entries, add current, count total
  await redis.zRemRangeByScore(rateLimitKey, 0, windowStart);
  await redis.zAdd(rateLimitKey, { score: now, value: `${now}-${Math.random()}` });
  const count = await redis.zCard(rateLimitKey);
  await redis.expire(rateLimitKey, windowSeconds);

  return count > limit;
}

// Counter with atomic increment (no read-modify-write race)
async function incrementCounter(key: string): Promise<number> {
  return redis.incrBy(`counter:${key}`, 1);
}
```

---

## Checklist

**MongoDB:**
- [ ] Access patterns defined before schema design
- [ ] Embedding vs. referencing decision based on access pattern, not habit
- [ ] No unbounded arrays embedded in documents
- [ ] Indexes created for every query field
- [ ] TTL index for documents that should auto-expire
- [ ] Schema validation enabled at DB level (not just application level)

**DynamoDB:**
- [ ] All access patterns listed before table design
- [ ] Single-table design (not one table per entity)
- [ ] GSIs defined for every non-primary access pattern
- [ ] No table scans in production queries (always use Query, not Scan)
- [ ] TTL attribute set for ephemeral data

**Redis:**
- [ ] TTL set on every key (no keys without expiry for primary store use)
- [ ] Key naming convention documented (e.g., `entity:id:field`)
- [ ] Data serialization consistent (always JSON.stringify / JSON.parse)
- [ ] Atomic operations used where possible (INCR, SETNX, sorted sets)
