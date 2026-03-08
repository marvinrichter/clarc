---
description: Monthly engineering health review — DORA trends, leading indicators, tech debt movement, DevEx pulse, and action items for next month
---

# Engineering Review Command

Run a monthly engineering health review: $ARGUMENTS

## Your Task

Conduct a structured monthly engineering review covering DORA metrics trends, leading indicator health, technical debt movement, and team wellbeing. Produce a written review document with next-month action items.

## Step 1 — Gather DORA Metrics (Current Month)

Run the metrics collection for the current month:

```bash
# Deployment Frequency — this month
THIS_MONTH=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%dT00:00:00Z)
gh api "repos/:owner/:repo/deployments" \
  --jq "[.[] | select(.environment == \"production\") | select(.created_at > \"$THIS_MONTH\")] | length"

# Deployment Frequency — last month (for comparison)
LAST_MONTH=$(date -d "$(date +%Y-%m-01) -1 month" +%Y-%m-%dT00:00:00Z)
LAST_MONTH_END=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%dT00:00:00Z)
gh api "repos/:owner/:repo/deployments" \
  --jq "[.[] | select(.environment == \"production\") | select(.created_at > \"$LAST_MONTH\" and .created_at < \"$LAST_MONTH_END\")] | length"

# Lead Time — this month (P50)
gh pr list --state=merged --limit=100 \
  --json createdAt,mergedAt \
  --jq "
    [.[] | select(.mergedAt > \"$THIS_MONTH\") |
      {hours: (((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600)}
    ] |
    sort_by(.hours) |
    .[length/2 | floor].hours
  "
```

## Step 2 — Leading Indicators

```bash
# Average PR size this month (lines changed)
gh pr list --state=merged --limit=50 \
  --json additions,deletions,mergedAt \
  --jq "
    [.[] | select(.mergedAt > \"$THIS_MONTH\") |
      {size: (.additions + .deletions)}
    ] | map(.size) | add / length
  "

# CI duration (if tracked in GitHub Actions)
gh run list --limit=50 --json conclusion,createdAt,updatedAt \
  --jq "
    [.[] |
      select(.conclusion == \"success\") |
      select(.createdAt > \"$THIS_MONTH\") |
      {duration_min: (
        ((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 60
      )}
    ] | map(.duration_min) | add / length
  "

# Review turnaround (time from PR opened to first review)
# (requires GitHub API or linear tool)

# Test coverage (from latest CI report)
cat coverage/coverage-summary.json 2>/dev/null | \
  jq '.total.lines.pct'
```

## Step 3 — Tech Debt Trend

```bash
# Has complexity improved or worsened?
# Compare with last month's baseline if tracked

# Quick proxy: new TODO/FIXME added this month
git log --after="$(date +%Y-%m-01)" --oneline | \
  xargs git show | grep "+.*TODO\|+.*FIXME\|+.*HACK" | wc -l

# Dependency updates shipped this month
git log --after="$(date +%Y-%m-01)" --oneline | \
  grep -i "deps\|dependency\|upgrade\|update.*version" | wc -l
```

## Step 4 — Incidents and Reliability

```bash
# Incidents this month (from PagerDuty / OpsGenie)
# PagerDuty:
THIS_MONTH_ISO=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%dT00:00:00Z)
curl "https://api.pagerduty.com/incidents?time_zone=UTC&since=$THIS_MONTH_ISO&statuses[]=resolved" \
  --header "Authorization: Token token=$PAGERDUTY_TOKEN" \
  --header "Accept: application/vnd.pagerduty+json;version=2" | \
  jq '
    {
      count: (.incidents | length),
      avg_mttr_hours: ([.incidents[] |
        (((.resolved_at | fromdateiso8601) - (.created_at | fromdateiso8601)) / 3600)
      ] | if length > 0 then add / length else 0 end)
    }
  '
```

## Step 5 — Compile the Review Document

```markdown
# Engineering Health Review — [Month YYYY]

**Team:** [name]
**Reviewed by:** [author]
**Date:** [YYYY-MM-DD]

---

## DORA Metrics

| Metric | Last Month | This Month | Trend | Level |
|--------|-----------|------------|-------|-------|
| Deploy Frequency | [N]/week | [N]/week | ↑↓→ | Elite/High/Med/Low |
| Lead Time P50 | [N]h | [N]h | ↑↓→ | |
| Change Failure Rate | [N]% | [N]% | ↑↓→ | |
| MTTR P50 | [N]h | [N]h | ↑↓→ | |

**Level: [last month] → [this month]**

---

## Leading Indicators

| Indicator | Last Month | This Month | Status |
|-----------|-----------|------------|--------|
| Avg PR size (lines) | [N] | [N] | ✅/⚠️/❌ |
| CI duration P50 | [N]min | [N]min | ✅/⚠️/❌ |
| Review turnaround P50 | [N]h | [N]h | ✅/⚠️/❌ |
| Test coverage | [N]% | [N]% | ✅/⚠️/❌ |
| Dependency updates shipped | [N] | [N] | ✅/⚠️/❌ |

**Thresholds:** PR size < 250 lines ✅ | CI < 8min ✅ | Review < 24h ✅ | Coverage > 80% ✅

---

## Incidents & Reliability

| Metric | Last Month | This Month | Trend |
|--------|-----------|------------|-------|
| Total incidents | [N] | [N] | ↑↓→ |
| P1 incidents | [N] | [N] | ↑↓→ |
| MTTR P50 | [N]h | [N]h | ↑↓→ |
| Post-mortems completed | [N] | [N] | ✅/⚠️ |
| Action items resolved | [N]/[N] | [N]/[N] | ✅/⚠️ |

---

## Technical Debt Movement

- Debt items closed this month: [N]
- New debt items opened: [N]
- Net change: [+/-N]
- Backlog size: [N] items

**Notable debt addressed:** [what specific debt was paid down]
**Notable debt added:** [any new significant debt incurred and why]

---

## Team Wellbeing (from DevEx survey or qualitative signals)

*From monthly pulse or observation:*

- Sustainable pace: [impression: 🟢/🟡/🔴]
- Team morale: [impression: 🟢/🟡/🔴]
- Any retention risks: [yes/no — no names]
- Notable feedback: [themes without attribution]

*Next DevEx survey due:* [date]

---

## What Moved the Needle This Month

1. **[Change]**: [Metric it improved] — [why it worked]
2. **[Change]**: [Metric it improved]

---

## What Didn't Move (and Why)

1. **[Metric]** still at [level]: [root cause hypothesis]
   - Blocking factor: [what's preventing improvement]
   - Owner: [role, not name]

---

## Action Items for Next Month

| Priority | Action | Owner | Due | Metric Target |
|----------|--------|-------|-----|--------------|
| P0 | [action] | [role] | [date] | [metric: current → target] |
| P1 | [action] | [role] | [date] | [metric: current → target] |
| P2 | [action] | [role] | [date] | [metric] |

**Last month's action items:**
- [x] [item] — completed ([outcome])
- [ ] [item] — not completed ([why, carried forward])

---

## Engineering Wins This Month

> Acknowledge what went well — this matters for team morale and learning.

1. [specific win with brief context]
2. [specific win]

---

## Next Review

**Date:** [first week of next month]
**Focus for next month:** [primary metric / initiative]
```

## Reference Skills

- `engineering-metrics` — DORA theory, SPACE framework, Goodhart's Law
- `dora-implementation` — technical setup for extracting metrics
- `/dora-baseline` — first-time DORA measurement
- `/devex-survey` — quarterly developer experience survey
- `incident-response` — improving MTTR and post-mortem quality
