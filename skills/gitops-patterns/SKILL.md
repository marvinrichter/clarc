---
name: gitops-patterns
description: "GitOps patterns — ArgoCD and Flux setup, Kustomize overlays per environment, SealedSecrets/ESO for secrets, multi-cluster topology, GitOps repository patterns (mono-repo vs poly-repo), and common pitfalls."
---
# GitOps & Progressive Delivery

GitOps treats Git as the single source of truth for infrastructure and application state. Controllers continuously reconcile the desired state (in Git) with the actual state (in the cluster), eliminating manual `kubectl apply` in production.

## When to Activate

- Setting up ArgoCD or Flux for Kubernetes deployments
- Designing GitOps repository structure (mono-repo vs. config-repo)
- Configuring multi-cluster GitOps with ApplicationSets
- Managing secrets in a GitOps workflow (Sealed Secrets, External Secrets Operator)
- Migrating from imperative `kubectl` workflows to declarative GitOps
- Configuring drift detection and automated remediation

> For canary/blue-green deployments and automated rollback with Argo Rollouts — see skill `progressive-delivery`.

---

## GitOps Core Principles

Four principles from the OpenGitOps standard:

| Principle | Meaning |
|-----------|---------|
| **Declarative** | System state fully described in YAML/Helm/Kustomize — no "scripts that do things" |
| **Versioned & Immutable** | Git history is the audit log; every change is a commit |
| **Pulled Automatically** | Cluster pulls changes from Git (not CI pushes to cluster) |
| **Continuously Reconciled** | Controller loops compare desired vs. actual state, fix drift automatically |

---

## ArgoCD

### Application CRD

```yaml
# apps/my-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: my-team
  source:
    repoURL: https://github.com/myorg/config-repo
    targetRevision: main
    path: apps/my-app/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-prod
  syncPolicy:
    automated:          # Remove for manual sync in production
      prune: true       # Delete resources no longer in Git
      selfHeal: true    # Revert manual changes automatically
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
  revisionHistoryLimit: 10
```

### Sync Strategies

```yaml
# Manual sync (recommended for production)
syncPolicy: {}   # No automated block — requires manual Sync in UI or CLI

# Automated sync (good for dev/staging)
syncPolicy:
  automated:
    prune: true
    selfHeal: true

# Sync with resource hooks (e.g., run migrations before deploy)
syncPolicy:
  syncOptions:
    - RespectIgnoreDifferences=true
```

### App of Apps Pattern

One root Application manages all other Applications:

