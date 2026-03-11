---
description: Zero-Trust security review for a service — mTLS enforcement, SPIFFE identity, NetworkPolicies, Authorization Policies, east-west traffic, and secret handling.
---

# Zero-Trust Review

Performs a comprehensive Zero-Trust security review of a Kubernetes service or namespace.

## What This Command Does

1. **Service Identity** — verify SPIFFE SVID or Kubernetes Service Account configuration
2. **mTLS Enforcement** — check `PeerAuthentication` mode (STRICT vs PERMISSIVE)
3. **Authorization Policies** — validate default-deny + explicit allowlist pattern
4. **NetworkPolicies** — confirm namespace isolation and egress controls
5. **Secret Handling** — detect secrets in env vars / k8s Secrets vs Vault/ESO
6. **East-West Traffic** — find any remaining plain HTTP between services
7. **Observability** — confirm mTLS telemetry is captured

## When to Use

Use `/zero-trust-review` when:
- Onboarding a new service to a service mesh (Istio, Linkerd)
- Migrating from PERMISSIVE to STRICT mTLS mode
- Adding a new namespace or cluster
- Security audit of inter-service communication
- Reviewing NetworkPolicy configurations
- Pre-production security gate

## Review Process

### Step 1 — Service Identity

```bash
# Check if SPIRE is running
kubectl get pods -n spire

# Verify SVID registration for the service
kubectl exec -n spire spire-server-0 -- \
  /opt/spire/bin/spire-server entry show \
  -spiffeID spiffe://prod.example.com/ns/NAMESPACE/sa/SERVICE_ACCOUNT

# Check Service Account used by the pod
kubectl get pod POD_NAME -o jsonpath='{.spec.serviceAccountName}'

# Verify token audience binding (projected volumes)
kubectl get pod POD_NAME -o jsonpath='{.spec.volumes[*].projected}'
```

### Step 2 — mTLS Enforcement

```bash
# Check PeerAuthentication in namespace
kubectl get peerauthentication -n NAMESPACE -o yaml

# Verify mode is STRICT (not PERMISSIVE)
kubectl get peerauthentication -n NAMESPACE -o jsonpath='{.items[*].spec.mtls.mode}'

# For Linkerd: verify mTLS edges
linkerd viz edges deployment -n NAMESPACE

# Check Istio proxy logs for TLS handshake
kubectl logs POD_NAME -c istio-proxy | grep -i "tls\|mtls\|handshake" | tail -20
```

### Step 3 — Authorization Policies

```bash
# List all authorization policies
kubectl get authorizationpolicy -n NAMESPACE -o yaml

# Check for deny-all baseline policy
kubectl get authorizationpolicy deny-all -n NAMESPACE

# Verify each policy uses principals (SPIFFE-based) not just labels
kubectl get authorizationpolicy -n NAMESPACE -o jsonpath='{.items[*].spec.rules[*].from[*].source}'
```

### Step 4 — NetworkPolicies

```bash
# List NetworkPolicies
kubectl get networkpolicy -n NAMESPACE -o yaml

# Verify default-deny-all exists
kubectl get networkpolicy default-deny-all -n NAMESPACE

# Check egress rules — should NOT allow 0.0.0.0/0
kubectl get networkpolicy -n NAMESPACE -o jsonpath='{.items[*].spec.egress}'

# For Cilium: check Layer-7 policies
kubectl get ciliumnetworkpolicy -n NAMESPACE -o yaml
```

### Step 5 — Secret Handling

```bash
# CRITICAL: Find secrets mounted as environment variables
kubectl get pods -n NAMESPACE -o json | \
  jq '.items[].spec.containers[].env[]? | select(.valueFrom.secretKeyRef != null) | .name'

# Find secrets from k8s Secret (env-based — should be replaced with Vault/ESO)
kubectl get pods -n NAMESPACE -o json | \
  jq '.items[].spec.containers[].envFrom[]? | select(.secretRef != null)'

# Check if Vault Agent or ESO is in use
kubectl get pods -n NAMESPACE -o json | jq '.items[].spec.initContainers[].name'
kubectl get externalsecrets -n NAMESPACE

# Check deployment files for hardcoded secrets (CRITICAL)
grep -r "password\|secret\|token\|key" k8s/ --include="*.yaml" | \
  grep -v "secretKeyRef\|secretRef\|ExternalSecret\|vault"
```

