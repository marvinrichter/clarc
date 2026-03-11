---
name: eval-harness
description: Formal evaluation framework for Claude Code sessions implementing eval-driven development (EDD) principles
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Eval Harness Skill

A formal evaluation framework for Claude Code sessions, implementing eval-driven development (EDD) principles.

## When to Activate

- Setting up eval-driven development (EDD) for AI-assisted workflows
- Defining pass/fail criteria for Claude Code task completion
- Measuring agent reliability with pass@k metrics
- Creating regression test suites for prompt or agent changes
- Benchmarking agent performance across model versions
- Designing a shadow evaluation pipeline to compare a new model against the production champion without user exposure
- Implementing an LLM-as-judge grader for open-ended outputs where deterministic grading is not feasible
- Setting up a delayed-label ground-truth pipeline for production ML systems

## Philosophy

Eval-Driven Development treats evals as the "unit tests of AI development":
- Define expected behavior BEFORE implementation
- Run evals continuously during development
- Track regressions with each change
- Use pass@k metrics for reliability measurement

## Eval Types

### Capability Evals
Test if Claude can do something it couldn't before:
```markdown
[CAPABILITY EVAL: feature-name]
Task: Description of what Claude should accomplish
Success Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
  - [ ] Criterion 3
Expected Output: Description of expected result
```

### Regression Evals
Ensure changes don't break existing functionality:
```markdown
[REGRESSION EVAL: feature-name]
Baseline: SHA or checkpoint name
Tests:
  - existing-test-1: PASS/FAIL
  - existing-test-2: PASS/FAIL
  - existing-test-3: PASS/FAIL
Result: X/Y passed (previously Y/Y)
```

## Grader Types

### 1. Code-Based Grader
Deterministic checks using code:
```bash
# Check if file contains expected pattern
grep -q "export function handleAuth" src/auth.ts && echo "PASS" || echo "FAIL"

# Check if tests pass
npm test -- --testPathPattern="auth" && echo "PASS" || echo "FAIL"

# Check if build succeeds
npm run build && echo "PASS" || echo "FAIL"
```

### 2. Model-Based Grader
Use Claude to evaluate open-ended outputs:
```markdown
[MODEL GRADER PROMPT]
Evaluate the following code change:
1. Does it solve the stated problem?
2. Is it well-structured?
3. Are edge cases handled?
4. Is error handling appropriate?

Score: 1-5 (1=poor, 5=excellent)
Reasoning: [explanation]
```

### 3. Human Grader
Flag for manual review:
```markdown
[HUMAN REVIEW REQUIRED]
Change: Description of what changed
Reason: Why human review is needed
Risk Level: LOW/MEDIUM/HIGH
```

## Metrics

### pass@k
"At least one success in k attempts"
- pass@1: First attempt success rate
- pass@3: Success within 3 attempts
- Typical target: pass@3 > 90%

### pass^k
"All k trials succeed"
- Higher bar for reliability
- pass^3: 3 consecutive successes
- Use for critical paths

## Eval Workflow

### 1. Define (Before Coding)
```markdown
## EVAL DEFINITION: feature-xyz

### Capability Evals
1. Can create new user account
2. Can validate email format
3. Can hash password securely

### Regression Evals
1. Existing login still works
2. Session management unchanged
3. Logout flow intact

### Success Metrics
- pass@3 > 90% for capability evals
- pass^3 = 100% for regression evals
```

### 2. Implement
Write code to pass the defined evals.

### 3. Evaluate
```bash
# Run capability evals
[Run each capability eval, record PASS/FAIL]

# Run regression evals
npm test -- --testPathPattern="existing"

# Generate report
```

### 4. Report
```markdown
EVAL REPORT: feature-xyz
========================

Capability Evals:
  create-user:     PASS (pass@1)
  validate-email:  PASS (pass@2)
  hash-password:   PASS (pass@1)
  Overall:         3/3 passed

Regression Evals:
  login-flow:      PASS
  session-mgmt:    PASS
  logout-flow:     PASS
  Overall:         3/3 passed

Metrics:
  pass@1: 67% (2/3)
  pass@3: 100% (3/3)

Status: READY FOR REVIEW
```

## Integration Patterns

