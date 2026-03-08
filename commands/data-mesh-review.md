---
description: Data Mesh architecture review — domain boundaries, data contracts, quality checks (Great Expectations/Soda), catalog registration, SLO definitions, PII governance, and cross-domain lineage.
---

# Data Mesh Review

Performs a comprehensive architecture and quality review of a Data Mesh implementation — from domain ownership to data product specs, quality checks, and governance.

## What This Command Does

1. **Domain Boundaries** — verify data products align with business domain ownership
2. **Data Contracts** — confirm formal contracts between producers and consumers
3. **Quality Checks** — validate Great Expectations / Soda configurations
4. **Catalog Registration** — verify all data products are discoverable in the catalog
5. **SLOs** — confirm freshness, completeness, and accuracy metrics are defined and measured
6. **PII Governance** — ensure PII columns are tagged, access-controlled, and retention-documented
7. **Lineage** — validate cross-domain data flow is tracked via OpenLineage/Marquez

## When to Use

Use `/data-mesh-review` when:
- Onboarding a new domain team to the data mesh
- Reviewing a new or updated data product before it goes live
- Auditing existing data products for governance compliance
- Pre-production review before a data product is made available to consumers
- Incident post-mortem involving data quality or freshness failures
- Regulatory compliance audit (GDPR, SOX, HIPAA for data)

## Review Process

### Step 1 — Domain Boundary Analysis

```bash
# Verify data products are organized by domain
ls data-products/
# Expected: data-products/orders/, data-products/customers/, data-products/payments/
# FAIL: data-products/all-orders-and-customers/ (cross-domain product = tight coupling)

# Check each data product has a spec file
find data-products/ -name "data-product-spec.yaml" -o -name "*.data-product.yaml"
# FAIL: no spec file → ownership, SLOs, and interface undefined

# Verify domain team ownership is documented
grep -r "owner\|team" data-products/*/data-product-spec.yaml
# Every data product must have a named owner team

# Check for cross-domain joins in data product ETL (anti-pattern: should use Trino at query time)
grep -r "JOIN.*\\..*customers\\..*\\..*orders" data-products/orders/ --include="*.py" --include="*.sql"
# FAIL: Orders domain joining Customer domain tables inside their pipeline
# PASS: Join happens at query layer (Trino) by consumers
```

### Step 2 — Data Contracts Review

```bash
# Check for contract files
find contracts/ data-products/*/contracts/ -name "*.yaml" -o -name "*.json" 2>/dev/null
# FAIL: No contracts directory — producer-consumer agreements are implicit

# Verify contract schema matches actual data product schema
# (compare contract fields against Delta Lake / Iceberg table schema)
python3 scripts/validate-contracts.py --contract contracts/orders-finance/ \
  --catalog trino://trino.internal/delta/orders

# Check contract version matches data product version
grep -r "version:" contracts/ data-products/*/data-product-spec.yaml | head -20

# Verify contracts are tested (consumer-side validation)
find . -path "*/tests/*" -name "*contract*" -o -name "*schema_test*"
# FAIL: No contract tests → breaking changes go undetected

# Validate schema evolution compliance
# Removing a required field = breaking change = needs new contract version
git diff HEAD~1 data-products/orders/schema/ | grep "^-" | grep -E "column|field"
# Manually review: are removed/renamed fields breaking for existing contracts?
```

### Step 3 — Quality Checks (Great Expectations / Soda)

```bash
# Verify quality checks exist for each data product
find data-products/ -name "*.json" -path "*/expectations/*" | wc -l  # GX
find data-products/ -name "*.yml" -path "*/soda/*" | wc -l           # Soda
# FAIL: 0 quality checks

# Run Great Expectations checkpoint (dry-run)
great_expectations checkpoint run orders_checkpoint --only-success-stats

# Run Soda scan and check for failures
soda scan \
  --datasource delta_orders \
  --configuration soda/configuration.yml \
  data-products/orders/soda/customer_orders.yml

# Check quality checks cover SLO dimensions:
# 1. Freshness: max(created_at) within freshness SLO
grep -r "freshness\|created_at\|max_value" data-products/orders/expectations/ data-products/orders/soda/
# FAIL: no freshness check

# 2. Completeness: required columns have no nulls
grep -r "not_be_null\|missing_count" data-products/orders/expectations/ data-products/orders/soda/

# 3. Accuracy: value ranges, enum validation
grep -r "be_between\|be_in_set\|invalid_count" data-products/orders/expectations/ data-products/orders/soda/

# 4. Uniqueness: primary key is unique
grep -r "be_unique\|duplicate_count" data-products/orders/expectations/ data-products/orders/soda/

# Verify quality checks run in CI (not just manually)
grep -r "great_expectations\|soda scan" .github/workflows/ --include="*.yml"
# FAIL: quality checks not automated
```

### Step 4 — Catalog Registration

```bash
# Check data product is registered in DataHub / OpenMetadata / Amundsen
curl http://datahub.internal:8080/api/v1/datasets \
  -H "Authorization: Bearer $DATAHUB_TOKEN" | \
  jq '.elements[] | select(.name | contains("customer_orders")) | .urn'
# FAIL: empty result → data product not discoverable

# Verify required metadata is present
curl http://datahub.internal:8080/api/gms/datasets/urn:li:dataset:\(...\) | \
  jq '{
    owner: .ownership.owners[0].owner,
    description: .datasetProperties.description,
    pii_tagged: (.schemaMetadata.fields[] | select(.glossaryTerms != null) | .fieldPath),
    custom_props: .datasetProperties.customProperties
  }'
# Required: owner, description, PII field tagging

# Verify tags include domain classification
# Expected tags: domain:orders, contains_pii:true, data_classification:confidential
```

