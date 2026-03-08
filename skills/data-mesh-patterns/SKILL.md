---
name: data-mesh-patterns
description: Skill: Data Mesh Architecture Patterns
---
# Skill: Data Mesh Architecture Patterns

## When to Activate

- Organization has 5+ business domains each producing and consuming data
- Central data team is a bottleneck (teams wait weeks for new datasets)
- Data quality issues are blamed on central platform, not producing teams
- Designing a new data platform for a scaling engineering organization
- Migrating from centralized data warehouse to decentralized data products
- Implementing data contracts between producer and consumer teams
- Evaluating Delta Lake, Apache Iceberg, Trino, or OpenLineage

---

## Data Mesh Principles (Zhamak Dehghani)

### 1. Domain Ownership

Each business domain team owns, operates, and is accountable for their data products — end to end.

```
Traditional (centralized):
Business Domain → Events/DB → Central ETL Team → Data Warehouse → Consumers

Data Mesh (decentralized):
Business Domain → Events/DB → Domain Team builds & operates Data Product → Consumers
         ↑                                                          ↑
     produces data                                        accesses via well-defined interface
```

### 2. Data as a Product

Data products have the same rigor as software products: SLOs, documentation, versioning, and ownership.

```yaml
# data-product-spec.yaml — Data Product "Customer Orders"
name: customer-orders
domain: orders
owner: orders-engineering@company.com
version: "2.1.0"

description: >
  All completed customer orders since 2020-01-01.
  Refreshed hourly from the orders database.

slo:
  freshness: 1h        # data is never older than 1 hour
  completeness: 99.9%  # < 0.1% missing order records
  accuracy: 99.99%     # financial amounts accurate to 2 decimal places

output_ports:
  - type: sql
    endpoint: trino://data-platform.internal/orders/customer_orders
    format: Delta Lake table
  - type: api
    endpoint: https://data-api.orders.internal/v2/customer-orders
    format: JSON (paginated)
  - type: stream
    endpoint: kafka://kafka.internal/orders.customer_orders.v2
    format: Avro (Schema Registry)

input_ports:
  - source: orders-db.public.orders
    refresh: streaming CDC (Debezium)
  - source: payments.payment_confirmed events
    refresh: Kafka stream

quality_checks:
  - tool: great_expectations
    suite: customer_orders_suite
    run: hourly
  - tool: soda
    checks: soda/orders/customer_orders.yml
    run: on_refresh

catalog:
  registered_in: DataHub
  tags: [pii, gdpr, financial]
  pii_columns: [customer_email, shipping_address, phone_number]
```

### 3. Self-Serve Data Infrastructure Platform

Central platform team provides primitives — domain teams consume via self-service.

```
Platform Team provides:
├── Compute: Spark clusters on demand (Databricks / EMR)
├── Storage: Delta Lake / Iceberg tables on S3/GCS
├── Catalog: DataHub / OpenMetadata registration API
├── Monitoring: Quality dashboard (Great Expectations Data Docs)
├── Lineage: OpenLineage collector (Marquez)
└── Access: Fine-grained access control (Apache Ranger / Databricks Unity Catalog)

Domain Teams self-serve:
├── Provision new Delta Lake table (via IaC template)
├── Register data product in catalog (via CI pipeline)
├── Configure quality checks (via Great Expectations / Soda YAML)
└── Set up CDC from operational DB (via Debezium template)
```

### 4. Federated Computational Governance

Central standards + domain-level implementation.

```
Global standards (enforced by platform):
- All PII columns tagged and access-controlled
- Data retention policies enforced (7 years for financial, 1 year for behavioral)
- Schema changes are backward-compatible or versioned (v2/)
- All data products registered in catalog before consumers can access them

Domain autonomy:
- Technology stack within data domain (Delta Lake or Iceberg — domain's choice)
- Schema design within standards
- SLO definition (must meet minimums, can exceed)
- Refresh cadence (must meet freshness SLO)
```

---

## Data Product Design

### Input / Output Ports Pattern

