---
name: duckdb-patterns
description: "DuckDB patterns for embedded OLAP analytics: in-process SQL on Parquet/CSV/JSON files, window functions, ASOF joins, dbt-duckdb integration, Dagster assets, Python/Node.js APIs, and performance tuning. Zero infrastructure required — analytical power without a server."
origin: clarc
---

# DuckDB Patterns

> **Scope**: Embedded analytical SQL — local analytics, ELT pipelines, file querying, and data transformation without infrastructure.
> For transactional database patterns, see [postgres-patterns](../postgres-patterns/SKILL.md).
> For orchestrating pipelines on top of DuckDB, see [data-engineering](../data-engineering/SKILL.md).

## When to Activate

- Running analytical queries without a database server
- Querying Parquet, CSV, or JSON files directly with SQL
- Building local or CI-friendly data pipelines
- Using dbt with DuckDB as the analytical backend
- Writing Dagster assets that produce or consume DuckDB tables
- Replacing a heavyweight OLAP database for single-node workloads

---

## Overview

DuckDB is an embedded, in-process OLAP database — SQLite for analytics. It runs inside your Python, Node.js, or CLI process with no server, no cloud dependency, and no operational overhead.

```
[Source files]         [DuckDB]           [Output]
Parquet / CSV   ─────► SQL queries  ────► DataFrame
JSON / S3       ─────► window fns   ────► Parquet
Postgres (FDW)  ─────► aggregations ────► Visualization
```

**When to choose DuckDB over Postgres for analytics:**
- Queries scan many rows but few columns (columnar wins)
- No persistent server in the environment (local scripts, CI, notebooks)
- Direct file analysis without import/ingest step
- Sub-second aggregations on hundreds of millions of rows locally

---

## Installation

```bash
# Python
pip install duckdb

# Node.js
npm install duckdb

# CLI
brew install duckdb   # macOS
```

---

## Core SQL Patterns

### In-memory vs persisted database

```python
import duckdb

# In-memory (default) — disappears when process ends
conn = duckdb.connect()

# Persisted — survives restarts, sharable
conn = duckdb.connect("analytics.duckdb")
```

### Direct file querying (no import needed)

```sql
-- Query Parquet directly
SELECT date_trunc('month', event_date) AS month,
       count(*) AS events
FROM read_parquet('data/events/*.parquet')
GROUP BY 1
ORDER BY 1;

-- Query CSV
SELECT * FROM read_csv('exports/users.csv', header=true, auto_detect=true);

-- Query JSON
SELECT json_extract(payload, '$.user_id') AS user_id
FROM read_ndjson('logs/events.ndjson');

-- Query S3 (with httpfs extension)
INSTALL httpfs; LOAD httpfs;
SELECT * FROM read_parquet('s3://my-bucket/data/*.parquet');
```

### Window functions

```sql
-- Rolling 7-day retention
SELECT
    user_id,
    event_date,
    count(*) OVER (
        PARTITION BY user_id
        ORDER BY event_date
        RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
    ) AS events_last_7d,
    -- First event ever (for cohort analysis)
    min(event_date) OVER (PARTITION BY user_id) AS first_seen
FROM events;

-- Percentile distribution
SELECT
    percentile_cont(0.5)  WITHIN GROUP (ORDER BY latency_ms) AS p50,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99
FROM request_logs;
```

### ASOF join (time-series matching)

```sql
-- Match each event to the most recent price at or before event_time
SELECT e.user_id, e.event_time, p.price
FROM events e
ASOF JOIN prices p
    ON e.symbol = p.symbol AND e.event_time >= p.price_time;
```

### Pivot / unpivot

```sql
-- Pivot: rows → columns
PIVOT monthly_revenue
ON month
USING sum(revenue)
GROUP BY product;

-- Unpivot: columns → rows
UNPIVOT metrics
ON (clicks, impressions, conversions)
INTO NAME metric VALUE value;
```

---

## Python Integration

### With pandas

```python
import duckdb
import pandas as pd

conn = duckdb.connect()

# Read from DataFrame — no copy, zero-overhead
df = pd.read_parquet("events.parquet")
result = conn.execute("""
    SELECT date_trunc('day', ts) AS day, count(*) AS n
    FROM df
    GROUP BY 1
    ORDER BY 1
""").df()   # returns a DataFrame

# Write query result to Parquet
conn.execute("""
    COPY (SELECT * FROM df WHERE event = 'purchase')
    TO 'purchases.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)
""")
```

### With Polars (zero-copy Arrow)

```python
import duckdb
import polars as pl

conn = duckdb.connect()
lf = pl.scan_parquet("events/*.parquet")

# DuckDB reads Polars LazyFrame directly
result = conn.execute("SELECT * FROM lf WHERE amount > 100").pl()
```

### Relation API (composable queries)