### Step 5 — SLO Definitions

```bash
# Verify SLOs are defined in data product spec
grep -A 10 "slo:" data-products/*/data-product-spec.yaml
# Required: freshness, completeness, accuracy

# Verify SLOs are measurable (mapped to quality checks)
python3 scripts/validate-slo-coverage.py \
  --spec data-products/orders/data-product-spec.yaml \
  --expectations data-products/orders/expectations/

# Check SLO alerting is configured
grep -r "freshness\|slo" monitoring/ --include="*.yaml" --include="*.json" 2>/dev/null
# Expected: Prometheus/Grafana alerts for freshness SLO breaches

# Query actual SLO compliance (last 30 days)
curl "http://prometheus.internal/api/v1/query?query=\
  data_product_freshness_minutes{product='customer_orders'}" | \
  jq '.data.result[].value[1]'
# Compare against SLO threshold
```

### Step 6 — PII Governance

```bash
# Find PII columns in schema
grep -r "email\|phone\|address\|name\|ssn\|dob\|ip_address" \
  data-products/*/schema/ --include="*.yaml" --include="*.json"

# Verify PII columns are tagged in catalog
for product in data-products/*/; do
  echo "=== $product ==="
  grep -A 2 "pii_columns:" "$product/data-product-spec.yaml" 2>/dev/null || \
    echo "FAIL: No PII columns documented"
done

# Check access control on PII columns
# Databricks Unity Catalog: column-level masking
spark.sql("SHOW ROW FILTER ON TABLE orders.customer_orders")
spark.sql("SHOW COLUMN MASK ON TABLE orders.customer_orders COLUMN customer_email")

# Verify data retention policy is documented and enforced
grep -A 3 "retention" data-products/*/data-product-spec.yaml
# FAIL: no retention policy → GDPR/compliance risk

# Check RTBF (Right to Erasure) coverage
grep -r "erasure\|right_to_delete\|gdpr" data-products/ scripts/ --include="*.py" --include="*.yaml"
# FAIL: no erasure mechanism for PII data products
```

### Step 7 — Data Lineage

```bash
# Verify OpenLineage integration in Spark jobs
grep -r "openlineage\|OpenLineageSparkListener" data-products/ --include="*.py" --include="*.conf"
# FAIL: No lineage emitter configured

# Query lineage graph from Marquez
curl "http://marquez.internal:5000/api/v1/lineage?nodeId=dataset:orders:customer_orders" | \
  jq '{
    upstream_datasets: [.graph[].data | select(.type == "DATASET") | select(.id.name != "customer_orders") | .id.name],
    downstream_datasets: [.graph[].data | select(.type == "DATASET") | .id.name]
  }'

# Verify cross-domain lineage is traceable
# Example: Finance BI Report → Trino Query → Orders Data Product → Orders DB
curl "http://marquez.internal:5000/api/v1/datasets/orders.customer_orders/upstream" | \
  jq '.datasets[].name'

# Check for "dark" dependencies (consumers not in lineage)
# Dark consumers = teams querying data without formal contract + no lineage event
# Look in Trino query history for unauthorized cross-domain joins
trino --execute "SELECT user, query FROM system.runtime.queries WHERE query LIKE '%orders.customer_orders%' AND user NOT IN ('orders-service', 'finance-analytics')" \
  http://trino.internal
```

## Review Categories

### CRITICAL (Block Data Product Launch)

- No data quality checks configured — data product has no quality guarantee
- No owner documented — data product is ungoverned
- PII columns not tagged or access-controlled — GDPR/compliance violation
- No data contract for existing consumers — breaking changes go undetected
- Data product not registered in catalog — consumers cannot discover it

### HIGH (Fix Before Going Live)

- SLOs defined but not measurable (no quality checks implementing them)
- Freshness SLO missing — consumers cannot rely on data recency
- Data product joins other domain tables in its ETL (violates domain isolation)
- No data retention policy for PII data product
- Lineage not configured — impact analysis during incidents is impossible

### MEDIUM (Address Before Next Quarter)

- Schema evolution process not documented (risk of undocumented breaking changes)
- No automated alerting for SLO breaches
- RTBF (Right to Erasure) not implemented for PII data product
- Multiple data products owned by same team with no cross-team consumption path

## Approval Criteria

| Status | Condition |
|--------|-----------|
| Approve | No CRITICAL or HIGH issues — quality checks pass, catalog registered, PII governed, SLOs measurable |
| Warn | Only MEDIUM issues — data product can launch with documented remediation timeline |
| Block | Any CRITICAL issue — data product must not be made available to consumers |

## Related

- Skill: `skills/data-mesh-patterns/` — full Data Mesh reference (principles, tools, migration)
- Agent: `agents/data-architect.md` — design Data Mesh architecture from scratch
- Skill: `skills/data-engineering/` — ETL/ELT pipelines, dbt, Spark fundamentals
- Skill: `skills/gdpr-privacy/` — GDPR implementation patterns for PII in data pipelines
- Skill: `skills/observability/` — monitoring data pipeline SLOs