```python
# Domain: Orders
# Data Product: customer-orders

# Input port: CDC from orders database via Debezium
# Config in Debezium connector
{
  "name": "orders-postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "orders-db.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.dbname": "orders",
    "table.include.list": "public.orders,public.order_items",
    "topic.prefix": "orders.cdc",
    "slot.name": "debezium_slot"
  }
}

# Output port: Delta Lake table written by Spark streaming job
from pyspark.sql import SparkSession
from delta import DeltaTable

spark = SparkSession.builder \
    .appName("customer-orders-data-product") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

# Read from CDC stream (Kafka)
orders_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka.internal:9092") \
    .option("subscribe", "orders.cdc.public.orders") \
    .option("startingOffsets", "latest") \
    .load()

# Write to Delta Lake (output port)
orders_stream \
    .writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "s3://data-platform/checkpoints/customer-orders") \
    .trigger(processingTime="5 minutes") \
    .toTable("orders.customer_orders")
```

---

## Data Quality with Great Expectations

```python
# great_expectations/expectations/customer_orders_suite.py
import great_expectations as gx

context = gx.get_context()

# Define expectations for the customer_orders data product
suite = context.add_expectation_suite("customer_orders_suite")

# Completeness: no null order_ids
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id")
)

# Accuracy: amounts are positive
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeBetween(
        column="total_amount",
        min_value=0.01,
        max_value=1_000_000,
    )
)

# Freshness: most recent order should be within 2 hours
suite.add_expectation(
    gx.expectations.ExpectColumnMaxToBeBetween(
        column="created_at",
        min_value="now() - interval '2 hours'",
    )
)

# Validity: status is a known value
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeInSet(
        column="status",
        value_set=["pending", "confirmed", "shipped", "delivered", "cancelled"],
    )
)

# Uniqueness: no duplicate orders
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
)

# Referential integrity: all customers exist
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToMatchRegex(
        column="customer_id",
        regex=r"^cust-[a-f0-9]{8}$",  # UUID-based customer ID format
    )
)
```

### Great Expectations CI Integration

```yaml
# .github/workflows/data-quality.yml
name: Data Quality Gate
on:
  push:
    paths:
      - "data-products/orders/**"

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Great Expectations
        run: |
          pip install great-expectations
          great_expectations checkpoint run customer_orders_checkpoint
        env:
          GE_DATASOURCE_URL: ${{ secrets.DELTA_LAKE_URL }}
```

---

## Data Quality with Soda

```yaml
# soda/orders/customer_orders.yml
checks for customer_orders:
  # Freshness SLO
  - freshness(created_at) < 1h

  # Completeness
  - missing_count(order_id) = 0
  - missing_count(customer_id) = 0
  - missing_count(total_amount) = 0

  # Validity
  - invalid_count(status) = 0:
      valid values: [pending, confirmed, shipped, delivered, cancelled]

  # Accuracy
  - min(total_amount) >= 0.01
  - max(total_amount) <= 1000000

  # Volume anomaly detection
  - anomaly score for row_count < default

  # Schema change detection
  - schema:
      fail:
        when required column missing: [order_id, customer_id, total_amount, status, created_at]
        when wrong column type:
          total_amount: decimal
```

```bash
# Run Soda scan
soda scan \
  --datasource orders_delta_lake \
  --configuration soda/configuration.yml \
  soda/orders/customer_orders.yml
```

---

## Data Lakehouse: Delta Lake vs Apache Iceberg

### Delta Lake

```python
# Delta Lake: ACID transactions + time travel on S3/ADLS/GCS
from delta.tables import DeltaTable
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .getOrCreate()

# Write with ACID guarantees
df.write.format("delta").mode("overwrite").saveAsTable("orders.customer_orders")

# Merge (upsert) — safe for CDC patterns
delta_table = DeltaTable.forName(spark, "orders.customer_orders")
delta_table.alias("target").merge(
    updates.alias("source"),
    "target.order_id = source.order_id"
).whenMatchedUpdateAll() \
 .whenNotMatchedInsertAll() \
 .execute()

# Time travel — query historical data
spark.read \
    .format("delta") \
    .option("timestampAsOf", "2024-01-01") \
    .table("orders.customer_orders")

# Schema evolution — add a new column without rewriting
spark.sql("ALTER TABLE orders.customer_orders ADD COLUMN loyalty_points INT")

# Vacuum old versions (keep 7 days for time travel)
delta_table.vacuum(168)  # 168 hours = 7 days
```

### Apache Iceberg

