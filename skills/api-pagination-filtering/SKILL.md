---
name: api-pagination-filtering
description: Cursor and offset pagination, filtering operators, multi-field sorting, full-text search, and sparse fieldsets for REST APIs.
---

# API Pagination & Filtering

## When to Activate

- Adding pagination to a list endpoint (choosing offset vs cursor)
- Implementing filtering with operators (gte, lte, in, after)
- Designing multi-field sort parameters
- Adding full-text search or field-specific search
- Implementing sparse fieldsets (fields=id,name,email)
- Designing the next_cursor / has_next response envelope for infinite scroll

> For REST URL design, HTTP methods, RFC 7807 errors, auth, rate limiting, and versioning — see skill `api-design`.

## Pagination

### Offset-Based (Simple)

```
GET /api/v1/users?page=2&per_page=20

# Implementation
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;
```

**Pros:** Easy to implement, supports "jump to page N"
**Cons:** Slow on large offsets (OFFSET 100000), inconsistent with concurrent inserts

### Cursor-Based (Scalable)

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20

# Implementation
SELECT * FROM users
WHERE id > :cursor_id
ORDER BY id ASC
LIMIT 21;  -- fetch one extra to determine has_next
```

```json
{
  "data": [...],
  "meta": {
    "has_next": true,
    "next_cursor": "eyJpZCI6MTQzfQ"
  }
}
```

**Pros:** Consistent performance regardless of position, stable with concurrent inserts
**Cons:** Cannot jump to arbitrary page, cursor is opaque

### When to Use Which

| Use Case | Pagination Type |
|----------|----------------|
| Admin dashboards, small datasets (<10K) | Offset |
| Infinite scroll, feeds, large datasets | Cursor |
| Public APIs | Cursor (default) with offset (optional) |
| Search results | Offset (users expect page numbers) |

## Filtering, Sorting, and Search

### Filtering

```
# Simple equality
GET /api/v1/orders?status=active&customer_id=abc-123

# Comparison operators (use bracket notation)
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/orders?created_at[after]=2025-01-01

# Multiple values (comma-separated)
GET /api/v1/products?category=electronics,clothing

# Nested fields (dot notation)
GET /api/v1/orders?customer.country=US
```

### Sorting

```
# Single field (prefix - for descending)
GET /api/v1/products?sort=-created_at

# Multiple fields (comma-separated)
GET /api/v1/products?sort=-featured,price,-created_at
```

### Full-Text Search

```
# Search query parameter
GET /api/v1/products?q=wireless+headphones

# Field-specific search
GET /api/v1/users?email=alice
```

### Sparse Fieldsets

```
# Return only specified fields (reduces payload)
GET /api/v1/users?fields=id,name,email
GET /api/v1/orders?fields=id,total,status&include=customer.name
```

## Cursor Pagination Handler (Express / Fastify)

```typescript
// Works with both Express and Fastify — adapts req/reply shape as needed
import { encodeBase64, decodeBase64 } from './utils';

interface CursorPayload { id: string; createdAt: string }

// GET /api/v1/posts?cursor=<token>&limit=20
async function listPostsHandler(req, reply) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rawCursor = req.query.cursor as string | undefined;

  // Decode opaque cursor → { id, createdAt }
  const after: CursorPayload | null = rawCursor
    ? JSON.parse(decodeBase64(rawCursor))
    : null;

  const rows = await db('posts')
    .where(function () {
      if (after) {
        // Tie-break sort: (createdAt, id) to handle same-timestamp rows
        this.where('created_at', '<', after.createdAt)
          .orWhere('created_at', '=', after.createdAt)
          .andWhere('id', '<', after.id);
      }
    })
    .orderBy([{ column: 'created_at', order: 'desc' }, { column: 'id', order: 'desc' }])
    .limit(limit + 1);   // fetch one extra to detect has_next

  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;

  const lastRow = data.at(-1);
  const nextCursor = hasNext && lastRow
    ? encodeBase64(JSON.stringify({ id: lastRow.id, createdAt: lastRow.created_at }))
    : null;

  return reply.send({
    data,
    meta: { has_next: hasNext, next_cursor: nextCursor },
  });
}
```

**Why tie-break on `(createdAt, id)`:** Sorting by timestamp alone causes rows with identical timestamps to appear in arbitrary order across pages. Adding `id` as a secondary sort key makes the cursor deterministic even under bulk inserts.
