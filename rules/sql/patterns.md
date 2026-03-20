---
paths:
  - "**/*.sql"
  - "**/migrations/**"
  - "**/*.prisma"
globs:
  - "**/*.sql"
  - "**/*.prisma"
  - "**/migrations/**"
alwaysApply: false
---

# SQL Patterns

> This file extends [common/patterns.md](../common/patterns.md) with SQL specific content.

## Parameterized Queries (CRITICAL)

Never interpolate values into SQL strings. Always use parameterized queries:

```sql
-- WRONG (SQL injection risk)
"SELECT * FROM users WHERE email = '" + email + "'"

-- CORRECT (parameterized)
"SELECT * FROM users WHERE email = $1"  -- PostgreSQL
"SELECT * FROM users WHERE email = ?"   -- MySQL / SQLite
```

## Migration Pattern

Every schema change must be a migration with up and down:

```sql
-- V001__create_users.sql (up)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- V001__create_users_rollback.sql (down)
DROP TABLE IF EXISTS users;
```

## Soft Delete Pattern

```sql
-- Add deleted_at column instead of deleting rows
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete"
UPDATE users SET deleted_at = NOW() WHERE id = $1;

-- Query active records only
SELECT * FROM users WHERE deleted_at IS NULL;

-- Use a view for convenience
CREATE VIEW active_users AS
  SELECT * FROM users WHERE deleted_at IS NULL;
```

## Audit Trail Pattern

```sql
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-populate
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
          to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Pagination Pattern

Use keyset (cursor) pagination for large tables — not OFFSET:

```sql
-- WRONG: OFFSET pagination is O(n)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 1000;

-- CORRECT: keyset pagination — O(log n) with index
SELECT * FROM orders
WHERE created_at < $1   -- cursor: last seen created_at
ORDER BY created_at DESC
LIMIT 20;
```

## Aggregation with FILTER

```sql
-- Conditional aggregates without subqueries
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users
FROM users;
```

## UPSERT Pattern

```sql
INSERT INTO user_settings (user_id, key, value)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

## Row-Level Security (PostgreSQL)

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_user_policy ON documents
  FOR ALL TO authenticated
  USING (owner_id = current_setting('app.current_user_id')::UUID);
```
