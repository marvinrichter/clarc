---
description: Database migration workflow — plan, review, apply, and verify schema changes safely. Supports Drizzle, Prisma, Flyway, Alembic, golang-migrate. Guards against data-loss migrations reaching production.
---

# migrate

Safe database migration workflow with review gate before apply.

## Step 1 — Detect Migration Tool

Check for migration tool in order:
- `package.json` has `drizzle-orm` → **Drizzle** (`drizzle-kit`)
- `package.json` has `@prisma/client` → **Prisma** (`prisma migrate`)
- `pyproject.toml` / `requirements.txt` has `alembic` → **Alembic**
- `go.mod` has `golang-migrate` or `goose` → `golang-migrate` / `Goose`
- `pom.xml` / `build.gradle` has `flyway` → **Flyway**

If none detected, ask the user which tool they use.

## Step 2 — Parse Arguments

`$ARGUMENTS` may contain:
- (empty) → run full workflow: generate → review → apply → verify
- `generate <description>` → only generate the migration file
- `review` → review pending migrations (no apply)
- `apply` → apply pending migrations (skip generate)
- `rollback` → rollback last migration
- `status` → show migration status

## Step 3 — Generate Migration (if needed)

**Drizzle:**
```bash
npx drizzle-kit generate --name "$MIGRATION_NAME"
```
Migration written to `drizzle/migrations/XXXX_<name>.sql`

**Prisma:**
```bash
npx prisma migrate dev --name "$MIGRATION_NAME" --create-only
```
Migration written to `prisma/migrations/YYYYMMDDHHMMSS_<name>/migration.sql`

**Alembic:**
```bash
alembic revision --autogenerate -m "$MIGRATION_NAME"
```

**golang-migrate:**
```bash
migrate create -ext sql -dir migrations -seq "$MIGRATION_NAME"
# Creates: NNNNNN_<name>.up.sql + NNNNNN_<name>.down.sql
```

## Step 4 — Review the Migration

Read the generated migration file. Check for:

**CRITICAL — Block migration if found:**
- `DROP TABLE` or `DROP COLUMN` without a prior deprecation phase (data loss)
- `NOT NULL` added to existing column without `DEFAULT` (locks table, breaks in-flight requests)
- `ALTER TYPE` or `RENAME COLUMN` with active application code that uses the old name

**HIGH — Warn and require confirmation:**
- No `DOWN` migration (rollback impossible)
- Missing index on a new foreign key column
- Full-table lock risk: `ALTER TABLE ... ADD COLUMN` with non-null default on large table
- `TRUNCATE` statement
- Schema change that affects a column used in application code without a code change

**MEDIUM — Note:**
- New column without index (add index if queried)
- Migration file not in expected naming convention

Show findings with severity. For CRITICAL issues, stop and explain the safe alternative:

```
Migration Review: 20240315_add_user_status.sql
═══════════════════════════════════════════════

[HIGH] No DOWN migration found. Rollback will not be possible.
Fix: Add a reversible down migration.

[HIGH] New FK column 'status_id' has no index.
Fix: Add: CREATE INDEX idx_users_status_id ON users(status_id);

Verdict: Review required before proceeding.
Proceed anyway? (yes/no)
```

For CRITICAL issues, do NOT proceed even if user says yes. Explain the safe migration pattern instead.

## Step 5 — Safe Migration Patterns

**Adding a NOT NULL column to existing table:**
```sql
-- Step 1: Add nullable (no lock, instant)
ALTER TABLE users ADD COLUMN status VARCHAR(20);

-- Step 2: Backfill (run separately, batched if large table)
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Step 3: Add NOT NULL constraint (separate migration, after backfill)
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
```

**Renaming a column (zero-downtime):**
```
Phase 1 (this migration): Add new column, copy data with trigger
Phase 2 (app deploy):     Write to both columns, read from new
Phase 3 (next migration): Drop old column, remove trigger
```

**Removing a column (zero-downtime):**
```
Phase 1 (app deploy):     Stop reading/writing old column
Phase 2 (this migration): DROP COLUMN (safe, column already unused)
```

## Step 6 — Apply Migration

**Check environment:**
- If `$ENVIRONMENT` or inferred from git branch is `prod` or `production` → require explicit confirmation:
  ```
  WARNING: You are about to apply a migration to PRODUCTION.
  Type "apply to production" to confirm:
  ```

**Drizzle:**
```bash
npx drizzle-kit migrate
```

**Prisma:**
```bash
# Dev
npx prisma migrate dev
# Production
npx prisma migrate deploy
```

**Alembic:**
```bash
alembic upgrade head
```

**golang-migrate:**
```bash
migrate -database "$DATABASE_URL" -path migrations up
```

**Flyway:**
```bash
flyway migrate
```

## Step 7 — Verify

After apply, run the following checks:

1. **Status** — confirm all migrations applied successfully:
   - Drizzle: `npx drizzle-kit studio` or check `__drizzle_migrations` table
   - Prisma: `npx prisma migrate status`
   - Alembic: `alembic current` + `alembic history`

2. **Schema check** — read the migration tool's introspection to confirm schema matches expectations

3. **Smoke test** — if test command available, run it: `npm test` / `pytest` / `go test ./...`

4. **Row counts** — for any migration touching existing data, verify row count preserved:
   ```sql
   SELECT COUNT(*) FROM affected_table;
   ```

## Step 8 — Report

```
Migration Complete
══════════════════

Applied: 20240315_add_user_status
Tool:    Drizzle
DB:      postgresql://... (dev)
Duration: 1.2s

Verification:
  ✓ Migration status: applied
  ✓ Schema introspection: matches
  ✓ Tests: passed

Next: Deploy application code that uses the new column.
```

## Arguments

`$ARGUMENTS` examples:
- (empty) → full workflow
- `generate "add user status column"` → generate migration only
- `review` → review pending migrations without applying
- `apply` → apply pending (after manual review)
- `rollback` → rollback last applied migration
- `status` → show which migrations are pending/applied