### Pre-Implementation
```
/llm-eval define feature-name
```
Creates eval definition file at `.claude/evals/feature-name.md`

### During Implementation
```
/llm-eval check feature-name
```
Runs current evals and reports status

### Post-Implementation
```
/llm-eval report feature-name
```
Generates full eval report

## Eval Storage

Store evals in project:
```
.claude/
  evals/
    feature-xyz.md      # Eval definition
    feature-xyz.log     # Eval run history
    baseline.json       # Regression baselines
```

## Production Evaluation Patterns

### Shadow Eval — Zero-Risk Model Comparison

Run a new model on real production traffic without serving its responses to users. Shadow eval is the mandatory first step before any A/B test.

```python
import asyncio
import httpx
import json
from datetime import datetime

async def shadow_eval_predict(payload: dict, shadow_model_url: str) -> dict:
    """Route request to champion model; mirror to challenger for offline eval."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        champion_task = client.post("http://champion-model/predict", json=payload)
        challenger_task = client.post(shadow_model_url, json=payload)

        champion_resp, challenger_resp = await asyncio.gather(
            champion_task,
            challenger_task,
            return_exceptions=True,
        )

    # Log challenger result to eval store — never returned to user
    eval_record = {
        "timestamp": datetime.utcnow().isoformat(),
        "input": payload,
        "champion": champion_resp.json() if not isinstance(champion_resp, Exception) else None,
        "challenger": challenger_resp.json() if not isinstance(challenger_resp, Exception) else None,
        "challenger_error": str(challenger_resp) if isinstance(challenger_resp, Exception) else None,
    }
    await log_eval_record(eval_record)   # write to S3 / BigQuery / ClickHouse

    # Only champion response goes back to the user
    return champion_resp.json()
```

**Shadow Eval Decision Gate:**

After shadow period (typically 24–72 hours):
1. Compare output distributions (embedding similarity, label overlap)
2. Verify challenger latency p95 meets SLO
3. Check challenger error rate < 1%
4. If all pass → proceed to canary A/B test

### Online Metrics — Continuous Production Quality

Offline evals (accuracy on held-out set) are necessary but not sufficient. Online metrics measure real quality on live traffic.

**Metric Categories:**

| Category | Metric | Collection Method |
|----------|--------|-------------------|
| Infrastructure | p50/p95/p99 latency, error rate | Prometheus auto-instrumented |
| Model proxy | Confidence score distribution, output length | Custom Prometheus gauge |
| Business | CTR, conversion, user satisfaction | Event pipeline (Kafka / Segment) |
| Ground truth | Accuracy on labeled production samples | Delayed label pipeline |

```python
from prometheus_client import Histogram, Gauge, Counter
import numpy as np

# Track prediction confidence as a drift proxy
confidence_distribution = Histogram(
    "model_prediction_confidence",
    "Prediction confidence score distribution",
    buckets=[0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.99, 1.0],
    labelnames=["model_version"],
)

# Track output length for LLMs — proxy for quality/verbosity changes
output_token_count = Histogram(
    "model_output_tokens",
    "Number of output tokens per prediction",
    buckets=[32, 64, 128, 256, 512, 1024, 2048],
    labelnames=["model_version"],
)

# Rolling accuracy on labeled samples (updated by ground truth pipeline)
rolling_accuracy = Gauge(
    "model_rolling_accuracy",
    "Rolling accuracy on ground truth labels (last 1000 samples)",
    labelnames=["model_version"],
)

def record_prediction(output: dict, model_version: str):
    confidence = output.get("confidence", 1.0)
    tokens = output.get("token_count", 0)
    confidence_distribution.labels(model_version=model_version).observe(confidence)
    output_token_count.labels(model_version=model_version).observe(tokens)
```

**Delayed Label Pipeline** — collecting ground truth after the fact:

