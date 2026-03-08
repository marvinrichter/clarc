---
name: finops-patterns
description: Skill: FinOps & Cloud Cost Engineering
---
# Skill: FinOps & Cloud Cost Engineering

FinOps is the practice of bringing financial accountability to cloud spending. Engineering, Finance, and Business collaborate to understand and optimize cloud costs without sacrificing performance or speed.

## When to Activate

- Cloud costs are growing faster than engineering output
- No visibility into which team/service/feature drives cost
- Setting up Infracost in CI/CD pipelines for Terraform cost diffs
- Configuring OpenCost for Kubernetes cost attribution
- Designing a tagging taxonomy for cost allocation
- Rightsizing over-provisioned compute or storage
- Identifying and eliminating cloud waste (idle resources, orphaned disks)
- Preparing a FinOps audit or cost review presentation

---

## FinOps Framework (FinOps Foundation)

### Three Phases

```
Inform → Optimize → Operate

Inform:   Visibility — who spends what, where, why
Optimize: Rightsizing, reservations, waste elimination
Operate:  Continuous governance, anomaly detection, forecasting
```

### Shared Responsibility Model

| Role | Responsibility |
|------|---------------|
| Engineering | Architecting cost-efficient solutions, tagging resources, rightsizing |
| Finance | Budgeting, forecasting, chargeback to business units |
| Leadership | Setting targets, approving commitments (Reserved Instances, Savings Plans) |
| Platform/FinOps | Tooling, visibility dashboards, anomaly alerts |

### Unit Economics Metrics

```
Cost per Customer = Total Cloud Cost / Active Customers
Cost per Transaction = Total Cloud Cost / Monthly Transactions
Cost per Feature = Cloud Cost allocated to feature / Feature users

Track these in your observability dashboards alongside latency and error rate.
```

---

## Visibility & Attribution

### Tagging Taxonomy (Mandatory)

Define a consistent tagging standard before creating any new resource:

```hcl
# Terraform — enforce via locals + variable validation
locals {
  required_tags = {
    project     = var.project          # e.g., "payments-service"
    team        = var.team             # e.g., "platform-eng"
    environment = var.environment      # dev | staging | production
    service     = var.service          # e.g., "api-gateway"
    owner       = var.owner            # e.g., "jane.doe@company.com"
    cost-center = var.cost_center      # e.g., "CC-12345"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  tags          = merge(local.required_tags, var.extra_tags)
}
```

### Tag Enforcement

```hcl
# AWS Config Rule — enforce required tags
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"
  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }
  input_parameters = jsonencode({
    tag1Key = "project"
    tag2Key = "team"
    tag3Key = "environment"
    tag4Key = "owner"
  })
}
```

```yaml
# GCP Organization Policy — enforce labels
name: projects/my-project/policies/gcp.resourceLocations
spec:
  rules:
    - condition:
        expression: "resource.matchedTagValue('team') == ''"
      deny: {}
```

### Showback vs. Chargeback

| Model | Description | When to Use |
|-------|-------------|-------------|
| **Showback** | Show teams their costs informally | Early stage, build awareness |
| **Chargeback** | Allocate costs to team P&L | Mature FinOps, cost accountability needed |

---

## Infracost in CI/CD

Infracost estimates the monthly cost of Terraform changes and posts a diff to PRs.

### Setup

```bash
# Install Infracost
brew install infracost
infracost auth login

# Estimate cost for current Terraform config
infracost breakdown --path=.

# Generate diff against baseline (e.g., main branch)
infracost diff --path=. --compare-to=/tmp/infracost-base.json
```

### GitHub Actions Integration

```yaml
# .github/workflows/infracost.yml
name: Infracost

on:
  pull_request:
    paths:
      - '**/*.tf'
      - '**/*.tfvars'

jobs:
  infracost:
    name: Cost Estimate
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Generate base cost (main branch)
        run: |
          git fetch origin main
          git stash
          git checkout origin/main
          infracost breakdown --path=. \
            --format=json \
            --out-file=/tmp/infracost-base.json
          git checkout -

      - name: Generate PR cost diff
        run: |
          infracost diff \
            --path=. \
            --format=json \
            --compare-to=/tmp/infracost-base.json \
            --out-file=/tmp/infracost-diff.json

      - name: Post comment to PR
        run: |
          infracost comment github \
            --path=/tmp/infracost-diff.json \
            --repo=$GITHUB_REPOSITORY \
            --github-token=${{ secrets.GITHUB_TOKEN }} \
            --pull-request=${{ github.event.pull_request.number }} \
            --behavior=update

      - name: Fail if cost increase > 20%
        run: |
          PERCENT=$(infracost output \
            --path=/tmp/infracost-diff.json \
            --format=json | \
            jq '.diffTotalMonthlyCost / .pastTotalMonthlyCost * 100')
          if (( $(echo "$PERCENT > 20" | bc -l) )); then
            echo "Cost increase of $PERCENT% exceeds threshold!"
            exit 1
          fi
```

### Reading Infracost Output

```
Monthly cost estimate:
  aws_db_instance.main          $146.00/month (+$73.00 vs main)
  aws_instance.app[0]           $72.00/month (no change)
  aws_elasticache_cluster.redis $24.00/month (+$24.00 new resource)

  Total                         $242.00/month (+$97.00, +67%)
```

---

## OpenCost — Kubernetes Cost Attribution

### Installation

```bash
helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  --set opencost.prometheus.internal.enabled=true
```

### Pod-Level Cost API

