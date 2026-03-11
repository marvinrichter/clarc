---
name: progressive-delivery
description: Argo Rollouts patterns for canary and blue/green deployments — traffic splitting, automated analysis with Prometheus metrics, rollback triggers, and GitOps integration.
---

# Progressive Delivery with Argo Rollouts

## When to Activate

- Deploying a new version of a service with traffic splitting (canary or blue/green)
- Configuring automated rollback based on error rate or latency metrics
- Integrating Argo Rollouts with an existing ArgoCD/Flux setup
- Replacing a plain Kubernetes Deployment with a progressive delivery strategy

> For ArgoCD/Flux setup, Kustomize overlays, secrets management, and GitOps repository patterns — see skill `gitops-patterns`.

### Canary Rollout

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10      # 10% traffic to new version
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: my-app-canary
        - setWeight: 25
        - pause: {duration: 10m}
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 100
      canaryService: my-app-canary
      stableService: my-app-stable
      trafficRouting:
        nginx:
          stableIngress: my-app-ingress
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:v1.2.3
```

### Blue/Green Rollout

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app-bluegreen
spec:
  replicas: 5
  strategy:
    blueGreen:
      activeService: my-app-active      # Production traffic
      previewService: my-app-preview    # New version preview
      autoPromotionEnabled: false        # Manual promotion in prod
      scaleDownDelaySeconds: 30         # Keep old version briefly after promotion
      prePromotionAnalysis:
        templates:
          - templateName: smoke-test
        args:
          - name: service-name
            value: my-app-preview
```

### Analysis Template (Prometheus Metrics)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 2m
      successCondition: result[0] >= 0.95   # 95% success rate required
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{
              service="{{args.service-name}}",
              status!~"5.."
            }[2m])) /
            sum(rate(http_requests_total{
              service="{{args.service-name}}"
            }[2m]))
    - name: latency-p99
      interval: 2m
      successCondition: result[0] <= 0.5   # p99 < 500ms
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99,
              rate(http_request_duration_seconds_bucket{
                service="{{args.service-name}}"
              }[2m])
            )
```

## Manual Promotion: Canary → Stable

```bash
# Argo Rollouts: promote canary manually after validating metrics
kubectl argo rollouts promote my-app

# Check current status before promoting
kubectl argo rollouts status my-app
# → "Paused at step 2 (weight: 20%)"
# → "SuccessfulSteps: 1/3, ErrorRate: 0.2%, Latency p99: 145ms"

# Abort and rollback if metrics are bad
kubectl argo rollouts abort my-app
```

## Rollback Scenario

Traffic pattern shows p99 latency spike after canary reaches 20%:

```bash
# 1. Detect: alert fires for p99 > 500ms on canary pods
# 2. Abort canary (routes 100% back to stable)
kubectl argo rollouts abort my-app

# 3. Verify rollback completed
kubectl argo rollouts status my-app
# → "Healthy (stable)"

# 4. Investigate: compare canary pod logs vs stable
kubectl logs -l app=my-app,rollout-pod-template-hash=<canary-hash> --tail=100
```

**Why this matters:** An aborted rollout is not a failed deploy — it's the safety system working. P99 spikes during canary often indicate N+1 queries or memory pressure that only manifests under real traffic.

## Rollout Lifecycle — Full Walkthrough

This example shows a complete canary rollout from creation to promotion, including an abort when metrics degrade.

```bash
# 1. Create rollout (update image tag in Git → ArgoCD syncs, or apply directly)
kubectl argo rollouts set image my-app my-app=myorg/my-app:v1.3.0

# 2. Watch rollout progress (opens live dashboard)
kubectl argo rollouts get rollout my-app --watch
# → Step 1/4 — Weight: 10%  ✔ AnalysisRun: Progressing

# 3. After 5-min pause, analysis runs automatically:
#    success-rate AnalysisRun checks Prometheus → result[0] = 0.98 (≥ 0.95) ✔
#    latency-p99  AnalysisRun checks Prometheus → result[0] = 0.21s (≤ 0.5s) ✔

# 4. Canary reaches 25% — health checks pass, ready to promote manually:
kubectl argo rollouts promote my-app
# → Promoted. Weight advancing: 25% → 50% → 100%

# --- Error spike scenario ---
# At 50% traffic, Prometheus shows error rate 0.08 (< 0.95 success threshold)
# AnalysisRun fails; Argo Rollouts auto-aborts and routes 100% back to stable

# 5. Abort manually if you detect the spike before auto-abort:
kubectl argo rollouts abort my-app
# → Aborting rollout... Scaling down canary pods

# 6. Verify stable version is fully serving:
kubectl argo rollouts status my-app
# → Degraded (aborted) — then → Healthy after scale-down completes

# 7. Check abort reason:
kubectl argo rollouts get rollout my-app
# → AnalysisRun: Failed  Metric: success-rate  Value: 0.08  (required ≥ 0.95)
```

**Why abort is safe:** `kubectl argo rollouts abort` immediately sets canary weight to 0% and routes all traffic to the stable ReplicaSet — no downtime for users.

---

## Decision: When to Use Each Pattern

| Pattern | Use when | Rollback speed | Risk |
|---------|---------|----------------|------|
| Canary | New API logic, DB queries | Fast (abort in seconds) | Low |
| Blue/Green | Config changes, dependency upgrades | Instant (DNS/LB switch) | Medium |
| Feature flag | UI changes, A/B experiments | Instant (toggle off) | Very low |
| Rolling update | Stateless services, no schema change | Medium | Low |
