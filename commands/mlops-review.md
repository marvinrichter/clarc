---
description: MLOps audit — experiment tracking, model registry, serving SLOs, drift detection, retraining pipelines, A/B testing readiness. Invokes the mlops-architect agent.
---

# MLOps Review

This command runs a comprehensive audit of an ML system's operational maturity across the full MLOps lifecycle.

## What This Command Does

1. **Experiment Tracking** — Are all training runs logged and reproducible?
2. **Model Registry** — Is versioning, lineage, and promotion workflow in place?
3. **Serving** — Are latency SLOs defined and GPU utilization monitored?
4. **Monitoring** — Is drift detection active with automated alerts?
5. **Retraining** — Is there an automated trigger and pipeline?
6. **A/B Testing** — Can new models be rolled out safely without user impact?
7. **Data Quality** — Is input validation happening before inference?

## When to Use

Use `/mlops-review` when:
- Deploying an ML model to production for the first time
- Evaluating an existing ML system for operational gaps
- Before migrating a model from a different serving framework
- When model accuracy has degraded in production
- Planning a fine-tuning or retraining project
- During an engineering health check or MLOps maturity assessment

## Review Process

### Step 0 — Delegate to mlops-architect Agent

**Invoke the `mlops-architect` agent** to perform the MLOps maturity review.

Pass `$ARGUMENTS` (path, model name, or system description) to the agent. The agent will:
- Audit experiment tracking, model registry, serving SLOs, and drift detection
- Assess retraining pipelines, A/B testing capability, and data quality checks
- Produce a prioritized CRITICAL/HIGH/MEDIUM findings report with MLOps maturity score

> For a targeted audit (e.g., drift detection only), Step 0 alone may be sufficient. Continue to the Review Checklist for a full manual deep scan.

---

## Review Checklist

### 1. Experiment Tracking

| Check | Tool | Severity if missing |
|-------|------|---------------------|
| All training runs logged (params, metrics, artifacts) | MLflow / W&B | HIGH |
| Experiments reproducible from logged config | DVC + MLflow | HIGH |
| Hyperparameter search tracked | Optuna / Ray Tune + W&B | MEDIUM |
| Model artifact saved with input signature | MLflow `infer_signature` | MEDIUM |

```bash
# Check if MLflow is configured
grep -r "mlflow\|wandb\|comet" requirements.txt pyproject.toml || echo "MISSING: no tracking library found"

# Check if tracking URI is set
grep -r "set_tracking_uri\|MLFLOW_TRACKING_URI" src/ .env.example
```

### 2. Model Registry

| Check | Expected | Severity if missing |
|-------|----------|---------------------|
| Models registered with semantic versions | `model:v1.2.0` | MEDIUM |
| Lineage metadata (training run, dataset version) | Tags on model version | HIGH |
| Staging → Production promotion workflow | MLflow stages or aliases | HIGH |
| Model cards with intended use, limitations | README in registry | MEDIUM |

```python
# Audit registered models
from mlflow.tracking import MlflowClient

client = MlflowClient()
for model in client.search_registered_models():
    versions = client.get_latest_versions(model.name, stages=["Production"])
    for v in versions:
        tags = client.get_model_version(model.name, v.version).tags
        if "training_dataset" not in tags:
            print(f"MISSING lineage: {model.name} v{v.version}")
```

### 3. Model Serving

| Check | Expected | Severity if missing |
|-------|----------|---------------------|
| Latency SLO defined (p50, p95, p99) | `< 100ms p95` | HIGH |
| GPU utilization monitored | DCGM Exporter + Grafana | HIGH |
| Health endpoint implemented | `/v2/health/ready` | CRITICAL |
| Graceful shutdown with in-flight request draining | SIGTERM handler | HIGH |
| Horizontal scaling configured | HPA or KEDA | MEDIUM |

```bash
# Check serving framework
ls -la model_repository/ triton_models/ bentoml_models/ 2>/dev/null

# Check if latency metrics are exported
grep -r "prediction_latency\|inference_time\|DCGM" src/ k8s/ monitoring/

# vLLM: check active config
cat serving_config.yaml | grep -E "tensor_parallel|max_model_len|gpu_memory"
```

### 4. Drift Detection & Monitoring

