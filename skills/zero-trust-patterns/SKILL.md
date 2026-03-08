---
name: zero-trust-patterns
description: Skill: Zero-Trust Patterns
---
# Skill: Zero-Trust Patterns

## When to Activate

- Designing service-to-service communication in Kubernetes or cloud environments
- Implementing mTLS between microservices
- Setting up SPIFFE/SPIRE for workload identity
- Configuring Istio or Linkerd service mesh
- Writing Kubernetes NetworkPolicies
- Reviewing east-west traffic security
- Building BeyondCorp-style access controls

---

## Core Principles (NIST SP 800-207)

Zero-Trust Architecture operates on four pillars:

1. **Never trust, always verify** — even traffic from within the private network is untrusted. Every connection requires authentication and authorization.
2. **Explicit verification** — identity + device + context checked at every request (not just at the perimeter).
3. **Least Privilege Access** — minimal rights, just enough to complete the task, scoped to the operation.
4. **Assume Breach** — design to minimize lateral movement when an attacker is already inside the network.

---

## Service Identity with SPIFFE/SPIRE

**SPIFFE** (Secure Production Identity Framework for Everyone) is the standard for cryptographic service identities.

### SVID Format

```
spiffe://trust-domain/path/to/workload
# Example:
spiffe://prod.example.com/ns/payments/sa/checkout-service
```

### SPIRE Server + Agent Setup

```yaml
# spire-server.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: spire-server
  namespace: spire
spec:
  replicas: 1
  selector:
    matchLabels:
      app: spire-server
  template:
    spec:
      containers:
        - name: spire-server
          image: ghcr.io/spiffe/spire-server:1.9.0
          args:
            - -config
            - /run/spire/config/server.conf
          volumeMounts:
            - name: spire-config
              mountPath: /run/spire/config
            - name: spire-data
              mountPath: /run/spire/data
```

```hcl
# server.conf
server {
  bind_address = "0.0.0.0"
  bind_port    = "8081"
  trust_domain = "prod.example.com"
  data_dir     = "/run/spire/data"
  log_level    = "INFO"

  # JWT SVIDs for service-to-service auth
  jwt_issuer = "https://spire-server.spire.svc.cluster.local"
}

plugins {
  DataStore "sql" {
    plugin_data {
      database_type = "sqlite3"
      connection_string = "/run/spire/data/datastore.sqlite3"
    }
  }

  NodeAttestor "k8s_psat" {
    plugin_data {
      clusters = {
        "my-cluster" = {
          service_account_allow_list = ["spire:spire-agent"]
        }
      }
    }
  }

  KeyManager "memory" {
    plugin_data {}
  }
}
```

### Workload Registration

```bash
# Register a workload (checkout-service in payments namespace)
kubectl exec -n spire spire-server-0 -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://prod.example.com/ns/payments/sa/checkout-service \
  -parentID spiffe://prod.example.com/k8s-node/node1 \
  -selector k8s:ns:payments \
  -selector k8s:sa:checkout-service
```

### Retrieving SVIDs from Workload API (Go)

```go
import (
    "github.com/spiffe/go-spiffe/v2/workloadapi"
    "github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig"
)

func newTLSConfig(ctx context.Context) (*tls.Config, error) {
    source, err := workloadapi.NewX509Source(ctx)
    if err != nil {
        return nil, fmt.Errorf("create x509 source: %w", err)
    }

    // TLS config that automatically rotates certificates
    return tlsconfig.MTLSClientConfig(source, source, tlsconfig.AuthorizeAny()), nil
}
```

---

## Istio Service Mesh

### Installation

```bash
# Install Istio with ambient mode (no sidecars, ztunnel at node level)
istioctl install --set profile=ambient

# Or with sidecar mode (traditional)
istioctl install --set profile=default

# Enable sidecar injection for a namespace
kubectl label namespace payments istio-injection=enabled
```

### Enforce Strict mTLS Namespace-Wide