```python
# Iceberg: multi-engine table format (Spark + Flink + Trino + DuckDB)
# Iceberg excels at: partition evolution, hidden partitioning, multi-engine access

# Spark with Iceberg catalog
spark = SparkSession.builder \
    .config("spark.sql.catalog.orders", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.orders.type", "rest") \
    .config("spark.sql.catalog.orders.uri", "http://iceberg-rest.internal") \
    .config("spark.sql.catalog.orders.warehouse", "s3://data-platform/iceberg") \
    .getOrCreate()

# Create table with hidden partitioning (no partition column visible to consumers)
spark.sql("""
  CREATE TABLE orders.customer_orders (
    order_id     STRING NOT NULL,
    customer_id  STRING NOT NULL,
    total_amount DECIMAL(18, 2),
    status       STRING,
    created_at   TIMESTAMP
  )
  USING iceberg
  PARTITIONED BY (days(created_at))  -- hidden partition, transparent to queries
""")

# Partition evolution — change partitioning without rewriting data
spark.sql("""
  ALTER TABLE orders.customer_orders
  REPLACE PARTITION FIELD days(created_at)
  WITH months(created_at)
""")

# Time travel
spark.read \
    .option("as-of-timestamp", "2024-01-01T00:00:00Z") \
    .table("orders.customer_orders")
```

### Delta Lake vs Iceberg Decision

| Feature | Delta Lake | Apache Iceberg |
|---------|:----------:|:--------------:|
| Primary engine | Spark / Databricks | Multi-engine (Spark, Flink, Trino, DuckDB) |
| Partition evolution | ⚠️ Full rewrite | ✅ In-place evolution |
| Hidden partitioning | ❌ | ✅ |
| Merge (upsert) | ✅ | ✅ |
| Time travel | ✅ | ✅ |
| Schema evolution | ✅ | ✅ |
| Databricks integration | ✅ Native | ⚠️ Via connector |
| Trino/Presto queries | ⚠️ Via connector | ✅ Native |
| Best for | Databricks-centric | Multi-engine / Trino |

---

## Federated Queries with Trino

Trino enables cross-domain queries without ETL — query Delta/Iceberg tables from any domain.

```sql
-- Query across domains without copying data
-- Orders domain table + Customers domain table
SELECT
  o.order_id,
  o.total_amount,
  c.country,
  c.customer_segment
FROM
  delta.orders.customer_orders o           -- Orders domain (Delta Lake)
  JOIN iceberg.customers.customer_profiles c  -- Customers domain (Iceberg)
    ON o.customer_id = c.customer_id
WHERE
  o.created_at >= CURRENT_DATE - INTERVAL '30' DAY
  AND o.status = 'delivered';
```

```yaml
# Trino catalog configuration
# etc/catalog/orders-delta.properties
connector.name=delta_lake
hive.metastore.uri=thrift://hive-metastore.orders.internal:9083
delta.native-reader.enabled=true

# etc/catalog/customers-iceberg.properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=http://iceberg-catalog.customers.internal
```

---

## Data Lineage with OpenLineage

```python
# Emit lineage events from Spark job (OpenLineage Spark integration)
from openlineage.client import OpenLineageClient, set_producer

# Configure in spark-defaults.conf:
# spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener
# spark.openlineage.transport.type=http
# spark.openlineage.transport.url=http://marquez.internal:5000
# spark.openlineage.namespace=orders

# Lineage is emitted automatically for all Spark jobs:
# - Input datasets (source tables, Kafka topics)
# - Output datasets (target tables)
# - Job metadata (duration, success/failure)
# - Column-level lineage (which columns flow to which outputs)
```

```bash
# Query lineage via Marquez API
curl http://marquez.internal:5000/api/v1/lineage?nodeId=dataset:orders:customer_orders

# Visualize in Marquez UI
open http://marquez.internal:3000
```

---

## Data Catalog with DataHub

