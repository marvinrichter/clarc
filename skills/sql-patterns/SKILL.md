---
name: sql-patterns
description: "SQL query patterns: parameterized queries, keyset pagination, UPSERT, window functions, CTEs, aggregation with FILTER, soft delete, audit trails, row-level security, and migration best practices. Use when writing or reviewing SQL queries and schema changes."
---

# SQL Patterns Skill

## When to Activate

- Writing SQL queries for a new feature
- Reviewing SQL for performance or security issues
- Designing database schema for a new entity
- Writing database migrations
- Optimizing slow queries
- Setting up row-level security or audit logging

---

## Core Query Patterns

### SELECT — always explicit columns

```sql
-- WRONG: hides schema changes, transfers unnecessary data
SELECT * FROM users WHERE id = $1;

-- CORRECT
SELECT id, name, email, created_at FROM users WHERE id = $1;
```

### Parameterized queries — non-negotiable

```sql
-- PostgreSQL ($N placeholders)
SELECT id, name FROM users WHERE email = $1 AND is_active = $2;

-- MySQL/SQLite (? placeholders)
SELECT id, name FROM users WHERE email = ? AND is_active = ?;
```

### Explicit JOIN types

```sql
-- INNER JOIN: only rows with matches in both tables
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN: all users, even those with no orders
SELECT u.name, COALESCE(SUM(o.total), 0) AS lifetime_value
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

---

## Pagination

### Keyset (cursor) pagination — for large tables

```sql
-- First page
SELECT id, name, created_at
FROM users
WHERE is_active = TRUE
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page (cursor = last row's (created_at, id))
SELECT id, name, created_at
FROM users
WHERE is_active = TRUE
  AND (created_at, id) < ($1, $2)   -- cursor condition
ORDER BY created_at DESC, ID DESC
LIMIT 20;
```

Why not OFFSET? `OFFSET N` reads and discards N rows — O(N). Keyset is O(log N) with a composite index.

```sql
-- Required index for keyset pagination above
CREATE INDEX idx_users_cursor ON users(created_at DESC, id DESC)
WHERE is_active = TRUE;
```

### OFFSET pagination — only for small datasets

```sql
-- Acceptable when total count < ~10k rows
SELECT * FROM categories ORDER BY name LIMIT 50 OFFSET $1;
```

---

## Aggregation Patterns

### Conditional counts with FILTER

```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                                                AS total_orders,
  COUNT(*) FILTER (WHERE status = 'completed')            AS completed,
  COUNT(*) FILTER (WHERE status = 'refunded')             AS refunded,
  SUM(total) FILTER (WHERE status = 'completed')          AS revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;
```

### Window functions

```sql
-- Running total
SELECT
  id,
  amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at) AS running_total
FROM transactions;

-- Rank within group
SELECT
  user_id,
  product_id,
  purchase_count,
  RANK() OVER (PARTITION BY user_id ORDER BY purchase_count DESC) AS rank
FROM user_product_stats;

-- Lag/lead for time-series
SELECT
  date,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY date) AS prev_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY date) AS change
