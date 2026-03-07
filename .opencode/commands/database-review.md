---
description: PostgreSQL schema, query, and security review — indexes, RLS, schema design, anti-patterns. Invokes the database-reviewer agent.
---

# Database Review

This command invokes the **database-reviewer** agent for comprehensive PostgreSQL review.

## What This Command Does

1. **Find DB Code**: Locate SQL files, migrations, ORM models, and query files via `git diff`
2. **Query Performance**: Run `EXPLAIN ANALYZE` on complex queries, check for Seq Scans
3. **Index Audit**: Verify all WHERE/JOIN/FK columns are indexed, composite index order
4. **Schema Design**: Check data types, constraints, naming conventions
5. **Security Review**: Validate RLS policies, permissions, parameterized queries
6. **Anti-Pattern Detection**: Flag SELECT *, OFFSET pagination, int IDs, unparameterized queries

## When to Use

Use `/database-review` when:
- Writing or modifying SQL queries
- Creating or altering database migrations
- Designing or changing schema
- Adding or modifying Row Level Security policies
- Reviewing ORM models (SQLAlchemy, Prisma, ActiveRecord, etc.)
- Performance troubleshooting

## Review Categories

### CRITICAL (Must Fix)

- Unparameterized queries (SQL injection risk)
- Missing RLS on multi-tenant tables
- `GRANT ALL` to application users
- Transactions holding locks during external calls

### HIGH (Should Fix)

- WHERE/JOIN columns without indexes
- Foreign keys without indexes
- N+1 query patterns
- `OFFSET` pagination on large tables
- `int` instead of `bigint` for IDs
- `timestamp` without timezone

### MEDIUM (Consider)

- `SELECT *` in production queries
- Missing composite index optimization
- Random UUIDs as primary keys (prefer UUIDv7)
- Suboptimal data types

## Automated Diagnostics

```bash
# Slow queries
psql -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Table sizes
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Index usage
psql -c "SELECT indexrelname, idx_scan, idx_tup_read FROM pg_stat_user_indexes ORDER BY idx_scan DESC;"

# Unused indexes
psql -c "SELECT schemaname, tablename, indexname FROM pg_stat_user_indexes WHERE idx_scan = 0;"
```

## Approval Criteria

| Status | Condition |
|--------|-----------|
| Approve | No CRITICAL or HIGH issues |
| Warning | Only MEDIUM issues (merge with caution) |
| Block | CRITICAL or HIGH issues found |

## Related

- Agent: `agents/database-reviewer.md`
- Skills: `skills/postgres-patterns/`, `skills/database-migrations/`
- Use `/security` for application-level security review