```python
# Register a data product in DataHub via Python SDK
from datahub.emitter.mce_builder import make_dataset_urn
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    DatasetPropertiesClass,
    OwnershipClass,
    OwnerClass,
    OwnershipTypeClass,
)

emitter = DatahubRestEmitter(gms_server="http://datahub.internal:8080")

dataset_urn = make_dataset_urn(
    platform="delta-lake",
    name="orders.customer_orders",
    env="PROD",
)

# Set ownership
emitter.emit_mce(
    MetadataChangeEventClass(
        proposedSnapshot=DatasetSnapshotClass(
            urn=dataset_urn,
            aspects=[
                OwnershipClass(
                    owners=[
                        OwnerClass(
                            owner="urn:li:corpuser:orders-team",
                            type=OwnershipTypeClass.DATAOWNER,
                        )
                    ]
                ),
                DatasetPropertiesClass(
                    description="All completed customer orders since 2020. Refreshed hourly.",
                    customProperties={
                        "domain": "orders",
                        "slo_freshness": "1h",
                        "contains_pii": "true",
                        "data_product_spec": "https://github.com/company/data-products/blob/main/orders/customer-orders.yaml",
                    },
                ),
            ],
        )
    )
)
```

---

## Data Contracts — Cross-Domain Agreements

A data contract is a formal, version-controlled agreement between a data product producer and its consumers.

```yaml
# contracts/orders-to-finance/customer_orders_contract_v2.yaml
apiVersion: datacontract.com/v0.9
kind: DataContract

id: customer-orders-contract-v2
info:
  title: Customer Orders — Finance Consumer Contract
  version: 2.1.0
  owner: orders-engineering@company.com
  consumer: finance-analytics@company.com

servers:
  production:
    type: trino
    host: trino.internal
    catalog: delta
    schema: orders

models:
  customer_orders:
    description: Completed customer orders
    fields:
      order_id:
        type: string
        required: true
        unique: true
        pii: false
      total_amount:
        type: decimal(18, 2)
        required: true
        minimum: 0.01
      currency:
        type: string
        enum: [USD, EUR, GBP]
      created_at:
        type: timestamp
        required: true

quality:
  type: great-expectations
  specification: expectations/customer_orders_suite.json

terms:
  usage: Finance team may use this data for revenue reporting and forecasting
  limitations: Do not use customer_id to join with PII data from other domains without DPA approval
  billing_plan: internal
```

### Schema Evolution Rules

```
BACKWARD COMPATIBLE (no version bump required):
- Adding a new NULLABLE column
- Adding new values to an ENUM that doesn't have exhaustive validation
- Adding a new output port

BREAKING CHANGE (require v2/ new version):
- Removing a column
- Renaming a column
- Changing a column type
- Removing enum values
- Changing SLO to stricter value (e.g., freshness 1h → 30min)
```

---

## Migration: Monolith → Data Mesh (Strangler Fig)

```
Phase 1: Identify domains
  - Map data assets to business domains
  - Identify highest-value + highest-pain data products first
  - Assign ownership (which team is accountable for which data?)

Phase 2: Extract first domain (e.g., Orders)
  - Orders team takes ownership of their data product
  - Set up Delta Lake table, Great Expectations checks, DataHub registration
  - Central team remains available as consultant (not owner)
  - Validate: other teams can access Orders data via Trino without calling Orders team

Phase 3: Expand
  - Repeat for each domain (Customers, Payments, Catalog, etc.)
  - Central team shifts from data owner to platform owner
  - Platform provides: storage, compute, catalog, monitoring templates

Phase 4: Platform Self-Serve
  - Domain teams provision new data products via IaC templates without platform team involvement
  - Quality checks and lineage are automated in CI/CD
```

---

## When to Use Data Mesh (and When Not To)

### Use When

- 5+ business domains each producing significant data
- Central data team has a 2+ week backlog for new dataset requests
- Data quality issues are chronic and blamed across team boundaries
- Organization is moving toward domain-driven microservices architecture

### Do NOT Use When

- Small org (< 5 data domains) — centralized approach is simpler and cheaper
- Data team can scale to meet demand — unnecessary architectural complexity
- Data products don't have clear domain ownership — mesh becomes ungoverned chaos
- No budget for platform engineering — self-serve infrastructure requires investment

---

## Related Skills

- `data-engineering` — ETL/ELT pipelines, dbt, Spark — foundational data engineering
- `duckdb-patterns` — DuckDB for local/analytical queries within a domain's data product
- `event-driven-patterns` — Kafka for streaming input ports of data products
- `kubernetes-patterns` — deploying Spark, Trino, and data platform services on Kubernetes
- `observability` — monitoring data pipeline SLOs (freshness, completeness)
