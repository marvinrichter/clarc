---
paths:
  - "**/*.sql"
  - "**/migrations/**"
  - "**/*.prisma"
---

# SQL Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with SQL specific content.

## Keywords

Use UPPERCASE for SQL keywords and LOWERCASE for identifiers:

```sql
-- WRONG
select id, name from users where active = true;

-- CORRECT
SELECT id, name FROM users WHERE active = TRUE;
```

## Naming Conventions

- Tables: `snake_case`, plural (`users`, `order_items`)
- Columns: `snake_case` (`created_at`, `user_id`)
- Indexes: `idx_<table>_<column(s)>` (`idx_users_email`)
- Foreign keys: `fk_<table>_<referenced_table>` (`fk_orders_users`)
- Constraints: `chk_<table>_<description>` (`chk_users_email_format`)

## SELECT Discipline

Never use `SELECT *` in production code — always name columns explicitly:

```sql
-- WRONG
SELECT * FROM users;

-- CORRECT
SELECT id, name, email, created_at FROM users;
```

## Explicit JOINs

Always use explicit JOIN types — never implicit comma-join:

```sql
-- WRONG (implicit join)
SELECT u.name, o.total FROM users u, orders o WHERE u.id = o.user_id;

-- CORRECT
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## Formatting

- One clause per line (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY)
- Indent continuation lines by 2 spaces
- End every statement with a semicolon

```sql
SELECT
  u.id,
  u.name,
  COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 100;
```

## NULL Handling

Always be explicit about NULL semantics:

```sql
-- Check for NULL
WHERE column IS NULL
WHERE column IS NOT NULL

-- Coalesce for defaults
SELECT COALESCE(display_name, email, 'Unknown') AS name FROM users;
```

## Boolean Columns

Use `BOOLEAN` type with explicit `TRUE`/`FALSE`, not `1`/`0`:

```sql
WHERE is_active = TRUE
```
