---
description: Audit cloud costs for a project — tagging coverage, rightsizing opportunities, savings plan potential, anomalies, and Infracost integration gaps
---

# FinOps Audit

Conduct a comprehensive FinOps audit for: $ARGUMENTS

## Your Task

Systematically analyze cloud costs, infrastructure configuration, and CI/CD pipelines to identify waste, optimization opportunities, and governance gaps. Reference the `finops-patterns` skill for detailed implementation patterns.

---

## Step 0 — Delegate to finops-advisor (Start Here)

**Invoke the `finops-advisor` agent** with the Terraform/Kubernetes configuration files and any cost reports available.

Pass: directory of IaC files (`$ARGUMENTS` or `.`), and optionally a cost export (CSV or JSON). The agent will:
- Analyze cloud resource configuration for cost optimization opportunities
- Estimate ROI with prioritized recommendations (rightsizing, reservations, waste elimination)
- Identify tagging gaps and governance issues

> For a quick audit of a single PR or IaC change, Step 0 alone is sufficient. Continue to the manual checklist below for a comprehensive quarterly audit.

---

## Audit Checklist

### 1. Tagging Coverage

**Goal:** 100% of billable resources tagged with `project`, `team`, `environment`, `owner`.

```bash
# AWS — find untagged resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=team \
  --query 'ResourceTagMappingList[?Tags==`[]`].ResourceARN' \
  --output text | wc -l

# AWS — untagged EC2 instances
aws ec2 describe-instances \
  --query 'Reservations[].Instances[?!Tags || !contains(Tags[].Key, `team`)].InstanceId' \
  --output text

# GCP — resources without required labels
gcloud asset search-all-resources \
  --query="NOT labels.team:*" \
  --format="table(name,assetType)"
```

Report:
- Total billable resources scanned
- % with complete required tags
- Top resource types with missing tags
- Monthly cost of untagged resources (estimated)

### 2. Rightsizing Recommendations

**Goal:** No resource with < 20% average utilization over 14 days.

```bash
# AWS — Compute Optimizer recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=OVER_PROVISIONED \
  --query 'instanceRecommendations[].{
    Instance:instanceArn,
    CurrentType:currentInstanceType,
    RecommendedType:recommendationOptions[0].instanceType,
    MonthlySavings:recommendationOptions[0].estimatedMonthlySavings.value
  }' \
  --output table

# Kubernetes — VPA recommendations (if OpenCost/VPA installed)
kubectl get vpa -A -o json | jq '
  .items[] |
  {
    namespace: .metadata.namespace,
    name: .metadata.name,
    recommendations: .status.recommendation.containerRecommendations[] |
    {
      container: .containerName,
      target_cpu: .target.cpu,
      target_memory: .target.memory
    }
  }
'

# OpenCost — namespace cost with efficiency
curl "http://opencost.opencost.svc:9003/allocation?window=14d&aggregate=namespace" | \
  jq '.data[][] | select(.cpuEfficiency < 0.3) | {name, cpuEfficiency, totalCost}'
```

Report:
- List of over-provisioned instances/nodes with recommended types
- Estimated monthly savings from rightsizing
- Kubernetes namespaces with efficiency < 30%

### 3. Reserved Instance / Savings Plan Coverage

**Goal:** > 70% of steady-state compute covered by reservations or savings plans.

```bash
# AWS — current RI coverage
aws ce get-reservation-coverage \
  --time-period Start=$(date -v-30d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --query 'Total.CoverageHours.CoverageHoursPercentage'

# AWS — Savings Plans coverage
aws ce get-savings-plans-coverage \
  --time-period Start=$(date -v-30d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY

# AWS — Savings Plans recommendations
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days THIRTY_DAYS
```

Report:
- Current RI/SP coverage % by service
- Recommended commitment amounts
- Estimated annual savings from commitments

### 4. Top 10 Cost Drivers

**Goal:** Engineering knows which services/resources drive the most cost.

```bash
# AWS — top 10 by service last 30 days
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-30d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups | sort_by(@, &Metrics.BlendedCost.Amount) | reverse(@) | [:10]' \
  --output table

# AWS — top 10 by tag:team
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-30d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=team \
  --output table
```

