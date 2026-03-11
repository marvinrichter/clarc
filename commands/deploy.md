---
description: Guide deployment strategy selection and execution for any target environment.
---

# /deploy

Route to the right deployment pattern based on your target environment and strategy.

## Usage

```
/deploy                 — interactive deployment strategy guide
/deploy k8s             — Kubernetes deployment (blue-green, canary, rolling)
/deploy serverless      — serverless deployment (Lambda, Cloud Run, Vercel)
/deploy docker          — Docker Compose or Swarm deployment
/deploy rollback        — roll back a failed deployment
```

## Steps Claude Should Follow

### 1. Identify Target and Environment

If not specified via `$ARGUMENTS`, ask:
- Deployment target: Kubernetes, serverless (Lambda/Cloud Run/Vercel), Docker Compose, bare metal?
- Target environment: dev / staging / production?

### 2. Load the Right Skill

Load skill `deployment-patterns` for strategy selection and execution steps.
For pipeline setup, additionally load skill `ci-cd-patterns`.

### 3. Recommend Strategy by Target

| Target | Environment | Recommended Strategy |
|--------|-------------|----------------------|
| Kubernetes | production | Argo Rollouts canary (5% → 25% → 100%) |
| Kubernetes | staging | Rolling update |
| Serverless | production | Traffic splitting via weighted aliases/revisions |
| Serverless | staging | Direct deploy |
| Docker | production | Blue-green with nginx upstream switch |
| Docker | staging | Recreate or rolling update |

### 4. Pre-Deploy Readiness Check

Before executing, verify all of the following are in place:

- [ ] Readiness and liveness probes defined
- [ ] Rollback procedure documented (and tested)
- [ ] Monitoring alerts active for error rate and latency
- [ ] Environment variables validated at startup (fail-fast on misconfiguration)
- [ ] Health check endpoint responds correctly in the new build

If any item is missing, surface it and offer to add it before proceeding.

### 5. Execute or Guide

For automated targets: run the deployment commands step by step, showing output.
For manual targets: provide exact commands with explanations.

### 6. Post-Deploy Verification

After deployment completes:
1. Poll health endpoint until stable (or surface failures immediately)
2. Show rollback command in case a revert is needed
3. Recommend next steps from the list below

## Rollback (`/deploy rollback`)

1. Ask: which deployment to roll back (target, environment, previous version)?
2. Load skill `deployment-patterns` — Rollback Strategies section
3. Execute rollback for the identified target (kubectl rollout undo / previous Lambda version / nginx upstream swap)
4. Verify health after rollback

## After This

- `/resilience-review` — validate health checks and failure modes post-deploy
- `/add-observability` — ensure deploy metrics and alerts are in place
- `/slo` — define or update error budget after a new deployment
