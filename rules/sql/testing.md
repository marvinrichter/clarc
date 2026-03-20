---
paths:
  - "**/*.sql"
  - "**/migrations/**"
globs:
  - "**/*.sql"
  - "**/*.prisma"
  - "**/migrations/**"
alwaysApply: false
---

# SQL Testing Requirements

> This file extends [common/testing.md](../common/testing.md) with SQL specific content.

## Test Strategy

SQL should be tested at two levels:

1. **Schema tests** — verify constraints, indexes, and relationships work correctly
2. **Query tests** — verify queries return correct results under various conditions

## Database-Level Testing

### pgTAP (PostgreSQL)

```sql
-- tests/schema_test.sql
BEGIN;
SELECT plan(5);

-- Test table exists
SELECT has_table('users');

-- Test column exists with correct type
SELECT has_column('users', 'email');
SELECT col_type_is('users', 'email', 'text');

-- Test NOT NULL constraint
SELECT col_not_null('users', 'email');

-- Test unique constraint
SELECT col_is_unique('users', 'email');

SELECT * FROM finish();
ROLLBACK;
```

Run with:
```bash
pg_prove -d mydb tests/schema_test.sql
```

### Integration Tests (Application Layer)

Test queries through the application's data access layer:

```python
# pytest example
def test_user_query_returns_active_only(db):
    db.execute("INSERT INTO users (name, is_active) VALUES ('Alice', TRUE)")
    db.execute("INSERT INTO users (name, is_active) VALUES ('Bob', FALSE)")

    result = db.execute("SELECT name FROM users WHERE is_active = TRUE").fetchall()
    assert len(result) == 1
    assert result[0]["name"] == "Alice"
```

## Migration Testing

Every migration must be tested for:

1. **Up migration** — applies cleanly on a fresh schema
2. **Rollback** — down migration restores previous state
3. **Idempotency** — running the migration twice is safe

```bash
# Test migration applies
migrate up

# Verify schema state
psql -c "\d users"

# Test rollback
migrate down
migrate up  # should succeed on re-run
```

## Test Data Management

- Use `TRUNCATE ... CASCADE` in `teardown` — faster than `DELETE`
- Never rely on auto-increment ID values in assertions
- Use deterministic UUIDs in fixtures

```sql
-- setup.sql
INSERT INTO users (id, name, email)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test User', 'test@example.com');

-- teardown.sql
TRUNCATE users, orders, order_items CASCADE;
```

## Performance Testing

Test query execution plans for critical queries:

```sql
EXPLAIN ANALYZE
SELECT u.id, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
-- Verify: uses index scan, not seq scan on large tables
```
