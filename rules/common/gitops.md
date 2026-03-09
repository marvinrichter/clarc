# GitOps Rules

> Apply these rules to all projects deploying to Kubernetes or any container orchestration platform managed via GitOps.

## Core Mandates

- **NEVER** run `kubectl apply`, `kubectl delete`, or `helm install/upgrade` directly against production. Commit to Git and let the controller sync. Emergency exceptions must be committed within 24 hours.
- **All** Kubernetes manifests (Deployments, Services, Ingresses, ConfigMaps, CRDs, Namespaces, HelmReleases) must exist in a versioned Git repository.
- **No plaintext secrets** in any Git repository — use SealedSecrets, ESO, or Vault. Scan with `gitleaks` before every commit.
- **Kustomize overlays required** per environment (dev, staging, production). Shared base manifests must not contain environment-specific values.
- **Production sync must be manual** — never `automated` without explicit team approval.
- **Progressive delivery required** for production user-facing services (Argo Rollouts canary or blue/green). Plain `RollingUpdate` is not sufficient for >100 req/s.
- **Readiness and liveness probes required** on every Deployment/Rollout. Missing probes = Progressing forever in ArgoCD/Flux.
- **Drift alerts required** — sync failures and degraded health must be detected and alerted within 5 minutes.
- **RBAC scope** — each team's workloads in a separate ArgoCD Project or Flux Tenant. No direct `kubectl` access to production except platform/SRE.

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

> See skill `gitops-patterns` for ArgoCD, Flux, Argo Rollouts, secrets, and RBAC implementation examples.
> Review command: `/gitops-review` — automated checklist scan.
> Architecture agent: `gitops-architect` — designs GitOps setup for your organization.
