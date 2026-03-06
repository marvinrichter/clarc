---
name: analytics-workflow
description: "Data & product analytics workflow: event taxonomy design, instrumentation (Segment, PostHog, Mixpanel, Amplitude, GA4), analytics pipelines, funnel and retention analysis, and dashboard design. Complements observability (infrastructure metrics) with product/user behavior tracking."
---

# Analytics Workflow

> **Scope**: Product and user behavior analytics — what users do in your product and why.
> For infrastructure metrics (latency, error rate, CPU), see the [observability](../observability/SKILL.md) skill.

## When to Activate

- Adding event tracking to a new feature
- Designing an analytics event taxonomy from scratch
- Integrating Segment, PostHog, Mixpanel, Amplitude, or GA4
- Building a funnel, retention, or cohort analysis
- Creating a product dashboard (DAU, activation, conversion)
- Setting up an analytics data pipeline (warehouse → BI tool)
- Answering "are users actually using X?"

---

## Event Taxonomy Design

**The golden rule**: define your taxonomy before writing any tracking code.

### Event naming convention

```
<object>_<action>          # noun_verb, past tense
user_signed_up
project_created
payment_failed
feature_viewed
onboarding_step_completed
```

Avoid:
- `click` (too generic — what was clicked?)
- `pageView` (camelCase inconsistency)
- `btn_clicked` (abbreviation)
- `event1` (meaningless)

### Event schema

Every event should carry:

| Property | Type | Description |
|----------|------|-------------|
| `event` | string | Event name (e.g. `project_created`) |
| `user_id` | string | Authenticated user ID (nullable for anon) |
| `anonymous_id` | string | Pre-auth session ID |
| `timestamp` | ISO8601 | Client event time |
| `properties` | object | Event-specific payload |
| `context.app` | object | App name + version |
| `context.page` | object | URL, title, referrer |

### Taxonomy tiers

| Tier | Events | Purpose |
|------|--------|---------|
| Core lifecycle | `user_signed_up`, `user_signed_in`, `subscription_started` | North star metrics |
| Activation | `onboarding_step_completed`, `first_project_created` | Aha moment tracking |
| Feature usage | `feature_viewed`, `feature_used`, `feature_abandoned` | Engagement depth |
| Revenue | `checkout_started`, `payment_succeeded`, `plan_upgraded` | Monetization |
| Errors | `error_displayed`, `action_failed` | Friction points |

---

## Instrumentation

### Segment (universal router)

```typescript
// Track event
analytics.track('project_created', {
  project_id: project.id,
  template_used: project.template,
  team_size: team.members.length,
});

// Identify user (call on login + profile changes)
analytics.identify(user.id, {
  email: user.email,
  plan: user.subscription.plan,
  created_at: user.createdAt,
  company: user.company?.name,
});

// Group (associate user with account/org)
analytics.group(org.id, {
  name: org.name,
  plan: org.plan,
  employee_count: org.size,
});
```

**Segment destinations**: route one event stream → Mixpanel, Amplitude, BigQuery, Redshift, Braze simultaneously. No multi-SDK installs.

### PostHog (self-hosted / OSS)

```typescript
import posthog from 'posthog-js';

posthog.init('phc_xxx', { api_host: 'https://eu.posthog.com' });

// Feature flags (integrated with analytics)
if (posthog.isFeatureEnabled('new-checkout')) {
  // show new checkout
}

// Group analytics
posthog.group('company', orgId, { name: org.name, plan: org.plan });

// Session recording (enable selectively)
posthog.startSessionRecording();
```

PostHog advantages: feature flags + A/B tests + session recording in one tool. Good for GDPR (EU cloud or self-host).

### Server-side tracking (Node.js)

```typescript
import Analytics from '@segment/analytics-node';

const analytics = new Analytics({ writeKey: process.env.SEGMENT_WRITE_KEY });

// Server events (payments, backend actions)
analytics.track({
  userId: user.id,
  event: 'payment_succeeded',
  properties: {
    amount: charge.amount,
    currency: charge.currency,
    plan: subscription.plan,
  },
  context: { ip: request.ip },
});

// Flush before process exit
await analytics.closeAndFlush();
```

---

## Analytics Pipeline Architecture

```
[App events] → [Segment / PostHog]
                     │
              ┌──────┴──────────┐
              │                 │
         [Real-time]      [Warehouse]
         (Mixpanel,        (BigQuery /
          Amplitude)        Snowflake /
                            Redshift)
                                │
                          [dbt models]
                                │
                         [BI Dashboard]
                         (Metabase /
                          Looker /
                          Tableau)
```

### dbt event model pattern

```sql
-- models/events/fct_events.sql
with raw as (
  select * from {{ source('segment', 'tracks') }}
),
cleaned as (
  select
    id,
    anonymous_id,
    user_id,
    event                                    as event_name,
    timestamp                                as occurred_at,
    json_extract_path_text(properties, 'project_id') as project_id,
    received_at
  from raw
  where timestamp >= '2024-01-01'
)
select * from cleaned
```

---

## Key Product Metrics

### Acquisition
- **CAC** = Total marketing spend / New customers
- **Traffic by channel** = sessions per source/medium

### Activation
- **Activation rate** = Users who hit "aha moment" / Signups
- **Time to first value** = median time from signup → first key action

### Retention
```sql
-- Weekly retention cohort
select
  date_trunc('week', first_seen)  as cohort_week,
  date_trunc('week', occurred_at) as activity_week,
  count(distinct user_id)         as active_users
from user_activity
group by 1, 2
order by 1, 2
```

### Revenue
- **MRR** = sum of monthly recurring revenue
- **Churn rate** = Customers lost this month / Customers at start of month
- **LTV** = Average MRR per customer / Churn rate

### Funnel analysis

```sql
select
  count(distinct case when step = 'signup'          then user_id end) as s1_signup,
  count(distinct case when step = 'email_verified'  then user_id end) as s2_email,
  count(distinct case when step = 'project_created' then user_id end) as s3_project,
  count(distinct case when step = 'invite_sent'     then user_id end) as s4_invite
from funnel_events
where cohort_date >= current_date - 30
```

---

## Dashboard Design Principles

1. **One metric per card** — not "users and sessions" on one chart
2. **Show trend, not snapshot** — 30-day sparkline next to the number
3. **Segment by default** — always allow drill-down by plan/channel/cohort
4. **Alert on anomalies** — set thresholds, not just displays
5. **Executive vs. operator views** — different granularity for different audiences

### Recommended dashboard stack

| Use case | Tool |
|----------|------|
| Self-hosted BI | Metabase (free), Redash |
| Enterprise BI | Looker, Tableau, Power BI |
| Product analytics | Mixpanel, Amplitude, PostHog |
| Real-time | Grafana (Prometheus backend) |
| Ad-hoc SQL | Mode, Count, Querybook |

---

## Privacy & Compliance

- **Anonymize before analysis**: hash PII before storing in warehouse
- **Respect opt-out**: honor `Do Not Track`, GDPR consent signals
- **Data retention**: define TTL for raw events (90 days recommended)
- **PII in properties**: never log `password`, `ssn`, `credit_card_number`

```typescript
// Sanitize before tracking
analytics.track('form_submitted', {
  form_id: form.id,
  // email: user.email,  ← DO NOT include PII in event properties
  field_count: form.fields.length,
});
```

---

## Related

- [observability](../observability/SKILL.md) — infrastructure metrics, traces, alerts
- [load-testing](../load-testing/SKILL.md) — performance under load
- `/instrument` command — add event tracking to existing code
