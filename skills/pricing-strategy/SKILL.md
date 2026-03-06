---
name: pricing-strategy
description: "SaaS pricing strategy patterns: value metric selection, usage-based vs. seat-based vs. flat-rate models, freemium conversion, pricing page design, packaging tiers, and the analytics to improve pricing. For product and technical founders."
---

# Pricing Strategy Skill

## When to Activate

- Setting initial pricing for a new product
- Pricing is causing sales friction or high churn
- Evaluating a move to usage-based pricing
- Designing pricing tiers (free, pro, enterprise)
- Building the pricing page
- Considering freemium

---

## Step 1: Choose Your Value Metric

The value metric is **what you charge for** — it should scale with the customer's value received.

**Good value metrics:**
- Scale with customer value (as they get more value, they pay more)
- Understandable by the buyer (no complex calculations)
- Measurable in your system

| Product type | Good value metric | Bad value metric |
|---|---|---|
| Messaging / email tool | Contacts or messages sent | Seats (everyone benefits per message) |
| Analytics platform | Events tracked or MAUs | Seats |
| API product | API calls or compute | Seats |
| Project management | Users / seats | Feature count |
| Storage / data | GB stored | Seats |
| Transactional SaaS | Transactions processed | Seats |

**Rules:**
- **Never charge per feature** — it creates negotiation and complexity
- **Charge per unit of value** — not per person unless "people" = value
- **Test your metric** — does a 10x better customer use 10x the metric?

---

## Step 2: Choose Your Pricing Model

### Seat-Based (per user)
```
Best for: collaboration tools, project management, internal tools
Example: Notion ($16/user/month), Linear ($8/user/month)
Pros: predictable, simple to explain
Cons: anti-collaborative (teams hide licenses), doesn't scale with ROI
```

### Usage-Based (pay as you go)
```
Best for: API products, infrastructure, AI tools, transactional SaaS
Example: Stripe (2.9% + 30¢), Twilio ($0.0085/message), OpenAI (per token)
Pros: aligns with value, low barrier to start, expands naturally
Cons: unpredictable customer bills, harder to forecast revenue
```

### Usage-Based with Commitment (hybrid — recommended for B2B)
```
Best for: B2B SaaS wanting enterprise contracts + usage alignment
Example: Snowflake, Datadog, AWS
Structure:
  - Committed baseline (e.g., $500/month minimum)
  - Usage above baseline at per-unit rate
  - Annual commitment discount (15-20%)
Pros: predictable floor for you, usage alignment for customer
```

### Flat-Rate (per tier)
```
Best for: simple products with homogeneous customers
Example: Basecamp ($99/month unlimited users)
Pros: simple, easy to explain
Cons: doesn't capture value from high-usage customers
```

---

## Step 3: Tier Design (Good-Better-Best)

Most SaaS should have 3 tiers. More creates decision paralysis; fewer leaves money on the table.

```
FREE (if doing freemium):
  - Limited but genuinely useful (not crippled)
  - Limit: usage cap or feature ceiling, not time limit
  - Include: core workflow, enough to see value
  - Exclude: collaboration, advanced features, high limits

PRO (individual or small team):
  - Priced for self-serve purchase (no sales conversation needed)
  - Include: full feature set, reasonable limits
  - Typical: $15-50/user/month or $50-200/month flat

TEAM / BUSINESS:
  - Priced for team decision
  - Include: admin controls, SSO, audit logs, higher limits
  - Typical: $50-150/user/month or $500-2000/month flat

ENTERPRISE:
  - Contact sales (custom pricing)
  - Include: SLA, dedicated support, custom contracts, security reviews
  - Don't list a price — drives inbound to sales
```

**Packaging rules:**
- Each tier should have 1-2 "hero features" that justify the upgrade
- Upgrade friction from Free → Pro should be: "I need more X" (usage hit) or "I need feature Y" (workflow blocker)
- Don't gatekeep features that help free users succeed — they convert better

---

## Step 4: Freemium Decision

**Do freemium when:**
- Product has viral/network effects (Slack, Figma, Notion)
- Low marginal cost to serve free users
- Free users create value for paid users (marketplaces, collaboration)
- Product is complex enough to need a trial period

