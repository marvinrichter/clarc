---
name: mlops-patterns
description: "MLOps lifecycle patterns — experiment tracking (MLflow/W&B), model registry, FastAPI serving with canary deployments, drift detection, fine-tuning workflows, retraining pipelines, DVC data versioning, and GPU autoscaling on Kubernetes."
---
# MLOps Patterns

## When to Activate

- Deploying ML models to production (vLLM, Triton, Ollama, BentoML)
- Setting up experiment tracking (MLflow, Weights & Biases)
- Implementing A/B testing or shadow deployments for models
- Adding drift detection and automated retraining pipelines
- Fine-tuning LLMs with LoRA/QLoRA
- Designing model registries with versioning and lineage
- Monitoring model performance in production

---

## MLOps Lifecycle

```
Data → Training → Evaluation → Registry → Serving → Monitoring → Retraining
         ↑                                                              |
         └──────────────────── Drift Alert ──────────────────────────┘
```

Key principle: **Daten sind Code, Modelle sind Artefakte, Drift ist ein Bug**

- Data versioning with DVC — treat datasets like source code
- Model artifacts stored in registry with full lineage
- Drift triggers automated retraining, just like a failing test triggers a fix

---

## Experiment Tracking

### MLflow

```python
import mlflow
import mlflow.sklearn

mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("fraud-detection-v2")

with mlflow.start_run(run_name="xgboost-baseline"):
    # Log hyperparameters
    mlflow.log_params({
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.1,
    })

    model = train_model(X_train, y_train)

    # Log metrics
    mlflow.log_metrics({
        "accuracy": 0.94,
        "f1_score": 0.91,
        "auc_roc": 0.97,
    })

    # Log model artifact with input schema
    signature = mlflow.models.infer_signature(X_train, model.predict(X_train))
    mlflow.sklearn.log_model(model, "model", signature=signature)

    # Log feature importance plot
    mlflow.log_artifact("feature_importance.png")
```

### Weights & Biases

```python
import wandb
wandb.init(project="text-classifier", config={"model": "bert-base-uncased", "epochs": 10, "lr": 2e-5})

for epoch in range(epochs):
    wandb.log({"epoch": epoch, "train/loss": train_one_epoch(model, loader),
               **evaluate(model, val_loader)})

artifact = wandb.Artifact("text-classifier", type="model")
artifact.add_file("model.bin")
wandb.log_artifact(artifact)
wandb.finish()
```

---

## Model Registry

### MLflow Model Registry

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register model from a run
model_uri = f"runs:/{run_id}/model"
registered = mlflow.register_model(model_uri, "fraud-detector")

# Transition to Staging for evaluation
client.transition_model_version_stage(
    name="fraud-detector",
    version=registered.version,
    stage="Staging",
)

# After validation, promote to Production
client.transition_model_version_stage(
    name="fraud-detector",
    version=registered.version,
    stage="Production",
    archive_existing_versions=True,  # retire old Production
)

# Load via alias — decoupled from version number
model = mlflow.pyfunc.load_model("models:/fraud-detector@champion")
```

### Versioning Strategy

Use semantic versioning for models:
- `MAJOR`: different architecture or incompatible input schema
- `MINOR`: same architecture, retrained on new data
- `PATCH`: hyperparameter tuning, same data

Lineage metadata: use `client.set_model_version_tag(name, version, key, value)` to record `training_dataset` (S3 URI), `training_run_id`, and `git_commit_sha` on each registered version.

---

## Model Serving

### vLLM — High-Throughput LLM Serving

vLLM uses **PagedAttention** for efficient KV-cache memory management with continuous batching.

```bash
# Single-GPU (OpenAI-compatible API on :8000)
vllm serve meta-llama/Llama-3.1-8B-Instruct --tensor-parallel-size 1 --served-model-name llama3-8b
# Multi-GPU / pipeline parallelism
vllm serve meta-llama/Llama-3.1-70B-Instruct --tensor-parallel-size 4 --pipeline-parallel-size 2
# 4-bit quantization (GPTQ/AWQ)
vllm serve TheBloke/Llama-2-13B-GPTQ --quantization gptq --dtype float16
```

Client: vLLM exposes an OpenAI-compatible API — use `openai.OpenAI(base_url="http://vllm-server:8000/v1", api_key="none")`.

**Kubernetes**: deploy as a `Deployment` with `resources.limits.nvidia.com/gpu: 1`, mount `HF_TOKEN` from a Secret, and pair with the HPA in the GPU Autoscaling section below.

### Triton Inference Server

NVIDIA Triton supports PyTorch, TensorFlow, ONNX, and TensorRT with server-side dynamic batching. Define `config.pbtxt` per model specifying `platform`, `max_batch_size`, input/output shapes, and `dynamic_batching`. Start with:

```bash
docker run --gpus all -p 8000:8000 -v /path/to/model_repository:/models \
  nvcr.io/nvidia/tritonserver:24.01-py3 tritonserver --model-repository=/models
