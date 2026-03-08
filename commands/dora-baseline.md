---
description: Measure DORA Four Keys baseline for a team — deployment frequency, lead time, change failure rate, MTTR — with benchmark comparison and improvement priorities
---

# DORA Baseline Command

Measure the DORA Four Keys baseline for your team: $ARGUMENTS

## Your Task

Extract or calculate the four DORA metrics using available data sources, compare against DORA benchmarks, and identify the highest-impact improvement opportunity.

## Step 1 — Identify Data Sources

Ask or detect:
1. **CI/CD system**: GitHub Actions? GitLab CI? Jenkins? CircleCI?
2. **Incident management**: PagerDuty? OpsGenie? Grafana OnCall? Manual Slack?
3. **Deployment tracking**: GitHub Deployments API? Deploy tags in git? Manual tracking?
4. **Git host**: GitHub? GitLab? Bitbucket?

## Step 2 — Deployment Frequency

**Option A: GitHub Deployments API**
```bash
# Last 90 days of production deployments
gh api "repos/:owner/:repo/deployments" \
  --paginate \
  --jq '
    [.[] |
      select(.environment == "production" or .environment == "prod") |
      select(.created_at > (now - 90*86400 | todate))
    ] | length
  '

# Calculate: N deployments / 90 days = deploys per day
# Multiply by 7 for weekly rate
```

**Option B: Count merges to main**
```bash
# Proxy: merges to main branch (last 90 days)
git log --after="90 days ago" --merges --oneline origin/main | wc -l
echo "Merges in 90 days: above"
echo "Weekly rate: divide by 13"
```

**Option C: Tag-based deploys**
```bash
# If you tag releases
git tag --list --sort=-v:refname "v*" | \
  while read tag; do
    git log -1 --format="%ai" "$tag"
  done | \
  awk -v cutoff="$(date -d '-90 days' +%Y-%m-%d)" '$0 > cutoff' | wc -l
```

**Interpret:**

| Result | DORA Level |
|--------|-----------|
| Multiple per day | Elite |
| 1–7 per week | High |
| 1–4 per month | Medium |
| < 1 per month | Low |

## Step 3 — Lead Time for Changes

**GitHub — PR creation to merge:**
```bash
# Average lead time over last 50 merged PRs
gh pr list --state=merged --limit=50 \
  --json createdAt,mergedAt \
  --jq '
    [.[] |
      {hours: (
        ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600
      )}
    ] |
    {
      count: length,
      avg_hours: (map(.hours) | add / length | round),
      p50_hours: (sort_by(.hours) | .[length/2 | floor].hours | round),
      p95_hours: (sort_by(.hours) | .[length * 0.95 | floor].hours | round)
    }
  '
```

**Interpret (P50 lead time):**

| P50 Lead Time | DORA Level |
|---------------|-----------|
| < 1 hour | Elite |
| 1h to 1 day | High |
| 1 day to 1 week | Medium |
| > 1 week | Low |

## Step 4 — Change Failure Rate

**Option A: Count rollbacks/reverts**
```bash
# Revert commits in last 90 days
git log --after="90 days ago" --oneline | \
  grep -i "revert\|rollback\|hotfix" | wc -l

# Total merges to main in same period
TOTAL=$(git log --after="90 days ago" --merges --oneline main | wc -l)
FAILURES=$(git log --after="90 days ago" --oneline | grep -i "revert\|rollback\|hotfix" | wc -l)
echo "Change Failure Rate: $FAILURES / $TOTAL = $(echo "scale=1; $FAILURES * 100 / $TOTAL" | bc)%"
```

**Option B: Correlate deployments with incidents**
```bash
# Manual: Review incidents in last 90 days
# For each incident: was there a deployment within 1 hour before it?
# CFR = incidents triggered by deployments / total deployments
```

**Interpret:**

| CFR | DORA Level |
|-----|-----------|
| 0–15% | Elite |
| 16–30% | High or Medium |
| 46–60% | Low |

## Step 5 — Mean Time to Restore (MTTR)

**PagerDuty:**
```bash
curl --request GET \
  "https://api.pagerduty.com/incidents?time_zone=UTC&statuses[]=resolved&limit=50" \
  --header "Authorization: Token token=$PAGERDUTY_TOKEN" \
  --header "Accept: application/vnd.pagerduty+json;version=2" | \
  jq '
    [.incidents[] |
      {
        id: .id,
        hours: (
          ((.resolved_at | fromdateiso8601) - (.created_at | fromdateiso8601)) / 3600
        )
      }
    ] |
    {
      count: length,
      avg_mttr_hours: (map(.hours) | add / length),
      p50_mttr_hours: (sort_by(.hours) | .[length/2 | floor].hours)
    }
  '
```

**If no incident system exists:**
Ask team to estimate: "On average, when something breaks in production, how long until it's resolved?" Use their best estimate.

**Interpret:**

| P50 MTTR | DORA Level |
|----------|-----------|
| < 1 hour | Elite |
| 1–24 hours | High |
| 1 day to 1 week | Medium |
| > 1 week | Low |

## Step 6 — Compile Baseline Report

```markdown
# DORA Baseline Report

**Team:** [name]
**Measurement Period:** [start] – [end]
**Data Sources:** [GitHub / PagerDuty / git log]

---

## Results

| Metric | Measured Value | DORA Level |
|--------|---------------|------------|
| Deployment Frequency | [N] per [day/week/month] | [Elite/High/Medium/Low] |
| Lead Time (P50) | [N] hours | [Elite/High/Medium/Low] |
| Change Failure Rate | [N]% | [Elite/High/Medium/Low] |
| MTTR (P50) | [N] hours | [Elite/High/Medium/Low] |

**Overall Team Level:** [lowest single metric = team level]

---

## Benchmark Comparison

[Show industry benchmarks from DORA State of DevOps report for the team's industry/size]

---

## Highest-Impact Improvement

The metric furthest from the next level with the clearest improvement path:

**Focus:** [metric]
**Current:** [value] ([level])
**Target:** [value] (next level)

**Root cause hypothesis:** [what you suspect is causing this]

**Suggested investigation:**
1. [specific data point to gather]
2. [specific process to examine]

**Quick win experiment:** [small change that could show impact in 1 sprint]

---

## Caveats

- Proxy metrics used for: [list any metrics that were estimated]
- These are team-level metrics — do not use for individual performance evaluation
- Context matters: a team maintaining a 10-year-old monolith will score differently than a greenfield service
```

## Step 7 — Set Up Automated Tracking (Optional)

If the team wants ongoing tracking rather than a one-time baseline:
- Recommend: LinearB or Faros (SaaS, minimal setup)
- Or: Google Four Keys (open source, GCP-based)
- Minimum viable: weekly cron job running these bash commands → Google Sheets

See `dora-implementation` skill for detailed setup of each option.

## Reference Skills

- `engineering-metrics` — DORA theory, SPACE framework, Goodhart's Law
- `dora-implementation` — technical setup for ongoing tracking
