---
name: data-engineering
description: "Data engineering patterns: dbt for SQL transformation (models, tests, incremental), Dagster for orchestration (assets, jobs, sensors), data quality checks, warehouse patterns (BigQuery/Snowflake/Redshift), and modern data stack setup. Covers the ELT pipeline from raw ingestion to analytics-ready models."
origin: ECC
---

# Data Engineering

> **Scope**: Data pipeline design, transformation (dbt), and orchestration (Dagster).
> For analytics and dashboards built on top of these pipelines, see [analytics-workflow](../analytics-workflow/SKILL.md).
> For data warehouse query patterns, see [clickhouse-io](../clickhouse-io/SKILL.md) and [postgres-patterns](../postgres-patterns/SKILL.md).

## When to Activate

- Building an ELT pipeline (Extract → Load → Transform)
- Writing dbt models or tests
- Setting up Dagster assets, jobs, or sensors
- Designing incremental data processing (avoid full table scans)
- Adding data quality checks / anomaly detection
- Organizing a data warehouse with staging → intermediate → mart layers

---

## Modern Data Stack Overview

```
[Sources]          [Extract + Load]     [Transform]      [Serve]
Postgres DB   ──►  Fivetran / Airbyte ──► dbt models ──► BI Tool
Stripe API    ──►  Singer / custom   ──► dbt tests  ──► Jupyter
S3 events     ──►  batch / streaming ──► assertions ──► API
                        │
                   [Orchestration]
                   Dagster / Airflow
                   (schedule, monitor,
                    retry, alert)
```

---

## dbt Patterns

### Project structure

```
dbt_project/
├── models/
│   ├── staging/          # 1:1 with raw source tables, light cleaning only
│   │   ├── _stg_stripe.yml
│   │   └── stg_stripe__charges.sql
│   ├── intermediate/     # business logic, joins, business entity definitions
│   │   └── int_users_with_subscriptions.sql
│   └── marts/            # final analytics-ready tables (wide, denormalized)
│       ├── finance/
│       │   └── fct_revenue.sql
│       └── product/
│           └── fct_user_activity.sql
├── tests/
│   └── generic/          # custom generic tests
├── macros/
├── seeds/                # static CSVs committed to the repo
└── dbt_project.yml
```

### Staging model pattern

```sql
-- models/staging/stg_stripe__charges.sql
-- One staging model per source table. Rename, cast, clean only.
with source as (
    select * from {{ source('stripe', 'charges') }}
),

renamed as (
    select
        id                               as charge_id,
        customer                         as customer_id,
        amount / 100.0                   as amount_usd,   -- Stripe uses cents
        currency,
        status,
        paid                             as is_paid,
        refunded                         as is_refunded,
        failure_code,
        {{ convert_timezone('created') }} as charged_at    -- macro for TZ
    from source
    where _fivetran_deleted = false      -- respect soft deletes
)

select * from renamed
```

### Incremental model pattern

```sql
-- models/marts/fct_events.sql
{{
  config(
    materialized = 'incremental',
    unique_key   = 'event_id',
    incremental_strategy = 'merge',   -- or 'delete+insert' for Redshift
    on_schema_change = 'append_new_columns'
  )
}}

with source as (
    select * from {{ ref('stg_segment__tracks') }}

    {% if is_incremental() %}
    -- Process only new records on incremental runs
    where occurred_at > (select max(occurred_at) from {{ this }})
    {% endif %}
),

final as (
    select
        id           as event_id,
        user_id,
        event        as event_name,
        properties,
        occurred_at
    from source
)

select * from final
```

### dbt tests

```yaml
# models/marts/_schema.yml
models:
  - name: fct_revenue
    description: "One row per successful payment"
    columns:
      - name: payment_id
        tests:
          - unique
          - not_null
      - name: amount_usd
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
      - name: customer_id
        tests:
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: status
        tests:
          - accepted_values:
              values: ['succeeded', 'refunded', 'disputed']
```

### Custom singular test

```sql
-- tests/assert_no_negative_revenue.sql
-- Fails if any revenue is negative (catches refund calculation bugs)
select payment_id, amount_usd
from {{ ref('fct_revenue') }}
where amount_usd < 0
```

### Macros

```sql
-- macros/convert_timezone.sql
{% macro convert_timezone(column_name, target_tz='UTC') %}
    convert_timezone('UTC', '{{ target_tz }}', {{ column_name }}::timestamp)
{% endmacro %}

-- macros/generate_schema_name.sql (override default schema)
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
```

---

## Dagster Patterns

### Software-defined assets