```yaml
# peer-authentication.yaml — enforce mTLS for entire namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments
spec:
  mtls:
    mode: STRICT   # Reject all non-mTLS traffic. Never leave on PERMISSIVE in production.
```

### Authorization Policies (Default-Deny + Allowlist)

```yaml
# Step 1: Default deny ALL ingress in namespace
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: payments
spec: {}   # Empty spec = deny all

---
# Step 2: Explicitly allow checkout → payment-processor
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-checkout-to-processor
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-processor
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/payments/sa/checkout-service"  # SPIFFE-based identity
      to:
        - operation:
            methods: ["POST"]
            paths: ["/v1/payments"]
```

### Traffic Management

```yaml
# VirtualService: retry + timeout
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: payment-processor
  namespace: payments
spec:
  hosts:
    - payment-processor
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: gateway-error,connect-failure,retriable-4xx
      timeout: 10s
      route:
        - destination:
            host: payment-processor
```

### Observability (Zero-Code)

```bash
# Prometheus metrics auto-collected: request_total, request_duration_ms, etc.
# Jaeger traces: every request gets a trace ID automatically

# View live traffic between services
istioctl proxy-config log payment-processor-pod --level debug

# Kiali topology graph
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

---

## Linkerd (Lightweight Alternative)

Choose Linkerd over Istio for: smaller teams, simpler operational model, better performance, no CRD explosion.

```bash
# Install Linkerd
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Inject into deployment (or annotate namespace)
kubectl annotate namespace payments linkerd.io/inject=enabled

# Verify mTLS is working
linkerd viz tap deploy/checkout-service -n payments

# Traffic tap shows real-time encrypted traffic
linkerd viz edges deployment -n payments
```

```yaml
# Linkerd Server (equivalent to Istio AuthorizationPolicy)
apiVersion: policy.linkerd.io/v1beta3
kind: Server
metadata:
  name: payment-processor
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  port: 8080
  proxyProtocol: HTTP/2
---
apiVersion: policy.linkerd.io/v1beta3
kind: MeshTLSAuthentication
metadata:
  name: checkout-service-authn
  namespace: payments
spec:
  identities:
    - "checkout-service.payments.serviceaccount.identity.linkerd.cluster.local"
---
apiVersion: policy.linkerd.io/v1beta3
kind: AuthorizationPolicy
metadata:
  name: checkout-to-processor
  namespace: payments
spec:
  targetRef:
    group: policy.linkerd.io
    kind: Server
    name: payment-processor
  requiredAuthenticationRefs:
    - name: checkout-service-authn
      kind: MeshTLSAuthentication
      group: policy.linkerd.io
```

---

## Kubernetes NetworkPolicies

NetworkPolicies are the Layer-3/4 firewall — always use them even with a service mesh.

### Pattern: Default Deny All, then Allowlist

```yaml
# 1. Default deny all ingress AND egress in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}   # applies to ALL pods in namespace
  policyTypes:
    - Ingress
    - Egress
```

```yaml
# 2. Allow checkout → payment-processor on port 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-checkout-to-processor
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: checkout-service
      ports:
        - protocol: TCP
          port: 8080
```

```yaml
# 3. Allow DNS resolution (required for all pods)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Cilium — Layer-7 NetworkPolicies (HTTP-aware)

```yaml
# Block all HTTP except POST /v1/payments
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: l7-payment-processor
  namespace: payments
spec:
  endpointSelector:
    matchLabels:
      app: payment-processor
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: checkout-service
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: POST
                path: /v1/payments
```

---

## East-West Traffic Security

### Secrets: Never in Environment Variables

```yaml
# WRONG: Secret as environment variable
env:
  - name: DB_PASSWORD
    value: "supersecret"   # visible in pod spec, logs, ps aux

# WRONG: Even from k8s secret (still exposed as env var)
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: password
```

