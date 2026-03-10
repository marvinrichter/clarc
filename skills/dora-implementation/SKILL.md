---
name: dora-implementation
description: "DORA Four Keys technical implementation: extracting metrics from GitHub/GitLab APIs, Google Four Keys open-source setup, LinearB/Faros/Haystack alternatives, Grafana DORA dashboard, PagerDuty/OpsGenie MTTR integration, quarterly review process."
---

# DORA Implementation Skill

You know what DORA metrics are (see `engineering-metrics` skill). This skill covers the technical implementation — how to actually extract the data, build dashboards, and set up the review process.

## When to Activate

- Setting up DORA metrics tracking for the first time
- Building a DORA dashboard in Grafana or Looker Studio
- Integrating deployment tracking into CI/CD pipeline
- Connecting incident data from PagerDuty/OpsGenie to calculate MTTR
- Selecting DORA tooling (build vs. buy)
- Extracting deployment frequency or lead time data from the GitHub Deployments or Pull Requests API
- Running a quarterly engineering metrics review and needing a structured template for the team

---

## Data Sources

| DORA Metric | Data Source | Signal to Track |
|-------------|------------|-----------------|
| Deployment Frequency | CI/CD system, GitHub Deployments API | Successful production deployments |
| Lead Time | Git log + deployment timestamp | Commit → production delta |
| Change Failure Rate | Deployment + Incident system | Incidents created within 1h of deploy |
| MTTR | Incident management system | Incident duration (open → resolved) |

---

## GitHub — Extracting DORA Data

### Deployment Frequency

```bash
# Count production deployments via GitHub Deployments API
gh api "repos/{owner}/{repo}/deployments" \
  --jq '[.[] | select(.environment == "production" or .environment == "prod")] | length'

# Per-week breakdown (last 12 weeks)
gh api "repos/{owner}/{repo}/deployments" \
  --paginate \
  --jq '
    [.[] | select(.environment == "production")]
    | group_by(.created_at[:7])
    | map({week: .[0].created_at[:7], count: length})
    | sort_by(.week)
    | .[-12:]
  '
```

### Lead Time for Changes

```bash
# Measure time from first commit in PR to merge (proxy for lead time)
gh pr list --state=merged --limit=100 \
  --json number,title,createdAt,mergedAt,commits \
  --jq '
    [.[] | {
      pr: .number,
      created: .createdAt,
      merged: .mergedAt,
      lead_time_hours: (
        ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600
      )
    }]
    | map(select(.lead_time_hours > 0))
    | {
        count: length,
        avg_hours: (map(.lead_time_hours) | add / length),
        p50_hours: (sort_by(.lead_time_hours) | .[length/2 | floor].lead_time_hours),
        p95_hours: (sort_by(.lead_time_hours) | .[length * 0.95 | floor].lead_time_hours)
      }
  '
```

### Track Deployments in GitHub Actions

```yaml
# Add to your deployment workflow
- name: Create GitHub Deployment
  uses: chrnorm/deployment-action@v2
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    environment: production

- name: Run deployment
  run: ./scripts/deploy.sh

- name: Update Deployment Status
  uses: chrnorm/deployment-status@v2
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    deployment-id: ${{ steps.deployment.outputs.deployment_id }}
    state: success  # or: failure
```

---

## Google Four Keys (Open Source)

The original open-source DORA metrics system from Google.

```bash
# Deploy via Terraform to GCP (Cloud Run + BigQuery + Looker Studio)
git clone https://github.com/dora-team/fourkeys
cd fourkeys/terraform

# Configure
cp terraform.tfvars.example terraform.tfvars
# Edit: project, region, github_token

# Deploy
terraform init
terraform apply

# Once deployed:
# 1. Add webhook to GitHub repo → Cloud Run endpoint
# 2. View dashboard in Looker Studio (link provided in output)
```

**Requirements**: GCP account, GitHub admin access.

---

## Grafana DORA Dashboard

```bash
# Install DORA Grafana plugin
grafana-cli plugins install grafana-dora-datasource

# Or use community dashboard (import by ID in Grafana UI)
# Dashboard ID: 16756 (DORA Metrics)
```

```json
// Grafana panel query (if tracking in Prometheus)
// Deployment frequency panel
{
  "expr": "increase(deployments_total{environment='production'}[7d])",
  "legendFormat": "Deploys per week"
}

// MTTR panel
{
  "expr": "avg(incident_duration_seconds{severity='critical'}) / 3600",
  "legendFormat": "MTTR (hours)"
}
```

### Custom Prometheus Metrics

