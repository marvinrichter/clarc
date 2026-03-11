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

## Decision: When to Use Each Pattern

| Pattern | Use when | Rollback speed | Risk |
|---------|---------|----------------|------|
| Canary | New API logic, DB queries | Fast (abort in seconds) | Low |
| Blue/Green | Config changes, dependency upgrades | Instant (DNS/LB switch) | Medium |
| Feature flag | UI changes, A/B experiments | Instant (toggle off) | Very low |
| Rolling update | Stateless services, no schema change | Medium | Low |
