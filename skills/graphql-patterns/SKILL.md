---
name: graphql-patterns
description: "GraphQL API patterns: schema-first design, resolvers, DataLoader for N+1 prevention, subscriptions, error handling, pagination, auth, and performance. For TypeScript with Apollo Server or Pothos."
origin: ECC
---

# GraphQL Patterns Skill

## When to Activate

- Building a GraphQL API (new or adding to existing)
- Solving N+1 query problems in resolvers
- Implementing real-time subscriptions
- Designing a type-safe schema with code generation
- Adding auth (field-level or operation-level) to GraphQL

---

## Schema-First Design

Write the schema first — it's your contract.

```graphql
# schema.graphql

type Query {
  user(id: ID!): User
  users(first: Int = 10, after: String): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): UserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UserPayload!
}

type Subscription {
  userCreated: User!
}

type User {
  id: ID!
  email: String!
  name: String!
  orders(first: Int = 10): OrderConnection!
  createdAt: DateTime!
}

# Always use Relay-style Connections for lists (enables cursor pagination)
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Mutation payloads: always return the mutated entity + errors
type UserPayload {
  user: User
  errors: [UserError!]!
}

type UserError {
  field: String
  message: String!
  code: String!
}

input CreateUserInput {
  email: String!
  name: String!
}

scalar DateTime
```

---

## Schema with Pothos (TypeScript, type-safe)

```typescript
// schema/builder.ts
import SchemaBuilder from '@pothos/core';
import DataloaderPlugin from '@pothos/plugin-dataloader';
import RelayPlugin from '@pothos/plugin-relay';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: { authenticated: boolean; admin: boolean };
}>({
  plugins: [ScopeAuthPlugin, RelayPlugin, DataloaderPlugin],
  authScopes: async (context) => ({
    authenticated: !!context.user,
    admin: context.user?.role === 'admin',
  }),
  relay: {},
});

// schema/types/user.ts
builder.queryField('user', (t) =>
  t.field({
    type: UserType,
    nullable: true,
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: (_, { id }, ctx) => ctx.loaders.user.load(id),
  })
);
```

---

## DataLoader — Solving the N+1 Problem

Without DataLoader, fetching 100 users' orders = 101 DB queries (1 + 100).

```typescript
// loaders/index.ts
import DataLoader from 'dataloader';

export function createLoaders(db: Database) {
  return {
    // Batch: instead of 100 individual queries, one WHERE IN query
    user: new DataLoader<string, User | null>(async (ids) => {
      const users = await db.query.users.findMany({
        where: inArray(usersTable.id, ids as string[]),
      });
      // MUST return results in same order as input ids
      const map = new Map(users.map(u => [u.id, u]));
      return ids.map(id => map.get(id) ?? null);
    }),

    // Orders by userId: batch load
    ordersByUser: new DataLoader<string, Order[]>(async (userIds) => {
      const orders = await db.query.orders.findMany({
        where: inArray(ordersTable.userId, userIds as string[]),
      });
      // Group by userId
      const grouped = new Map<string, Order[]>();
      for (const order of orders) {
        const list = grouped.get(order.userId) ?? [];
        list.push(order);
        grouped.set(order.userId, list);
      }
      return userIds.map(id => grouped.get(id) ?? []);
    }),
  };
}

// Context setup (per request)
export function createContext(req: Request): GraphQLContext {
  return {
    user: req.user,
    db,
    loaders: createLoaders(db),  // Fresh loaders per request (clear between requests)
  };
}
```

---

## Cursor Pagination

```typescript
// Relay-compliant cursor pagination
async function paginateUsers(args: {
  first?: number;
  after?: string;
}): Promise<UserConnection> {
  const limit = Math.min(args.first ?? 10, 100); // cap at 100
  const afterId = args.after ? decodeCursor(args.after) : null;

  const rows = await db.query.users.findMany({
    where: afterId ? gt(users.id, afterId) : undefined,
    limit: limit + 1,  // fetch one extra to determine hasNextPage
    orderBy: asc(users.id),
  });

  const hasNextPage = rows.length > limit;
  const edges = rows.slice(0, limit).map(user => ({
    node: user,
    cursor: encodeCursor(user.id),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: !!afterId,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount: await db.$count(users),
  };
}

function encodeCursor(id: string) {
  return Buffer.from(`cursor:${id}`).toString('base64');
}
function decodeCursor(cursor: string) {
  return Buffer.from(cursor, 'base64').toString().replace('cursor:', '');
}
```

---

## Error Handling

```typescript
// GraphQL errors: use extensions for machine-readable codes
import { GraphQLError } from 'graphql';

// Throw typed errors from resolvers
throw new GraphQLError('User not found', {
  extensions: {
    code: 'NOT_FOUND',
    http: { status: 404 },
  },
});

// Mutation payloads: return errors as data (not thrown)
// This allows partial success and field-level errors
const createUser = async (input: CreateUserInput): Promise<UserPayload> => {
  const validation = validateUserInput(input);
  if (!validation.ok) {
    return {
      user: null,
      errors: validation.errors.map(e => ({
        field: e.field,
        message: e.message,
        code: 'VALIDATION_ERROR',
      })),
    };
  }

  const user = await db.insert(users).values(input).returning();
  return { user, errors: [] };
};
```

---

## Subscriptions

```typescript
// Apollo Server with WebSocket transport
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const httpServer = createServer(app);
const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

useServer(
  {
    schema,
    context: async (ctx) => {
      // Auth for subscriptions via connection params
      const token = ctx.connectionParams?.authorization;
      const user = token ? await verifyToken(token) : null;
      return { user, loaders: createLoaders(db) };
    },
  },
  wsServer
);

// Resolver with PubSub
const pubsub = new PubSub();

const resolvers = {
  Mutation: {
    createUser: async (_, { input }) => {
      const user = await createUserInDb(input);
      await pubsub.publish('USER_CREATED', { userCreated: user });
      return { user, errors: [] };
    },
  },
  Subscription: {
    userCreated: {
      subscribe: (_, __, ctx) => {
        if (!ctx.user?.isAdmin) throw new GraphQLError('Unauthorized');
        return pubsub.asyncIterableIterator('USER_CREATED');
      },
    },
  },
};
```

---

## Performance

```typescript
// Depth limiting — prevent deeply nested malicious queries
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  schema,
  validationRules: [
    depthLimit(10),                    // Max query depth
    createComplexityRule({ maxComplexity: 1000 }),  // query-complexity
  ],
});

// Persisted queries — send hash instead of full query text
// Apollo Client sends { extensions: { persistedQuery: { sha256Hash: "..." } } }
// Server looks up query by hash — reduces bandwidth, enables CDN caching of queries
```

---

## Checklist

- [ ] Schema written first, before any resolver code
- [ ] All list fields use Relay Connection pagination (not plain arrays)
- [ ] DataLoaders created per-request (not per-server) to prevent cross-request data leaking
- [ ] Every list resolver uses DataLoader (zero N+1 queries)
- [ ] Mutation payloads return `errors: []` field (never throw for user errors)
- [ ] Auth checked at operation level AND field level where needed
- [ ] Query depth limit configured (max 10)
- [ ] Subscriptions auth via connectionParams (not cookies)
- [ ] `graphql-codegen` generates types from schema for frontend consumption
