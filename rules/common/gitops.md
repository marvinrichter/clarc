# GitOps Rules

> Apply these rules to all projects deploying to Kubernetes or any container orchestration platform managed via GitOps.

## Core Mandates

### No Manual kubectl in Production (CRITICAL)

**NEVER** run `kubectl apply`, `kubectl delete`, or `helm install/upgrade` directly against production clusters.

```bash
# WRONG — bypasses GitOps, creates drift, no audit trail
kubectl apply -f deployment.yaml
helm upgrade my-app ./chart --set image.tag=v1.2.3

# CORRECT — commit to Git, let the controller sync
git add k8s/overlays/production/kustomization.yaml
git commit -m "chore: update my-app to v1.2.3"
git push
# ArgoCD/Flux detects the change and syncs automatically (or awaits manual sync)
```

**Emergency exception:** If the cluster is completely down and Git sync is impossible, document every manual command applied and create a Git commit to reflect the state within 24 hours.

### All Kubernetes Manifests in Git (CRITICAL)

Every resource running in the cluster must have a corresponding manifest in a versioned Git repository.

- Deployments, Services, Ingresses, ConfigMaps, CRDs — all in Git
- Namespace creation must be in Git (via ArgoCD `CreateNamespace=true` or explicit manifest)
- Helm releases tracked via `HelmRelease` CRD (Flux) or ArgoCD Application
- No "temporary" resources without a corresponding Git manifest

```bash
# Validate: nothing in cluster that isn't in Git
argocd app diff my-app
flux diff kustomization apps
```

### Secrets Never as Plaintext in Git (CRITICAL)

No API keys, passwords, tokens, certificates, or connection strings may appear as plaintext in any Git repository (public or private).

**Enforcement:**
```bash
# Pre-commit hook — add to .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

# Or run manually before any commit touching k8s/
gitleaks detect --source=k8s/ --verbose
```

**Allowed patterns:**
```yaml
# Reference a secret (not the value)
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: my-app-secrets     # Secret created by ESO or Sealed Secrets
        key: database_url

# SealedSecret (encrypted — safe to commit)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-app-secrets
spec:
  encryptedData:
    database_url: AgB3x...   # Encrypted ciphertext
```

---

## Environment Separation

### Kustomize Overlays Required

Each environment (dev, staging, production) must have its own Kustomize overlay or Helm values file. Shared base manifests must not contain environment-specific values.

```
apps/my-app/
├── base/           # Shared — no environment-specific values
│   ├── deployment.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/        # replicas: 1, resources: small
    ├── staging/    # replicas: 2, resources: medium
    └── production/ # replicas: 10, HPA, PodDisruptionBudget
```

### Sync Strategy per Environment

| Environment | Sync Mode | Prune | SelfHeal |
|-------------|-----------|-------|----------|
| dev | Automated | true | true |
| staging | Automated | true | true |
| production | **Manual only** | **manual** | false |

Production must **never** have `automated` sync enabled without explicit team agreement and approval gate.

---

## Progressive Delivery Required for Production

All production Deployments for user-facing services must use a progressive delivery strategy:

- **Canary** (preferred): Gradually shift traffic with automated analysis
- **Blue/Green**: Acceptable when instant rollback is the priority

A plain `Deployment` with `RollingUpdate` strategy is **not sufficient** for production services handling >100 req/s.

```yaml
# WRONG for high-traffic production services
kind: Deployment
spec:
  strategy:
    type: RollingUpdate

# CORRECT
kind: Rollout   # Argo Rollouts CRD
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - analysis:
            templates: [{templateName: http-success-rate}]
        - setWeight: 100
```

---

## Health Checks Must Be Defined

Every Deployment/Rollout must define both readiness and liveness probes:

```yaml
containers:
  - name: my-app
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 3
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
```

ArgoCD/Flux uses these probes to determine health status. Missing probes = Progressing forever.

---

## Drift Alerts Required

Configure notifications for sync failures and degraded health in all clusters:

```yaml
# ArgoCD — minimum required notification
trigger.on-sync-failed: |
  - when: app.status.operationState.phase in ['Error', 'Failed']
    send: [slack-alert]
trigger.on-health-degraded: |
  - when: app.status.health.status == 'Degraded'
    send: [slack-alert, pagerduty-alert]   # PagerDuty for production
```

Drift must be detected and alerted within **5 minutes**.

---

## RBAC Scope

- Each team's GitOps workloads must be in a separate ArgoCD **Project** or Flux **Tenant**
- Teams can sync and view only their own applications
- Direct `kubectl` access to production is restricted to the platform/SRE team
- All access changes must go through Git (Argo RBAC or Flux RBAC policies in Git)

---

## GitOps Checklist (before enabling a new application)

- [ ] All manifests committed to config-repo
- [ ] No plaintext secrets (scan with `gitleaks`)
- [ ] Kustomize overlays per environment
- [ ] Production set to manual sync
- [ ] Readiness and liveness probes defined
- [ ] Health status shows "Healthy" in ArgoCD/Flux
- [ ] Drift alert notification configured
- [ ] Progressive delivery (Rollout) configured for production
- [ ] RBAC: Application assigned to correct Project/Tenant
- [ ] Runbook updated: how to perform rollback via GitOps

---

**Reference skill:** `gitops-patterns` — detailed ArgoCD, Flux, Argo Rollouts, and secrets patterns.
**Review command:** `/gitops-review` — automated checklist scan of your GitOps configuration.
**Architecture agent:** `gitops-architect` — designs GitOps setup for your organization.
