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

# SQL Security Guidelines

> This file extends [common/security.md](../common/security.md) with SQL specific content.

## SQL Injection Prevention (CRITICAL)

Never concatenate user input into SQL. Always use parameterized queries:

```python
# WRONG
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# CORRECT
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```

```typescript
// WRONG
db.query(`SELECT * FROM users WHERE email = '${email}'`)

// CORRECT (postgres)
db.query("SELECT * FROM users WHERE email = $1", [email])
```

## Principle of Least Privilege

Database users should only have the permissions they need:

```sql
-- Application user — no DDL rights
CREATE ROLE app_user LOGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Migration user — DDL rights only for migrations
CREATE ROLE migration_user LOGIN;
GRANT ALL PRIVILEGES ON DATABASE myapp TO migration_user;

-- Read-only analytics user
CREATE ROLE analytics_user LOGIN;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
```

## Row-Level Security

Enable RLS on multi-tenant tables to prevent data leakage:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

## Sensitive Data

- Encrypt PII columns at rest where supported (pgcrypto)
- Hash passwords — never store plaintext or reversible encryption
- Mask sensitive data in logs and EXPLAIN ANALYZE output

```sql
-- Store hashed passwords
UPDATE users SET password_hash = crypt($1, gen_salt('bf', 12)) WHERE id = $2;

-- Verify password
SELECT id FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash);
```

## Prevent Mass Data Export

Add LIMIT to all user-facing queries:

```sql
-- Always include LIMIT for user-facing endpoints
SELECT id, name FROM users
WHERE <filter>
ORDER BY created_at DESC
LIMIT 100;  -- Never omit LIMIT
```

## Migration Safety

- Never drop columns in the same migration that removes code using them
- Deploy code changes first (ignore old column), then drop the column in a later migration
- Use `IF EXISTS` guards in down migrations to make them idempotent

```sql
-- Safe column removal (step 2 of 2 — code already ignores this column)
ALTER TABLE users DROP COLUMN IF EXISTS legacy_field;
```

## Audit Logging

Log all mutations on sensitive tables:

```sql
-- Track who changed what and when
CREATE TRIGGER users_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```