```python
# assets/raw_data.py
from dagster import asset, AssetExecutionContext
import pandas as pd

@asset(
    group_name="raw",
    description="Raw Stripe charges from API",
    compute_kind="python",
    metadata={"owner": "data-team"},
)
def raw_stripe_charges(context: AssetExecutionContext) -> pd.DataFrame:
    import stripe
    charges = stripe.Charge.list(limit=100)
    df = pd.DataFrame([c.to_dict() for c in charges.auto_paging_iter()])
    context.log.info(f"Loaded {len(df)} charges")
    return df
```

### dbt + Dagster integration

```python
# assets/dbt_assets.py
from dagster_dbt import DbtCliResource, dbt_assets
from pathlib import Path

DBT_PROJECT_DIR = Path(__file__).parent.parent / "dbt_project"

@dbt_assets(manifest=DBT_PROJECT_DIR / "target" / "manifest.json")
def dbt_project_assets(context, dbt: DbtCliResource):
    yield from dbt.cli(["build"], context=context).stream()
```

### Sensor (trigger on new data)

```python
# sensors/new_file_sensor.py
from dagster import sensor, RunRequest, SensorEvaluationContext
import boto3

@sensor(job=process_file_job, minimum_interval_seconds=60)
def s3_new_file_sensor(context: SensorEvaluationContext):
    s3 = boto3.client('s3')
    objects = s3.list_objects_v2(Bucket='data-lake', Prefix='raw/')

    for obj in objects.get('Contents', []):
        key = obj['Key']
        # Only process files not seen before
        if key not in context.cursor.split(','):
            yield RunRequest(
                run_key=key,
                run_config={"ops": {"process_file": {"config": {"key": key}}}}
            )

    # Update cursor
    context.update_cursor(','.join([o['Key'] for o in objects.get('Contents', [])]))
```

### Partitioned assets (time-based)

```python
from dagster import asset, DailyPartitionsDefinition

daily_partitions = DailyPartitionsDefinition(start_date="2024-01-01")

@asset(
    partitions_def=daily_partitions,
    group_name="processed",
)
def daily_user_activity(context: AssetExecutionContext) -> pd.DataFrame:
    partition_date = context.partition_key  # "2024-01-15"
    # Process only data for this partition date
    ...
```

---

## Data Quality Patterns

### Great Expectations integration

```python
import great_expectations as gx

def validate_dataframe(df: pd.DataFrame, suite_name: str) -> bool:
    context = gx.get_context()
    validator = context.get_validator(
        batch_request=RuntimeBatchRequest(
            datasource_name="pandas_datasource",
            data_connector_name="runtime_data_connector",
            data_asset_name=suite_name,
            runtime_parameters={"batch_data": df},
            batch_identifiers={"run_id": "pipeline_run"},
        ),
        expectation_suite_name=suite_name,
    )

    validator.expect_column_values_to_not_be_null("user_id")
    validator.expect_column_values_to_be_between("amount_usd", min_value=0)
    validator.expect_column_pair_values_to_be_equal("email", "email_normalized")

    results = validator.validate()
    return results.success
```

### Anomaly detection (simple z-score)

```python
def check_row_count_anomaly(
    table: str, conn, lookback_days: int = 7, z_threshold: float = 3.0
) -> bool:
    """Alert if today's row count is > 3 standard deviations from the mean."""
    df = pd.read_sql(f"""
        select date_trunc('day', created_at) as day, count(*) as cnt
        from {table}
        where created_at >= now() - interval '{lookback_days} days'
        group by 1 order by 1
    """, conn)

    mean = df['cnt'].mean()
    std  = df['cnt'].std()
    today_cnt = df.iloc[-1]['cnt']

    z = (today_cnt - mean) / (std or 1)
    if abs(z) > z_threshold:
        print(f"ANOMALY: {table} today={today_cnt}, mean={mean:.0f}, z={z:.1f}")
        return False
    return True
```

---

## Warehouse Layer Conventions

| Layer | Prefix | Materialization | Purpose |
|-------|--------|----------------|---------|
| Staging | `stg_` | View | Raw source, renamed, cast |
| Intermediate | `int_` | Ephemeral or view | Business logic, joins |
| Fact tables | `fct_` | Table or incremental | Events, transactions |
| Dimension tables | `dim_` | Table | Entities (users, products) |
| Mart/report | (topic folder) | Table | Final analytics layer |

### Naming conventions

```
stg_<source>__<table>        # two underscores between source and table
int_<entity>_<transformation>
fct_<event_in_plural>        # fct_payments, fct_page_views
dim_<entity_in_plural>       # dim_users, dim_products
```

---

## Related

- [analytics-workflow](../analytics-workflow/SKILL.md) — dashboards and product metrics on top of these pipelines
- [database-migrations](../database-migrations/SKILL.md) — schema changes for source databases
- [clickhouse-io](../clickhouse-io/SKILL.md) — analytical query patterns
- [postgres-patterns](../postgres-patterns/SKILL.md) — source database patterns