| Check | Expected | Severity if missing |
|-------|----------|---------------------|
| Data drift detection active | Evidently AI / WhyLogs | HIGH |
| Model performance monitoring | Accuracy/F1 on ground truth | CRITICAL |
| Alerts configured for degradation | PagerDuty / Slack via Prometheus | HIGH |
| Ground truth collection pipeline | Labels from user feedback/labels | HIGH |
| Dashboard for model KPIs | Grafana | MEDIUM |

```python
# Check if drift monitoring exists
import os
drift_files = [
    "monitoring/drift_detection.py",
    "scripts/monitor_drift.py",
    "airflow/dags/drift_monitoring.py",
]
for f in drift_files:
    if os.path.exists(f):
        print(f"Found: {f}")
        break
else:
    print("MISSING: No drift detection script found")
```

### 5. Retraining Pipeline

| Check | Expected | Severity if missing |
|-------|----------|---------------------|
| Automated retraining trigger exists | Drift alert / cron / data threshold | HIGH |
| Pipeline is reproducible | Kubeflow / Airflow / Prefect DAG | HIGH |
| Evaluation gate before promotion | Accuracy threshold check | CRITICAL |
| Data versioning with DVC | `dvc.yaml` + remote | HIGH |
| Rollback procedure documented | Runbook | MEDIUM |

```bash
# Look for pipeline definitions
ls -la kubeflow/ airflow/dags/ prefect/ .github/workflows/ | grep -i "retrain\|train\|pipeline"

# Check DVC setup
ls .dvc/ dvc.yaml dvc.lock 2>/dev/null || echo "MISSING: DVC not configured"
```

### 6. A/B Testing Capability

| Check | Expected | Severity if missing |
|-------|----------|---------------------|
| Traffic splitting infrastructure | Istio / nginx / feature flags | HIGH |
| Shadow mode tested | Challenger receives but doesn't return | HIGH |
| Statistical significance framework | p-value / Bayesian testing | MEDIUM |
| Business metric integration | CTR, conversion alongside ML metrics | MEDIUM |

### 7. Data Quality (Input Validation)

| Check | Expected | Severity if missing |
|-------|----------|---------------------|
| Schema validation before inference | Pydantic / Great Expectations | HIGH |
| Out-of-distribution detection | Statistical bounds on features | MEDIUM |
| Missing feature handling | Imputation or rejection | HIGH |
| Prediction logging for ground truth | Feature store / event log | HIGH |

## Severity Levels

| Severity | Condition | Action |
|----------|-----------|--------|
| CRITICAL | No health endpoint; no evaluation gate before production promotion | Fix before any deployment |
| HIGH | Missing drift detection; no retraining trigger; no latency SLO | Fix within sprint |
| MEDIUM | No model card; no A/B testing; missing lineage | Backlog with priority |
| LOW | Dashboard improvements; nice-to-have tooling | Opportunistic |

## Output Report Format

```
MLOps Review Report
===================
System: fraud-detection-model
Date: 2026-03-08

CRITICAL (0 issues)
HIGH (2 issues)
  - [DRIFT] No drift detection configured for input features
  - [RETRAIN] No automated retraining trigger found

MEDIUM (1 issue)
  - [LINEAGE] Training dataset not tagged in model registry

Recommendations:
  1. Add Evidently AI report to monitoring/ directory
  2. Configure Prometheus alert → Kubeflow pipeline webhook
  3. Tag model versions with DVC dataset hash

MLOps Maturity Score: 3/7 (Defined)
Next step: reach Measured (5/7) by addressing HIGH issues
```

## Maturity Levels

| Score | Level | Description |
|-------|-------|-------------|
| 1–2 | Initial | Manual, ad-hoc processes |
| 3–4 | Defined | Documented, some automation |
| 5–6 | Measured | Monitored, data-driven decisions |
| 7 | Optimizing | Fully automated with continuous improvement |

## Related

- Agent: `agents/mlops-architect.md`
- Skill: `skills/mlops-patterns/`
- Skill: `skills/eval-harness/` — offline and production evaluation
- Skill: `skills/observability/` — metrics and alerting setup
- Command: `/slo` — define model latency SLOs

## After This

- `/tdd` — add tests for ML pipeline components
- `/slo` — define model serving SLOs
