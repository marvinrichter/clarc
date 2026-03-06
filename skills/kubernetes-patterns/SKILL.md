---
name: kubernetes-patterns
description: "Production Kubernetes patterns: Deployments, Services, Ingress, HPA, resource limits, health probes, ConfigMap/Secret management, Helm charts, namespaces, and IaC with Terraform/Pulumi. Prevents the most common k8s production failures."
---

# Kubernetes Patterns Skill

## When to Activate

- Deploying any containerized application to production
- Setting up a new k8s cluster or namespace
- Writing Helm charts for a service
- Configuring autoscaling, resource limits, or health checks
- Managing secrets and environment configuration in k8s
- Using Terraform or Pulumi to provision infrastructure

---

## Core Patterns

### 1. Deployment (always use, never naked Pods)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels:
    app: api
    version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0        # Zero-downtime: never kill before new is ready
      maxSurge: 1              # Spin up 1 extra during rollout
  template:
    metadata:
      labels:
        app: api
    spec:
      # Always set both requests AND limits
      containers:
        - name: api
          image: ghcr.io/org/api:1.0.0   # NEVER use :latest in production
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          # Liveness: is the process alive? (restart if fails)
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          # Readiness: is the process ready for traffic? (remove from LB if fails)
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
          # Startup: give slow apps time to boot before liveness kicks in
          startupProbe:
            httpGet:
              path: /health/live
              port: 3000
            failureThreshold: 30
            periodSeconds: 5
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets
      # Graceful shutdown: wait for in-flight requests
      terminationGracePeriodSeconds: 30
```

### 2. Service + Ingress

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP    # Never LoadBalancer directly; use Ingress

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
```

### 3. Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2         # Never 1 — single point of failure
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70    # Scale at 70% CPU
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 4. ConfigMap + Secrets (never hardcode)

```yaml
# configmap.yaml — non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

---
# secret.yaml — sensitive values (use External Secrets Operator in production)
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."   # Use External Secrets in real prod
  JWT_SECRET: "..."
```

> **Production pattern:** Use [External Secrets Operator](https://external-secrets.io) to sync secrets from AWS Secrets Manager, GCP Secret Manager, or Vault into k8s Secrets automatically.

### 5. Namespace Strategy

```bash
# Separate namespaces per environment (not per app)
kubectl create namespace production
kubectl create namespace staging
kubectl create namespace monitoring

# Set resource quotas per namespace
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "100"
EOF
```

---

## Helm Charts

```
charts/
  api/
    Chart.yaml
    values.yaml           # defaults
    values-staging.yaml   # staging overrides
    values-production.yaml
    templates/
      deployment.yaml
      service.yaml
      ingress.yaml
      hpa.yaml
      configmap.yaml
      _helpers.tpl
```

```yaml
# values.yaml
replicaCount: 2
image:
  repository: ghcr.io/org/api
  tag: latest          # overridden in CI with SHA
  pullPolicy: IfNotPresent
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
ingress:
  enabled: true
  host: api.example.com
  tls: true
```

```bash
# Deploy
helm upgrade --install api ./charts/api \
  --namespace production \
  --values charts/api/values-production.yaml \
  --set image.tag=$GIT_SHA \
  --wait --timeout 5m
```

---

## Terraform: Provision a Cluster (EKS example)

```hcl
# main.tf
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "production"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      instance_types = ["t3.medium"]

      # Spot for cost savings (use for stateless workloads)
      # capacity_type = "SPOT"
    }
  }
}

# Always use remote state
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "production/eks/terraform.tfstate"
    region = "eu-west-1"
  }
}
```

---

## Checklist

- [ ] No `:latest` image tags in production — use immutable SHA tags
- [ ] Both `requests` AND `limits` set on all containers
- [ ] `minReplicas` ≥ 2 for HPA (never single replica in prod)
- [ ] `maxUnavailable: 0` for zero-downtime rolling updates
- [ ] Liveness + Readiness + Startup probes on all containers
- [ ] Secrets sourced from external secret store (not hardcoded in k8s YAML)
- [ ] Namespaces with ResourceQuota to prevent runaway resource consumption
- [ ] `terminationGracePeriodSeconds` set to handle in-flight requests
- [ ] Helm chart with per-environment values files
- [ ] Terraform state stored remotely (S3 + DynamoDB lock)