```yaml
# root-app.yaml — bootstraps the whole cluster
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  source:
    path: clusters/production/apps   # Directory of Application manifests
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### ApplicationSet — Dynamic App Generation

```yaml
# Generate one Application per directory in apps/
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/config-repo
        revision: main
        directories:
          - path: apps/*/overlays/production
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/config-repo
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### Health Checks

ArgoCD checks resource health automatically. Custom health checks for CRDs:

```lua
-- health-check.lua (in argocd-cm ConfigMap)
hs = {}
if obj.status ~= nil then
  if obj.status.phase == "Running" then
    hs.status = "Healthy"
    hs.message = "Running"
    return hs
  end
  if obj.status.phase == "Failed" then
    hs.status = "Degraded"
    hs.message = obj.status.message
    return hs
  end
end
hs.status = "Progressing"
hs.message = "Waiting for status"
return hs
```

### RBAC: Projects Isolate Teams

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: my-team
  namespace: argocd
spec:
  description: My Team applications
  sourceRepos:
    - 'https://github.com/myorg/*'
  destinations:
    - namespace: 'my-team-*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  roles:
    - name: developer
      description: Can sync apps but not delete
      policies:
        - p, proj:my-team:developer, applications, get, my-team/*, allow
        - p, proj:my-team:developer, applications, sync, my-team/*, allow
      groups:
        - my-team-developers
```

### Image Updater

Automatically commit new image tags to Git when a new image is pushed:

```yaml
# Annotation on ArgoCD Application
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: my-app=myorg/my-app
    argocd-image-updater.argoproj.io/my-app.update-strategy: semver
    argocd-image-updater.argoproj.io/my-app.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+$
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
```

---

## Flux

### Core Controllers

```yaml
# GitRepository — what to watch
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: config-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/config-repo
  ref:
    branch: main
  secretRef:
    name: flux-system   # SSH or HTTPS credentials

---
# Kustomization — what to apply
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: config-repo
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: my-app-prod
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
```

### HelmRelease

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      version: '>=1.14.0 <2.0.0'
      sourceRef:
        kind: HelmRepository
        name: jetstack
  values:
    installCRDs: true
    replicaCount: 2
  valuesFrom:
    - kind: ConfigMap
      name: cert-manager-values
```

### Flux Notification Controller

```yaml
# Alert to Slack on sync failure
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: slack-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
  summary: "Flux sync failure in production cluster"
```

### Flux vs. ArgoCD Decision Guide

| Criteria | Flux | ArgoCD |
|----------|------|--------|
| UI | None (CLI only) | Rich web UI |
| Multi-cluster | Via separate Flux instances | Built-in with ApplicationSet |
| Kubernetes-native feel | Yes (pure CRDs) | Yes but heavier |
| Helm support | Via HelmRelease CRD | Native, with live rendering |
| Complexity | Lower baseline | Higher, more features |
| Best for | Platform teams who prefer GitOps-native | Product teams who want UI |

---

## Kustomize in GitOps

### Repository Structure

```
config-repo/
├── base/
│   └── my-app/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml      # patches + resources
    │   └── replica-patch.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        ├── kustomization.yaml
        └── hpa-patch.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/my-app
namePrefix: prod-
nameSuffix: ""
commonLabels:
  environment: production
patches:
  - path: hpa-patch.yaml
images:
  - name: myorg/my-app
    newTag: v1.2.3   # Updated by CI or Image Updater
configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=warn
      - REPLICA_COUNT=5
```

---

## Secrets Management in GitOps

**NEVER** commit plaintext secrets to Git. Choose one:

### Option 1: Sealed Secrets (simple, self-contained)

```bash
# Encrypt a secret for the cluster's public key
kubeseal --fetch-cert --controller-namespace kube-system > pub-cert.pem
kubectl create secret generic my-secret \
  --from-literal=API_KEY=supersecret \
  --dry-run=client -o yaml | \
  kubeseal --cert pub-cert.pem -o yaml > sealed-secret.yaml
# Commit sealed-secret.yaml safely — only the cluster can decrypt
git add sealed-secret.yaml && git commit -m "feat: add sealed API key"
```

### Option 2: External Secrets Operator (ESO) — recommended for production

```yaml
# ExternalSecret — pulls from AWS Secrets Manager, Vault, etc.
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets          # Creates a native Kubernetes Secret
    creationPolicy: Owner
  data:
    - secretKey: API_KEY           # Key in the K8s Secret
      remoteRef:
        key: prod/my-app           # Path in Secrets Manager
        property: api_key
```

```yaml
# ClusterSecretStore — one per cluster, points to the secret backend
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: eu-west-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

---

## Multi-Cluster GitOps

### Hub-Spoke Architecture

```
Management Cluster (ArgoCD/Flux installed)
  ├── dev-cluster    (ApplicationSet target)
  ├── staging-cluster
  └── prod-cluster
```

```yaml
# ApplicationSet targeting all clusters in ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-all-clusters
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production   # Only prod clusters
  template:
    metadata:
      name: 'my-app-{{name}}'
    spec:
      project: default
      source:
        path: apps/my-app/overlays/production
      destination:
        server: '{{server}}'
        namespace: my-app
```

---

## GitOps Repository Patterns

### Option A: Mono-Repo (small teams)
```
repo/
├── src/           # Application code
├── k8s/
│   ├── base/
│   └── overlays/
└── .github/workflows/
    └── ci.yml     # Build image, update k8s/overlays/*/kustomization.yaml
```

### Option B: Separate Config Repo (recommended for teams)
```
app-repo/          # Source code + CI (builds image, opens PR to config-repo)
config-repo/       # Kubernetes manifests only — GitOps controller watches this
  ├── clusters/
  │   ├── dev/
  │   ├── staging/
  │   └── prod/
  └── apps/
      └── my-app/
          ├── base/
          └── overlays/
```

### CI → GitOps Bridge

```yaml
# In app-repo CI: after successful image build, update config-repo
- name: Update image tag in config-repo
  run: |
    git clone https://github.com/myorg/config-repo
    cd config-repo
    cd apps/my-app/overlays/staging
    kustomize edit set image myorg/my-app=myorg/my-app:${{ github.sha }}
    git config user.email "ci@myorg.com"
    git config user.name "CI Bot"
    git add -A
    git commit -m "chore: update my-app to ${{ github.sha }}"
    git push
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Manual `kubectl apply` bypasses GitOps | Enable `selfHeal: true` + RBAC to prevent direct cluster access |
| Secrets in Git | Use ESO or Sealed Secrets — never commit plaintext |
| All environments auto-sync | Production must require manual sync approval |
| No drift detection alerts | Configure ArgoCD Notifications / Flux Alerts |
| Helm values spread across repos | Keep values files in config-repo alongside the HelmRelease |
| Image tag drift | Use ArgoCD Image Updater or Flux Image Automation |