```javascript
// Push deployment event to Prometheus Pushgateway
const pushgateway = require('prom-client').Pushgateway;
const gateway = new Pushgateway('http://pushgateway:9091');

const deployCounter = new Counter({
  name: 'deployments_total',
  help: 'Total deployments',
  labelNames: ['environment', 'status']
});

// Call after successful deployment
deployCounter.inc({ environment: 'production', status: 'success' });
await gateway.pushAdd({ jobName: 'dora-metrics' });
```

---

## MTTR from PagerDuty / OpsGenie

### PagerDuty

```bash
# Get incidents (last 90 days)
curl --request GET \
  --url "https://api.pagerduty.com/incidents?time_zone=UTC&since=2024-01-01&until=2024-04-01&statuses[]=resolved" \
  --header "Authorization: Token token=YOUR_TOKEN" \
  --header "Accept: application/vnd.pagerduty+json;version=2" | \
  jq '
    [.incidents[] | {
      id: .id,
      created: .created_at,
      resolved: .resolved_at,
      duration_hours: (
        ((.resolved_at | fromdateiso8601) - (.created_at | fromdateiso8601)) / 3600
      )
    }]
    | {
        count: length,
        avg_mttr_hours: (map(.duration_hours) | add / length),
        p50: (sort_by(.duration_hours) | .[length/2 | floor].duration_hours),
        p95: (sort_by(.duration_hours) | .[length * 0.95 | floor].duration_hours)
      }
  '
```

### OpsGenie

```bash
curl --request GET \
  "https://api.opsgenie.com/v2/alerts?query=status:closed&createdAt>2024-01-01" \
  --header "Authorization: GenieKey YOUR_API_KEY" | \
  jq '[.data[] | {id: .id, created: .createdAt, closed: .closedAt}]'
```

---

## Commercial Tooling Comparison

| Tool | Strengths | Weaknesses | Pricing |
|------|-----------|-----------|---------|
| **LinearB** | Deep Git/Jira integration, PR analytics | No free tier | ~$20/eng/mo |
| **Faros AI** | Multi-source (GitHub + Jira + PagerDuty), open core | Complex setup | Freemium |
| **Haystack** | Good UX, actionable insights | GitHub only | ~$15/eng/mo |
| **Swarmia** | SPACE framework native, wellbeing data | Newer tool | ~$20/eng/mo |
| **DX Platform** | Built by DX Core 24 researchers | Enterprise focus | Contact |
| **Four Keys** | Free, open source, Google-backed | GCP only, maintenance burden | Free |

**Recommendation by team size:**
- < 10 engineers: GitHub + custom scripts (this skill)
- 10–50 engineers: LinearB or Haystack (fast time-to-value)
- 50+ engineers: Faros AI or Four Keys with Grafana (flexibility)

---

## Quarterly Review Process

```markdown
## Engineering Metrics — Q[N] Review

**Team:** [name]
**Period:** [start] – [end]

### DORA Metrics

| Metric | Last Quarter | This Quarter | Change | Target | DORA Level |
|--------|-------------|-------------|--------|--------|------------|
| Deploy Frequency | 2.1/week | 3.4/week | +62% | 5/week | Medium → High |
| Lead Time (p50) | 4.2 days | 2.8 days | -33% | < 1 day | Medium |
| Change Failure Rate | 8% | 5% | -38% | < 5% | High |
| MTTR (p50) | 3.2h | 1.8h | -44% | < 1h | High |

**Team Level: [Elite/High/Medium/Low] → [level after improvement]**

### Leading Indicators

| Indicator | Last Q | This Q | Trend |
|-----------|--------|--------|-------|
| Avg PR size (lines) | 340 | 215 | ✅ Improving |
| CI duration (p50) | 8.2 min | 6.1 min | ✅ Improving |
| Review turnaround (p50) | 6.4h | 4.2h | ✅ Improving |
| Test coverage | 67% | 71% | ✅ Improving |

### What Moved the Needle

1. **Deploy Frequency +62%**: Implemented feature flags (no more long-running feature branches)
2. **Lead Time -33%**: Added PR size guide (<300 lines) and async review SLA (<24h)
3. **MTTR -44%**: Wrote runbooks for top 5 alerts

### What's Still Hard

1. Lead Time still in "Medium" range — blocked on CI taking >6 min
   → Action: Parallelize test suite (owner: @[engineer], due: end of next sprint)

### Q[N+1] Focus

- **Primary**: Lead Time → Elite (< 1h) — requires CI optimization + CD acceleration
- **Secondary**: Deploy Frequency → Elite (5+/day) — requires deployment confidence
```

---

## Reference Skills

- `engineering-metrics` — understanding DORA, SPACE, Goodhart's Law
- `slo-workflow` — MTTR correlates with SLO reliability
- `observability` — prerequisites for measuring deployment health
- `incident-response` — process improvements that reduce MTTR