```yaml
# CORRECT: Vault Agent Sidecar (secrets never touch etcd)
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/agent-inject-secret-db: "secret/payments/db"
  vault.hashicorp.com/role: "checkout-service"
  vault.hashicorp.com/agent-inject-template-db: |
    {{- with secret "secret/payments/db" -}}
    DB_PASSWORD={{ .Data.data.password }}
    {{- end }}
```

```yaml
# CORRECT: External Secrets Operator (ESO) — syncs from AWS Secrets Manager / GCP Secret Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-secret
  namespace: payments
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: prod/payments/db
        property: password
```

### Kubernetes Token Volume Projection (Audience-Bound, Short-Lived)

```yaml
volumes:
  - name: vault-token
    projected:
      sources:
        - serviceAccountToken:
            audience: vault           # audience-bound, not usable for anything else
            expirationSeconds: 3600   # short-lived
            path: token
```

---

## Zero-Trust for APIs — BeyondCorp Pattern

```
User Request
     │
     ▼
Identity-Aware Proxy (IAP / Verified Access)
     │  checks:
     │  - Identity (Google/OIDC token)
     │  - Device trust (MDM-enrolled, cert-based)
     │  - Context (IP reputation, time of day)
     │
     ▼  [Allow or Deny]
Backend Service (no direct internet exposure)
```

### AWS Verified Access Example

```hcl
# Terraform: AWS Verified Access endpoint
resource "aws_verifiedaccess_endpoint" "internal_api" {
  verified_access_group_id = aws_verifiedaccess_group.main.id
  endpoint_type            = "load-balancer"
  attachment_type          = "vpc"

  load_balancer_options {
    load_balancer_arn = aws_lb.internal.arn
    port              = 443
    protocol          = "https"
    subnet_ids        = var.private_subnet_ids
  }

  security_group_ids = [aws_security_group.verified_access.id]
}

resource "aws_verifiedaccess_trust_provider" "oidc" {
  trust_provider_type = "user"
  user_trust_provider_type = "oidc"

  oidc_options {
    issuer                 = "https://accounts.google.com"
    authorization_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    token_endpoint         = "https://oauth2.googleapis.com/token"
    client_id              = var.oauth_client_id
    client_secret          = var.oauth_client_secret
    scope                  = "openid email"
  }
}
```

---

## Zero-Trust Checklist

Before deploying any new service:

- [ ] Service identity: SPIFFE SVID or Kubernetes Service Account Token with audience binding?
- [ ] mTLS: `PeerAuthentication` set to `STRICT` (not `PERMISSIVE`) in production?
- [ ] Authorization: `deny-all` policy exists, explicit allowlist for each route?
- [ ] NetworkPolicy: `default-deny-all` in namespace, per-service allowlist?
- [ ] Secrets: stored in Vault/ESO — not in env vars or k8s Secret mounted as env?
- [ ] Egress: only required external endpoints whitelisted?
- [ ] East-west: no plain HTTP between services in the mesh?
- [ ] Observability: mTLS telemetry visible in Prometheus/Jaeger/Kiali?

---

## Tool Reference

| Tool | Purpose |
|------|---------|
| `SPIRE` | SPIFFE reference implementation — workload identity |
| `Istio` | Full-featured service mesh — mTLS, traffic management, observability |
| `Linkerd` | Lightweight service mesh — simpler, better performance |
| `Cilium` | eBPF-based CNI — Layer-7 NetworkPolicies, identity-aware routing |
| `Vault` | Secret management — dynamic secrets, lease-based rotation |
| `External Secrets Operator` | Sync secrets from AWS/GCP/Azure into k8s |
| `OPA/Gatekeeper` | Policy enforcement — enforce Zero-Trust rules as admission webhooks |
| `cert-manager` | Automate certificate rotation for mTLS |

---

## Related Skills

- `kubernetes-patterns` — base k8s patterns (Deployments, Services, Ingress)
- `devsecops-patterns` — SAST/DAST/OPA policy automation
- `auth-patterns` — user authentication (JWT, OAuth2) — different from service identity
- `supply-chain-security` — SBOM, SLSA, Sigstore for artifact trust