```python
conn = duckdb.connect()

events = conn.read_parquet("events/*.parquet")
result = (
    events
    .filter("event_type = 'purchase'")
    .aggregate("user_id, sum(amount) AS total", "user_id")
    .order("total DESC")
    .limit(100)
)
result.show()
```

---

## Node.js Integration

```typescript
import Database from 'duckdb';
import { promisify } from 'util';

const db = new Database(':memory:');  // or 'analytics.duckdb'
const conn = db.connect();
const all = promisify(conn.all.bind(conn));

// Query Parquet from Node.js
const rows = await all(`
    SELECT user_id, count(*) AS events
    FROM read_parquet('./data/events.parquet')
    GROUP BY user_id
    ORDER BY events DESC
    LIMIT 10
`);

console.log(rows);
db.close();
```

---

## dbt Integration

DuckDB is the recommended backend for local dbt development and CI pipelines.

### profiles.yml

```yaml
analytics:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: "analytics.duckdb"
      threads: 4
    ci:
      type: duckdb
      path: ":memory:"   # ephemeral for CI, fastest possible
      threads: 2
```

### Install

```bash
pip install dbt-duckdb
dbt debug   # verify connection
dbt build   # run models + tests
```

### dbt model reading external Parquet

```sql
-- models/staging/stg_events.sql
-- dbt-duckdb can reference external files directly
{{ config(materialized='view') }}

SELECT *
FROM read_parquet('{{ env_var("DATA_PATH") }}/events/*.parquet')
```

### Incremental model with DuckDB

```sql
-- models/marts/fct_daily_active_users.sql
{{ config(
    materialized='incremental',
    unique_key='day',
    incremental_strategy='delete+insert'
) }}

SELECT
    date_trunc('day', event_time) AS day,
    count(DISTINCT user_id)       AS dau
FROM {{ ref('stg_events') }}
{% if is_incremental() %}
WHERE event_time >= (SELECT max(day) FROM {{ this }})
{% endif %}
GROUP BY 1
```

---

## Dagster Integration

```python
# assets/duckdb_assets.py
from dagster import asset, AssetExecutionContext
from dagster_duckdb import DuckDBResource
import pandas as pd

@asset(
    group_name="analytics",
    required_resource_keys={"duckdb"},
)
def daily_active_users(context: AssetExecutionContext, duckdb: DuckDBResource) -> None:
    with duckdb.get_connection() as conn:
        conn.execute("""
            CREATE OR REPLACE TABLE dau AS
            SELECT date_trunc('day', event_time) AS day,
                   count(DISTINCT user_id)       AS dau
            FROM read_parquet('/data/events/*.parquet')
            GROUP BY 1
        """)
        count = conn.execute("SELECT count(*) FROM dau").fetchone()[0]
        context.log.info(f"Computed DAU for {count} days")

# resources (definitions.py)
from dagster_duckdb import DuckDBResource

duckdb_resource = DuckDBResource(database="analytics.duckdb")
```

---

## Performance Tuning

### Threading and memory

```python
import duckdb

conn = duckdb.connect()

# Use all cores for large queries (default: all)
conn.execute("SET threads = 8")

# Cap memory usage (default: 80% of RAM)
conn.execute("SET memory_limit = '4GB'")

# Temp directory for spill-to-disk on large joins
conn.execute("SET temp_directory = '/tmp/duckdb'")
```

### Persistent database for repeated queries

```python
# Create a persistent database from Parquet once
conn = duckdb.connect("analytics.duckdb")
conn.execute("""
    CREATE TABLE IF NOT EXISTS events AS
    SELECT * FROM read_parquet('s3://bucket/events/*.parquet')
""")

# Index frequently filtered columns
conn.execute("CREATE INDEX IF NOT EXISTS idx_user ON events(user_id)")
```

### Export to Parquet (efficient handoff)

```python
conn.execute("""
    COPY (
        SELECT * FROM events WHERE event_date >= '2026-01-01'
    )
    TO 'recent_events.parquet'
    (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
""")
```

---

## Common Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Importing CSV into DuckDB before querying | Unnecessary step | Use `read_csv()` directly |
| Using DuckDB for OLTP (many small writes) | Not optimized for row-level updates | Use PostgreSQL for transactional data |
| Single-threaded queries on large files | Slow | DuckDB uses all cores by default — don't force `SET threads = 1` |
| Storing DuckDB file in tmpfs/ramdisk | Data loss on restart | Use persistent path for anything not ephemeral |
| Running DuckDB as a server for multiple writers | DuckDB is single-writer | Use Postgres for multi-process write access |

---

## Related

- [data-engineering](../data-engineering/SKILL.md) — dbt + Dagster pipeline orchestration
- [postgres-patterns](../postgres-patterns/SKILL.md) — transactional database patterns
- [analytics-workflow](../analytics-workflow/SKILL.md) — dashboards and product metrics on top of these pipelines