```

### Ollama — Local / Private Deployment

```bash
ollama run llama3.2                  # interactive
ollama pull nomic-embed-text         # pull only
# Custom behavior via Modelfile: FROM llama3.2 + SYSTEM prompt + PARAMETER temperature 0.3
ollama create acmecorp-support -f Modelfile
```

REST API: `POST http://localhost:11434/api/chat` with `{"model": "llama3.2", "messages": [...], "stream": false}`.

### BentoML — Framework-Agnostic Serving

```python
import bentoml, numpy as np

bentoml.sklearn.save_model("fraud_classifier", trained_model)

@bentoml.service(resources={"cpu": "2", "memory": "2Gi"}, traffic={"timeout": 10})
class FraudDetectionService:
    model_ref = bentoml.models.get("fraud_classifier:latest")
    def __init__(self): self.model = self.model_ref.load_model()

    @bentoml.api
    def predict(self, features: np.ndarray) -> dict:
        score = self.model.predict_proba(features)[0][1]
        return {"fraud_probability": float(score), "is_fraud": score > 0.5}
# bentoml build && bentoml containerize fraud-detection:latest
```

---

## A/B Testing Models

### Traffic Splitting with Istio

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: model-serving
spec:
  hosts:
    - model-api
  http:
    - match:
        - uri:
            prefix: /predict
      route:
        - destination:
            host: model-v1
            port:
              number: 8080
          weight: 90    # Champion
        - destination:
            host: model-v2
            port:
              number: 8080
          weight: 10    # Challenger
```

### Shadow Mode (Zero User Impact)

In shadow mode the new model receives all requests but responses are discarded — useful for validating a new model without any user risk.

```python
import asyncio
import httpx

