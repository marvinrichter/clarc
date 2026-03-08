---
description: Review GitOps configuration for declarative correctness, sync strategy, secrets management, and progressive delivery readiness
---

# GitOps Review

Conduct a comprehensive GitOps configuration review for the project at: $ARGUMENTS

## Your Task

Systematically audit the GitOps configuration, Kubernetes manifests, and delivery infrastructure to ensure they follow GitOps best practices. Reference the `gitops-patterns` skill for detailed patterns.

---

## Review Checklist

### 1. Declarative State — Is Everything in Git?

- [ ] All Kubernetes manifests exist in a Git repository (no resources created manually)
- [ ] No undocumented `kubectl apply` or `helm install` commands in runbooks
- [ ] CI pipelines do not directly mutate the cluster (they commit to Git or create PRs)
- [ ] Infrastructure (Terraform/Pulumi) state is versioned and tracked
- [ ] Database migrations referenced in Git (not applied ad-hoc)

**How to check:**
```bash
# Compare live cluster state with Git
argocd app diff my-app --local ./apps/my-app
# or
flux diff kustomization my-app --path ./overlays/production
```

### 2. Sync Strategy — Correct per Environment?

- [ ] **Development**: Automated sync with `prune: true` and `selfHeal: true`
- [ ] **Staging**: Automated sync OR gated on CI passing
- [ ] **Production**: Manual sync only — no `automated` block, requires human approval
- [ ] Sync waves used correctly for resource ordering (e.g., CRDs before CRD instances)
- [ ] Pre-sync hooks for database migrations (Argo hooks or Flux pre-apply jobs)

**Red flags:**
```yaml
# DANGEROUS: Auto-sync in production without review
syncPolicy:
  automated:
    prune: true      # Will delete resources! Needs careful review
    selfHeal: true   # Reverts any manual fix you apply!
```

### 3. Health Checks — Are All Resources Monitored?

- [ ] Health checks defined for all custom CRDs
- [ ] Deployment health includes readiness probes (not just liveness)
- [ ] ArgoCD/Flux reports "Healthy" for all production apps
- [ ] Degraded/Progressing status triggers alerts
- [ ] Health check timeout configured (avoid infinite Progressing state)

### 4. Secrets Management — No Plaintext in Git

- [ ] `git grep` shows no API keys, passwords, or tokens
- [ ] All Kubernetes Secrets created via Sealed Secrets or External Secrets Operator
- [ ] Secret rotation process documented and tested
- [ ] Vault/AWS Secrets Manager/GCP Secret Manager integration configured (if applicable)
- [ ] `.gitignore` excludes `.env` files and generated secret manifests

**Scan for secrets:**
```bash
# Check Git history for potential secrets
gitleaks detect --source=. --verbose

# Check current manifests
grep -r "password\|secret\|api[_-]key\|token" k8s/ --include="*.yaml" \
  | grep -v "secretRef\|secretKeyRef\|SecretStore\|SealedSecret"
```

### 5. Progressive Delivery — Rollout Strategy Exists?

- [ ] Production deployments use Argo Rollouts or equivalent (not plain Deployment)
- [ ] Canary or Blue/Green strategy chosen and documented
- [ ] Analysis templates configured with real SLO metrics
- [ ] Automatic rollback triggers defined (error rate > X%, latency > Yms)
- [ ] Manual rollback procedure documented and tested

**Check rollout status:**
```bash
kubectl argo rollouts get rollout my-app -n production --watch
kubectl argo rollouts history rollout my-app -n production
```

### 6. Drift Detection — Is selfHeal + Alerting Configured?

- [ ] `selfHeal: true` enabled (or equivalent Flux `retryInterval`)
- [ ] Alerts configured for sync failures and degraded health
- [ ] Notification channels set up (Slack, PagerDuty, Teams)
- [ ] Drift detected within 5 minutes of occurrence
- [ ] Alert runbook linked in notification message

**ArgoCD Notification example:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [slack-message]
  template.slack-message: |
    message: |
      Application {{.app.metadata.name}} sync FAILED.
      Reason: {{.app.status.operationState.message}}
      URL: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}
```

### 7. RBAC — Teams Scoped to Their Apps?

- [ ] ArgoCD Projects defined per team (not all in `default`)
- [ ] Each team can only sync/delete their own applications
- [ ] Direct cluster access (kubectl) restricted to SRE/platform team
- [ ] SSO/OIDC configured for ArgoCD UI (no shared passwords)
- [ ] Audit log enabled (who synced what, when)

---

## Report Format

Provide a structured report:

### GitOps Maturity Score: X/7

| Area | Status | Issues |
|------|--------|--------|
| Declarative State | ✅/⚠️/❌ | ... |
| Sync Strategy | ✅/⚠️/❌ | ... |
| Health Checks | ✅/⚠️/❌ | ... |
| Secrets Management | ✅/⚠️/❌ | ... |
| Progressive Delivery | ✅/⚠️/❌ | ... |
| Drift Detection | ✅/⚠️/❌ | ... |
| RBAC | ✅/⚠️/❌ | ... |

### Critical Issues (Block Production Deployment)
- Issues where plaintext secrets, auto-sync in prod, or no RBAC found

### High Priority (Fix within 1 Sprint)
- Missing health checks, no drift alerts, no rollout strategy

### Recommendations (Improve over time)
- Maturity improvements, tooling suggestions

---

**Reference:** See `gitops-patterns` skill for implementation examples of all patterns above.