FROM daily_revenue;
```

---

## CTEs (Common Table Expressions)

```sql
-- Readable multi-step query
WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE is_active = TRUE
    AND created_at >= NOW() - INTERVAL '90 days'
),
user_order_counts AS (
  SELECT user_id, COUNT(*) AS order_count
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT
  u.name,
  u.email,
  COALESCE(o.order_count, 0) AS recent_orders
FROM active_users u
LEFT JOIN user_order_counts o ON u.id = o.user_id
ORDER BY recent_orders DESC;
```

---

## UPSERT

```sql
-- PostgreSQL ON CONFLICT
INSERT INTO user_preferences (user_id, key, value, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Insert only if not exists (no update needed)
INSERT INTO feature_flags (key, enabled)
VALUES ($1, FALSE)
ON CONFLICT (key) DO NOTHING;
```

---

## Schema Patterns

### Standard table template

```sql
CREATE TABLE entities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- domain columns here
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ           -- NULL = active (soft delete)
);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON entities
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
```

### Soft delete

```sql
-- Delete
UPDATE entities SET deleted_at = NOW() WHERE id = $1;

-- Query active records
SELECT * FROM entities WHERE deleted_at IS NULL;

-- Convenience view
CREATE VIEW active_entities AS
  SELECT * FROM entities WHERE deleted_at IS NULL;
```

---

## Index Strategy

```sql
-- Single column — most common
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Composite — for frequent multi-column filter
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial — for filtered queries (much smaller index)
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Expression index — for function-based lookups
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
```

### Index rules

- Every foreign key column should have an index
- Composite indexes: put the most selective column first
- Partial indexes save space when queries always filter a boolean/status
- Never over-index — each index slows INSERT/UPDATE/DELETE

---

## EXPLAIN ANALYZE

Run on any query that might be slow:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.id, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.is_active = TRUE
GROUP BY u.id;
```

Look for:
- `Seq Scan` on large tables — likely missing index
- `Hash Join` vs `Nested Loop` — nested loop is bad for large result sets
- `Rows` estimate vs `actual rows` — large mismatches indicate stale statistics (`ANALYZE`)

---

## Anti-Patterns

### String Interpolation Instead of Parameterized Queries

**Wrong:**
```sql
-- Application code building a raw query string
query = "SELECT * FROM users WHERE email = '" + email + "'";
-- email = "' OR '1'='1" → returns every row (SQL injection)
```

**Correct:**
```sql
-- PostgreSQL
SELECT id, name FROM users WHERE email = $1;

-- MySQL / SQLite
SELECT id, name FROM users WHERE email = ?;
```

**Why:** String interpolation allows SQL injection; parameterized queries separate code from data and let the database engine handle escaping.

---

### `SELECT *` in Production Queries

**Wrong:**
```sql
SELECT * FROM orders WHERE user_id = $1;
-- transfers unused columns, breaks if column order or name changes
```

**Correct:**
```sql
SELECT id, status, total, created_at FROM orders WHERE user_id = $1;
```

**Why:** `SELECT *` transfers columns the application never uses, breaks application code when columns are added or renamed, and prevents the query planner from using index-only scans.

---

### OFFSET Pagination on Large Tables

**Wrong:**
```sql
-- Page 500 of results: reads and discards 9 980 rows before returning 20
SELECT id, name FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 9980;
```

**Correct:**
```sql
-- Keyset pagination: jump straight to the cursor position
SELECT id, name, created_at FROM products
WHERE created_at < $1   -- cursor from last row of previous page
ORDER BY created_at DESC
LIMIT 20;
```

**Why:** `OFFSET N` forces the database to read and discard N rows on every page; keyset pagination navigates directly to the cursor position using an index, keeping cost O(log N).

---

### Implicit Comma Joins Instead of Explicit JOIN Syntax

**Wrong:**
```sql
SELECT u.name, o.total
FROM users u, orders o          -- implicit cross join
WHERE u.id = o.user_id;         -- filter buried in WHERE
```

**Correct:**
```sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**Why:** Implicit comma joins obscure intent, mix join conditions with filter conditions in `WHERE`, and are easy to accidentally omit — producing a full Cartesian product.

---

### Check-Then-Insert Race Condition Instead of UPSERT

**Wrong:**
```sql
-- Application code: two round-trips, not atomic
SELECT 1 FROM user_preferences WHERE user_id = $1 AND key = $2;
-- race: another process inserts here → next statement fails with unique violation
INSERT INTO user_preferences (user_id, key, value) VALUES ($1, $2, $3);
```

**Correct:**
```sql
INSERT INTO user_preferences (user_id, key, value, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

**Why:** The check-then-insert pattern has a TOCTOU race condition and requires two network round-trips; `ON CONFLICT DO UPDATE` is atomic and idempotent.

## Checklist

- [ ] No `SELECT *` in production queries
- [ ] All user input via parameterized placeholders ($1, ?)
- [ ] Explicit JOIN types (no implicit comma joins)
- [ ] LIMIT on all user-facing queries
- [ ] Keyset pagination for large tables (not OFFSET)
- [ ] Foreign key columns have indexes
- [ ] UPSERT used instead of check-then-insert
- [ ] Migrations have up and down scripts
- [ ] `EXPLAIN ANALYZE` run on queries touching >10k rows
- [ ] RLS enabled on multi-tenant tables