**Do NOT do freemium when:**
- High COGS per free user (GPU, storage, human support)
- No viral loop — free users don't bring others
- Sales-led motion (enterprise requires human touch anyway)
- Product is simple enough to evaluate in a 14-day trial

**Free trial alternative (often better for B2B):**
- Time-limited trial (14 or 30 days) with full access
- No credit card required lowers activation
- Card required improves trial-to-paid conversion (pre-commits)

---

## Step 5: Pricing Page Design

```
Principles:
1. Anchor with the most expensive plan first (left to right: Enterprise → Team → Pro → Free)
   — or center the recommended plan to draw the eye
2. Highlight the recommended plan visually
3. Show annual pricing by default (show monthly as alternative)
4. Annual/monthly toggle: show the savings amount ("Save $120/year")
5. Feature comparison: group by category, checkmark vs. dash — no complex matrices
6. FAQ section: answers objections before they become sales blockers
7. Trust signals below fold: logos, G2 rating, "no credit card required"
```

```
Psychological pricing:
- $49/month beats $50/month (charm pricing)
- Annual = $39/month beats Monthly = $49/month (framing saves)
- Show per-user price when total is scary ($8/user/month vs $800/month for 100 users)
- Show total cost when per-unit sounds like a lot ($0.001/event = $10/month for 10M events)
```

---

## Step 6: Pricing Analytics

Track these metrics to know if pricing is working:

| Metric | What it tells you | Target |
|--------|------------------|--------|
| Conversion rate (free → paid) | Is free tier too generous or price too high? | 2-5% for freemium |
| Time to convert | How long does trial to paid take? | < trial period |
| Average contract value (ACV) | Is deal size growing? | Trending up |
| Plan distribution | Are most on lowest tier? (bad) | Spread across tiers |
| Expansion revenue | Do customers upgrade over time? | NRR > 100% |
| Churn by plan | Which plan churns most? | All < 5% monthly |
| Upgrade triggers | What usage event precedes upgrade? | Identify and optimize |

**Key signal:** If >70% of paid customers are on your lowest tier, you're leaving money on the table or the higher tiers aren't valuable enough.

---

## Pricing for Engineers: What to Build

```typescript
// Entitlement system: check what features/limits a tenant has
interface Plan {
  id: string;
  name: string;
  limits: {
    apiCallsPerMonth: number;
    seats: number;
    projects: number;
    storageMb: number;
  };
  features: {
    sso: boolean;
    auditLog: boolean;
    customDomains: boolean;
    prioritySupport: boolean;
  };
}

// Check entitlement before serving a request
async function requireFeature(tenantId: string, feature: keyof Plan['features']) {
  const plan = await getTenantPlan(tenantId);
  if (!plan.features[feature]) {
    throw new ForbiddenError(`Feature '${feature}' requires a higher plan`);
  }
}

// Usage metering: track before enforcing limits
async function recordUsage(tenantId: string, metric: string, amount = 1) {
  const key = `usage:${tenantId}:${metric}:${getCurrentMonth()}`;
  const usage = await redis.incrBy(key, amount);
  await redis.expireAt(key, endOfMonth());
  return usage;
}

async function checkUsageLimit(tenantId: string, metric: keyof Plan['limits']) {
  const plan = await getTenantPlan(tenantId);
  const currentUsage = await getMonthlyUsage(tenantId, metric);
  if (currentUsage >= plan.limits[metric]) {
    throw new UsageLimitError(`${metric} limit of ${plan.limits[metric]} reached`);
  }
}
```

---

## Checklist

- [ ] Value metric chosen based on "scales with customer value" test
- [ ] Pricing model matches go-to-market motion (PLG → usage/seat, enterprise → committed)
- [ ] 3 tiers maximum (free optional; enterprise always contact sales)
- [ ] Each paid tier has 1-2 clear hero features that justify upgrade
- [ ] Annual pricing shown by default with clear savings callout
- [ ] Pricing page shows recommended plan visually
- [ ] Entitlement system enforces plan limits in code (not just UI)
- [ ] Usage metered and visible to customers (usage dashboard)
- [ ] Upgrade prompts shown contextually when limits approached (not just when hit)
- [ ] Pricing analytics dashboard tracking conversion by plan and upgrade triggers