```bash
# Cost per namespace over last 24h
curl "http://localhost:9003/allocation?window=24h&aggregate=namespace" | jq

# Cost per deployment label
curl "http://localhost:9003/allocation?window=7d&aggregate=label:app" | jq

# Cost breakdown: CPU + Memory + Storage
curl "http://localhost:9003/allocation?window=30d&aggregate=controller" | jq '
  .data[] | {
    name: .name,
    cpuCost: .cpuCost,
    ramCost: .ramCost,
    pvCost: .pvCost,
    totalCost: .totalCost
  }
'
```

### Grafana Dashboard

```yaml
# Import dashboard ID 12465 from grafana.com for OpenCost
# Or build custom panels:

# Panel: Top 10 most expensive namespaces
# PromQL:
sum by (namespace) (
  label_replace(opencost_allocation_namespace_cost_total, "namespace", "$1", "namespace", "(.*)")
) / 30
# Shows daily average cost per namespace over last 30 days
```

### Kubecost vs. OpenCost

| Feature | OpenCost (OSS) | Kubecost (Commercial) |
|---------|---------------|----------------------|
| Cost attribution | Yes | Yes |
| Multi-cluster | Manual | Built-in |
| Savings recommendations | No | Yes |
| Alerts | No | Yes |
| Price: | Free | $0–$699+/cluster/month |

---

## Rightsizing

### Detect Over-Provisioning

```bash
# AWS Compute Optimizer recommendations (CLI)
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=OVER_PROVISIONED \
  --output table

# Kubernetes — find pods with high slack (request >> actual usage)
kubectl top pods -A | awk '{
  if ($3+0 < $2*0.2) print $0, "OVER_PROVISIONED"
}'
```

### VPA (Vertical Pod Autoscaler) for Kubernetes

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"   # "Off" = recommendations only, no auto-apply
  resourcePolicy:
    containerPolicies:
      - containerName: my-app
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 4
          memory: 4Gi
```

```bash
# View VPA recommendations
kubectl describe vpa my-app-vpa | grep -A 20 "Recommendation"
```

### Reserved Instances / Savings Plans

```
Rule of thumb:
- Baseline steady-state workload (always running) → Reserved Instances (1yr) = ~40% savings
- Variable but predictable → Compute Savings Plans = ~30% savings
- Batch / fault-tolerant → Spot / Preemptible = ~60-90% savings

Analysis:
- AWS: Cost Explorer → Savings Plans → Recommendations
- GCP: Committed Use Discounts (CUD) Analyzer
- Azure: Azure Advisor → Cost recommendations
```

---

## Storage & Network Cost Optimization

### S3 Storage Classes

```python
# Lifecycle policy — move to cheaper tiers automatically
import boto3

s3 = boto3.client('s3')
s3.put_bucket_lifecycle_configuration(
    Bucket='my-bucket',
    LifecycleConfiguration={
        'Rules': [{
            'ID': 'cost-optimization',
            'Status': 'Enabled',
            'Transitions': [
                {'Days': 30,  'StorageClass': 'STANDARD_IA'},    # -40% cost
                {'Days': 90,  'StorageClass': 'GLACIER_IR'},      # -68% cost
                {'Days': 365, 'StorageClass': 'DEEP_ARCHIVE'},    # -95% cost
            ],
            'NoncurrentVersionExpiration': {'NoncurrentDays': 90},
        }],
    }
)
```

### Egress Cost Minimization

```
Key rules:
1. Keep compute in the same AZ/region as the data it processes
2. Use VPC endpoints (PrivateLink) for AWS services — eliminates NAT Gateway egress
3. CDN for static assets — S3 → CloudFront reduces origin egress by 60-90%
4. Compress API responses (gzip/brotli) — reduces data transfer volume
5. Same-region replicas preferred over cross-region for frequently accessed data
```

---

## Cost Anomaly Detection

### AWS Cost Anomaly Detection

```hcl
resource "aws_ce_anomaly_monitor" "service_monitor" {
  name              = "service-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "alert" {
  name      = "cost-anomaly-alert"
  threshold = 10    # Alert if anomaly > $10
  frequency = "DAILY"
  monitor_arn_list = [aws_ce_anomaly_monitor.service_monitor.arn]
  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_alerts.arn
  }
}
```

### GCP Budget Alerts

```hcl
resource "google_billing_budget" "monthly_budget" {
  billing_account = var.billing_account_id
  display_name    = "Monthly Budget Alert"

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10000"   # $10,000 budget
    }
  }

  threshold_rules {
    threshold_percent = 0.5    # Alert at 50%
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.8    # Alert at 80%
  }
  threshold_rules {
    threshold_percent = 1.0    # Alert at 100%
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    pubsub_topic = google_pubsub_topic.budget_alerts.id
  }
}
```

---

## FinOps Maturity Model

| Level | Characteristics |
|-------|----------------|
| **Crawl** | Basic cost visibility, some tagging, monthly reviews |
| **Walk** | Infracost in CI, cost per team, anomaly alerts, rightsizing recommendations |
| **Run** | Unit economics, automated rightsizing, showback/chargeback, savings plan governance |

---

## Quick Wins Checklist

- [ ] Enable AWS Cost Explorer / GCP Cost Reports / Azure Cost Analysis
- [ ] Tag all resources with `project`, `team`, `environment`, `owner`
- [ ] Set up budget alerts (50%, 80%, 100% thresholds)
- [ ] Delete unattached EBS volumes, orphaned IPs, unused load balancers
- [ ] Enable S3 Intelligent-Tiering on buckets > 100GB
- [ ] Review Reserved Instance coverage — target > 70% for steady-state workloads
- [ ] Add Infracost to all Terraform CI pipelines
- [ ] Deploy OpenCost or Kubecost in Kubernetes clusters
