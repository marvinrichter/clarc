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