```python
# Example: recommendation system where click = positive label
# Prediction event → wait 30 min → join with click events → compute accuracy

class GroundTruthPipeline:
    def __init__(self, label_delay_minutes=30):
        self.label_delay = label_delay_minutes

    async def process_labels(self):
        """Join predictions with user behavior to compute ground truth accuracy."""
        cutoff = datetime.utcnow() - timedelta(minutes=self.label_delay)

        # Fetch predictions from the eval store
        predictions = await self.fetch_predictions(before=cutoff)

        # Fetch user behavior events (clicks, conversions)
        labels = await self.fetch_behavior_events(
            prediction_ids=[p["id"] for p in predictions]
        )

        # Compute accuracy and update Prometheus gauge
        accuracy = sum(
            1 for p in predictions
            if p["predicted_class"] == labels.get(p["id"], {}).get("actual_class")
        ) / max(len(predictions), 1)

        rolling_accuracy.labels(model_version="production").set(accuracy)

        # Trigger retraining if accuracy drops below threshold
        if accuracy < 0.85:
            await trigger_retraining_pipeline()
```

### LLM-as-Judge for Production Samples

When there is no ground truth label, use a judge model to evaluate a sample of production outputs.

```python
import anthropic
import random

client = anthropic.Anthropic()

JUDGE_PROMPT = """You are an expert evaluator assessing the quality of AI-generated responses.

Rate the following response on a scale of 1–5 for:
1. Accuracy — is the information correct?
2. Helpfulness — does it address the user's need?
3. Safety — does it avoid harmful content?

Input: {input}
Response: {response}

Respond with JSON only:
{{"accuracy": N, "helpfulness": N, "safety": N, "reasoning": "..."}}"""

async def llm_judge_sample(predictions: list[dict], sample_rate=0.05) -> dict:
    """Score a random sample of production predictions with an LLM judge."""
    sample = random.sample(predictions, max(1, int(len(predictions) * sample_rate)))
    scores = []

    for pred in sample:
        response = client.messages.create(
            model="claude-haiku-latest",   # use fast model for judge
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": JUDGE_PROMPT.format(
                    input=pred["input"],
                    response=pred["output"],
                ),
            }],
        )
        score = json.loads(response.content[0].text)
        scores.append(score)

    avg = {
        "accuracy": sum(s["accuracy"] for s in scores) / len(scores),
        "helpfulness": sum(s["helpfulness"] for s in scores) / len(scores),
        "safety": sum(s["safety"] for s in scores) / len(scores),
    }
    return avg
```

### Connecting Eval Harness to MLOps

The eval harness integrates directly into the MLOps retraining pipeline:

```
Offline Eval (eval-harness)          Production Eval (online metrics)
        ↓                                        ↓
  pass@k metrics                      Rolling accuracy + drift detection
        ↓                                        ↓
  Evaluation gate before deploy        Retraining trigger
        ↓                                        ↓
  Registry promotion                   Shadow eval → canary → full rollout
```

**Unified Quality Dashboard** (Grafana panels):
- Offline: latest eval score per model version (from MLflow)
- Online: rolling accuracy (from ground truth pipeline)
- Shadow: champion vs. challenger output distribution overlap
- Business: downstream KPIs (conversion, satisfaction)

## Best Practices

1. **Define evals BEFORE coding** - Forces clear thinking about success criteria
2. **Run evals frequently** - Catch regressions early
3. **Track pass@k over time** - Monitor reliability trends
4. **Use code graders when possible** - Deterministic > probabilistic
5. **Human review for security** - Never fully automate security checks
6. **Keep evals fast** - Slow evals don't get run
7. **Version evals with code** - Evals are first-class artifacts
8. **Shadow eval before canary** - Validate infrastructure before real user exposure
9. **Collect ground truth proactively** - Design delayed label pipelines from day one
10. **LLM-as-judge for open-ended outputs** - Use a fast judge model on production samples when ground truth is unavailable

## Example: Adding Authentication

```markdown
## EVAL: add-authentication

### Phase 1: Define (10 min)
Capability Evals:
- [ ] User can register with email/password
- [ ] User can login with valid credentials
- [ ] Invalid credentials rejected with proper error
- [ ] Sessions persist across page reloads
- [ ] Logout clears session

Regression Evals:
- [ ] Public routes still accessible
- [ ] API responses unchanged
- [ ] Database schema compatible

### Phase 2: Implement (varies)
[Write code]

### Phase 3: Evaluate
Run: /llm-eval check add-authentication

### Phase 4: Report
EVAL REPORT: add-authentication
==============================
Capability: 5/5 passed (pass@3: 100%)
Regression: 3/3 passed (pass^3: 100%)
Status: SHIP IT
```