### Step 6 — East-West Plain HTTP

```bash
# Istio: find connections NOT using mTLS
kubectl exec -n istio-system prometheus-POD -- \
  curl -s 'http://localhost:9090/api/v1/query?query=istio_requests_total{connection_security_policy="none"}' | \
  jq '.data.result[] | {source: .metric.source_workload, dest: .metric.destination_workload}'

# Check for services with port named "http" (signals plain HTTP intent)
kubectl get services -n NAMESPACE -o json | \
  jq '.items[] | select(.spec.ports[].name == "http") | .metadata.name'

# Linkerd: find unencrypted connections
linkerd viz edges deployment -n NAMESPACE | grep -v "√"
```

### Step 7 — Observability

```bash
# Verify Istio metrics are flowing
kubectl exec -n monitoring prometheus-POD -- \
  curl -s 'http://localhost:9090/api/v1/query?query=istio_requests_total' | \
  jq '.data.result | length'

# Check Jaeger for traces
kubectl port-forward -n istio-system svc/tracing 16686:80
# Then open http://localhost:16686

# Verify access logs are enabled
kubectl get meshconfig -n istio-system istio -o jsonpath='{.spec.accessLogFile}'
```

## Review Categories

### CRITICAL (Block Deployment)

- PERMISSIVE mTLS in production — any service can bypass encryption
- No `PeerAuthentication` resource — mTLS not configured at all
- No `deny-all` `AuthorizationPolicy` — default allow-all posture
- Secrets stored as plain environment variables or k8s Secret env refs
- No NetworkPolicy — no Layer-3/4 isolation between services
- Any service accepting plain HTTP connections when mesh is active

### HIGH (Fix Before Merge)

- `PeerAuthentication` at PERMISSIVE (acceptable in migration only, with timeline)
- Authorization policies using pod labels instead of SPIFFE principals
- `NetworkPolicy` missing default-deny (partial allowlist but no baseline deny)
- Service Account tokens with no audience binding (long-lived, wide-scope)
- Egress not restricted — pod can reach any external endpoint

### MEDIUM (Address in Next Sprint)

- No SPIRE workload registration (relying only on Kubernetes RBAC identity)
- Missing observability — mTLS telemetry not captured
- Certificates with long expiry (>90 days) without auto-rotation
- Cross-namespace traffic not verified (namespace-level isolation assumed)

## Approval Criteria

| Status | Condition |
|--------|-----------|
| Approve | No CRITICAL or HIGH issues — STRICT mTLS, deny-all + allowlist, no env-var secrets |
| Warn | Only MEDIUM issues — acceptable with documented remediation plan |
| Block | Any CRITICAL issue — deployment must not proceed |

## Migration Guide: PERMISSIVE → STRICT

```bash
# 1. Start in PERMISSIVE — verify all services are enrolled in mesh
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments
spec:
  mtls:
    mode: PERMISSIVE
EOF

# 2. Verify all traffic shows as mTLS in Kiali/Prometheus
# 3. Check no plain-HTTP traffic in access logs for 48h
# 4. Switch to STRICT
kubectl patch peerauthentication default -n payments \
  --type=json -p='[{"op":"replace","path":"/spec/mtls/mode","value":"STRICT"}]'

# 5. Watch for 503s — plain-HTTP callers will immediately fail
kubectl logs -n payments -l app=payment-processor -c istio-proxy --tail=100 | grep 503
```

## Related

- Skill: `skills/zero-trust-patterns/` — full reference for SPIFFE, Istio, Linkerd, NetworkPolicies
- Skill: `skills/kubernetes-patterns/` — base Kubernetes patterns
- Skill: `skills/devsecops-patterns/` — automated security scanning in CI
- Command: `/dep-audit` — dependency vulnerability scanning
- Agent: `agents/security-reviewer.md` — comprehensive security audit

## After This

- `/security-review` — full DevSecOps scan after zero-trust fixes
- `/tdd` — add policy tests for NetworkPolicy and AuthorizationPolicy