Report:
- Top 10 services by spend
- Top 10 teams by spend
- Month-over-month trend
- Unexpected spikes (> 20% MoM growth)

### 5. Anomaly Detection — Last 30 Days

**Goal:** No unexplained cost spikes > $100 or > 20% increase.

```bash
# AWS Cost Anomaly Detection — recent anomalies
aws ce get-anomalies \
  --date-interval StartDate=$(date -v-30d +%Y-%m-%d),EndDate=$(date +%Y-%m-%d) \
  --query 'Anomalies[].{
    Service:AnomalyScore.MaxScore,
    Impact:Impact.TotalImpact,
    StartDate:AnomalyStartDate,
    EndDate:AnomalyEndDate,
    RootCause:RootCauses[0].ServiceName
  }' \
  --output table
```

Check:
- List of anomalies with root cause analysis
- Were they investigated? Slack thread or ticket reference?
- Are anomaly alerts configured and routing to the right team?

### 6. Infracost Integration — Pipeline Coverage

**Goal:** All Terraform repositories have Infracost in CI.

```bash
# Check which repos have Infracost configured
find . -name "*.yml" -path "*/.github/workflows/*" | \
  xargs grep -l "infracost" 2>/dev/null

# Check if infracost.yml action exists
ls .github/workflows/ | grep infracost
```

Questions to answer:
- What % of Terraform repos have Infracost in CI?
- Is there a cost threshold configured (PR fails if cost > X%)?
- Are cost estimates posted to PRs as comments?

### 7. Budget Alerts — Are They Configured?

**Goal:** Budget alerts at 50%, 80%, 100% for all active projects.

```bash
# AWS — list Cost Anomaly monitors
aws ce get-anomaly-monitors --output table

# AWS — list budgets
aws budgets describe-budgets --account-id $(aws sts get-caller-identity --query Account --output text)

# GCP — list billing budgets
gcloud billing budgets list --billing-account=$BILLING_ACCOUNT
```

Check:
- Budgets defined per team/project
- Alert thresholds configured
- Alert notifications routing to correct channels (Slack, email, PagerDuty)
- Budget forecast alerts (not just actuals)

---

## Waste Elimination — Quick Wins

```bash
# Unattached EBS volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[].{ID:VolumeId,Size:Size,AZ:AvailabilityZone,Cost:"~$0.10/GB/mo"}' \
  --output table

# Orphaned Elastic IPs (unattached)
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].PublicIp' --output text

# Idle load balancers (< 1 req/min last 7 days)
# Check CloudWatch: RequestCount metric on each ALB

# Unused NAT Gateways
aws ec2 describe-nat-gateways \
  --filter Name=state,Values=available \
  --query 'NatGateways[].{ID:NatGatewayId,VPC:VpcId}'
```

---

## Audit Report Format

```markdown
# FinOps Audit Report — [Project Name]
Date: [YYYY-MM-DD]
Auditor: Claude FinOps Audit

## Executive Summary
- Monthly Cloud Spend: $X,XXX
- MoM Change: +/-X%
- Optimization Potential: ~$X,XXX/month

## Findings

### 🔴 Critical (Act within 1 week)
- [Issue] — Estimated savings: $X/month

### 🟡 High (Act within 1 month)
- [Issue] — Estimated savings: $X/month

### 🟢 Recommended (Improve over quarter)
- [Issue] — Estimated savings: $X/month

## Tagging Coverage: X%
[Details per resource type]

## Top 10 Cost Drivers
[Table]

## Rightsizing Opportunities
[Table with instance, current type, recommended type, savings]

## RI/SP Coverage: X%
[Breakdown and recommendations]

## Anomalies (Last 30 days)
[List with investigation status]

## Infracost Coverage: X of Y repos
[List of repos missing Infracost]

## Budget Alerts: X of Y projects configured
[List of projects missing alerts]

## Action Plan (Prioritized by ROI)
1. [Highest impact action] — saves $X/month, effort: Low/Medium/High
2. ...
```

---

**Reference:** See `finops-patterns` skill for implementation details.
**Agent:** Use `finops-advisor` for automated cost analysis and recommendations.