async def predict_with_shadow(payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        # Primary model — user sees this response
        champion_task = client.post("http://champion-model/predict", json=payload)

        # Shadow model — response logged but not returned to user
        challenger_task = client.post("http://challenger-model/predict", json=payload)

        champion_resp, challenger_resp = await asyncio.gather(
            champion_task, challenger_task, return_exceptions=True
        )

    # Log challenger result for offline comparison
    log_shadow_result(payload, champion_resp.json(), challenger_resp.json())

    return champion_resp.json()
```

Statistical significance: use a two-proportion z-test (`scipy.stats.norm`) comparing conversion rates. Require p < 0.05 before promoting the challenger. See skill `experiment-design` for the full implementation.

---

## Drift Detection

### Data Drift with Evidently AI

```python
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, DataQualityPreset

report = Report(metrics=[
    DataDriftPreset(),
    DataQualityPreset(),
])

report.run(
    reference_data=reference_df,   # training data distribution
    current_data=production_df,    # last 24h of production inputs
)

result = report.as_dict()
drift_detected = result["metrics"][0]["result"]["dataset_drift"]

if drift_detected:
    trigger_retraining_pipeline()
    send_alert("Data drift detected — retraining triggered")
```

### Model Performance Monitoring with Prometheus

```python
from prometheus_client import Histogram, Counter, Gauge

prediction_latency = Histogram(
    "model_prediction_latency_seconds",
    "Model inference latency",
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)
prediction_errors = Counter("model_prediction_errors_total", "Prediction errors")
model_accuracy = Gauge("model_accuracy_current", "Current rolling accuracy")

@app.post("/predict")
async def predict(request: PredictRequest):
    with prediction_latency.time():
        try:
            result = model.predict(request.features)
        except Exception as e:
            prediction_errors.inc()
            raise

    return result
```

Grafana alert: set threshold rule on `model_accuracy_current < 0.85`, notify `slack-ml-ops`.

### Drift Types

| Type | What changes | Detection | Action |
|------|-------------|-----------|--------|
| **Data Drift** | Input distribution | Kolmogorov-Smirnov / PSI | Retrain or add feature engineering |
| **Concept Drift** | Input→Output relationship | Model performance on labeled production data | Retrain with recent data |
| **Model Drift** | Prediction quality degrades | Accuracy/F1/AUC on ground truth | Retrain or roll back |

---

## Fine-Tuning Workflows

### LoRA / QLoRA with Hugging Face TRL

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

# QLoRA: 4-bit quantized base + LoRA adapters
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype="bfloat16",
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    quantization_config=bnb_config,
    device_map="auto",
)

lora_config = LoraConfig(
    r=16,                    # Rank — controls adapter size
    lora_alpha=32,           # Scaling factor
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# trainable params: 6,815,744 || all params: 8,037,601,280 || trainable%: 0.0848

trainer = SFTTrainer(
    model=model, tokenizer=tokenizer, train_dataset=dataset,
    args=SFTConfig(output_dir="./fine-tuned", num_train_epochs=3,
                   per_device_train_batch_size=4, gradient_accumulation_steps=4,
                   learning_rate=2e-4, fp16=True),
)
trainer.train()
model.save_pretrained("./lora-adapter")  # only adapter — typically < 100MB
```

### DPO — Direct Preference Optimization

Simpler alternative to RLHF for alignment. Dataset format: `{"prompt": ..., "chosen": ..., "rejected": ...}`.

```python
from trl import DPOTrainer, DPOConfig
dpo_trainer = DPOTrainer(
    model=model, ref_model=ref_model,  # ref_model = frozen base copy
    tokenizer=tokenizer, train_dataset=preference_dataset,
    args=DPOConfig(beta=0.1, max_length=1024, num_train_epochs=1),
)
dpo_trainer.train()
```

### Dataset Curation

Quality > Quantity — 10k high-quality samples often outperform 1M noisy ones. Key steps:
- **Deduplication**: MinHash LSH (`datasketch`) with ~0.85 similarity threshold
- **Quality filters**: min/max token length, language detection, newline-density check
- **Decontamination**: remove benchmark test sets from training data

---

## Retraining Pipelines

### Kubeflow Pipeline

```python
from kfp import dsl, compiler

@dsl.component(base_image="python:3.11", packages_to_install=["scikit-learn", "mlflow"])
def train_component(data_path: str, model_name: str) -> str: ...  # returns registered_version

@dsl.component(base_image="python:3.11")
def evaluate_component(model_version: str, threshold: float) -> bool: ...  # accuracy >= threshold

@dsl.component(base_image="python:3.11")
def promote_component(model_version: str, stage: str): ...  # MLflow registry → Production

@dsl.pipeline(name="fraud-retraining-pipeline")
def retraining_pipeline(data_path: str, accuracy_threshold: float = 0.90):
    train_task = train_component(data_path=data_path, model_name="fraud-detector")
    eval_task = evaluate_component(model_version=train_task.output, threshold=accuracy_threshold)
    with dsl.Condition(eval_task.output == True):
        promote_component(model_version=train_task.output, stage="Production")

compiler.Compiler().compile(retraining_pipeline, "retraining_pipeline.yaml")
```

### Retraining Triggers

| Trigger | Implementation | Use Case |
|---------|---------------|----------|
| **Time-based** | Cron job (weekly/monthly) | Stable domains |
| **Drift alert** | Evidently + webhook → Kubeflow | Dynamic domains |
| **Data threshold** | N new labeled samples → pipeline | Active learning |
| **Accuracy SLO** | Prometheus alert → trigger | Production monitoring |

Drift webhook: `POST /webhook/drift-detected` → `kfp.Client.create_run_from_pipeline_package("retraining_pipeline.yaml", arguments={"data_path": payload.new_data_path})`.

---

## Data Versioning with DVC

```bash
dvc init
dvc add data/train.parquet                         # pointer tracked in git
git add data/train.parquet.dvc .gitignore && git commit -m "chore: add training dataset v1"
dvc remote add -d s3remote s3://ml-data/dvc-cache
dvc push   # upload data to S3
dvc pull   # restore on another machine or in CI
```

DVC pipelines for reproducible training:

```yaml
# dvc.yaml
stages:
  preprocess:
    cmd: python src/preprocess.py
    deps:
      - data/raw.parquet
      - src/preprocess.py
    outs:
      - data/processed.parquet

  train:
    cmd: python src/train.py
    deps:
      - data/processed.parquet
      - src/train.py
    params:
      - params.yaml:
          - model.n_estimators
          - model.learning_rate
    outs:
      - models/model.pkl
    metrics:
      - metrics.json
```

---

## GPU Autoscaling on Kubernetes

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vllm-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-server
  minReplicas: 1
  maxReplicas: 8
  metrics:
    - type: External
      external:
        metric:
          name: DCGM_FI_DEV_GPU_UTIL    # NVIDIA DCGM Exporter metric
          selector:
            matchLabels:
              deployment: vllm-server
        target:
          type: AverageValue
          averageValue: "80"            # scale at 80% GPU utilization
```

---

## Related Skills

- `llm-app-patterns` — building applications on top of LLMs
- `eval-harness` — evaluating model quality (offline + production)
- `kubernetes-patterns` — GPU workload deployment
- `observability` — production monitoring setup
- `experiment-design` — statistical A/B testing methodology
