---
description: Design a statistically valid A/B test. Walk through hypothesis, metric selection, sample size calculation, assignment strategy, and analysis plan. Outputs a ready-to-use experiment spec.
---

# Experiment — A/B Test Design Wizard

Design experiment for: $ARGUMENTS

---

## Step 1 — Extract experiment parameters

From $ARGUMENTS, identify:
- **What is changing?** (UI, algorithm, copy, pricing, flow)
- **Who is affected?** (all users, logged-in, segment)
- **What behavior do we expect to change?** (and why)

If any of these are unclear, ask before proceeding.

## Step 2 — Write the hypothesis

Format:
```
IF we [specific change],
THEN [metric name] will [increase/decrease by ~X%],
BECAUSE [mechanism — why would users behave differently?]
```

Reject vague hypotheses. The mechanism must be plausible and testable.

## Step 3 — Choose metrics

**Primary metric** (pick one):
- Must be directly affected by the change
- Must be measurable per user/session
- Must have enough baseline volume

**Guardrail metrics** (always include):
- Revenue per user
- Error rate / latency p99
- At least one long-term health metric (retention, churn)

**Explain why these metrics were chosen and why others were rejected.**

## Step 4 — Calculate sample size

Ask for or estimate:
- Current baseline rate of primary metric
- Minimum detectable effect (smallest change worth shipping)

Calculate using the formula:

```python
import math

def n_per_variant(p0, mde_rel, alpha=0.05, power=0.80):
    p1 = p0 * (1 + mde_rel)
    pp = (p0 + p1) / 2
    z_a, z_b = 1.96, 0.84
    return math.ceil(((z_a * math.sqrt(2 * pp * (1 - pp)) +
                       z_b * math.sqrt(p0*(1-p0) + p1*(1-p1))) ** 2) /
                     (p1 - p0) ** 2)
```

Also compute:
- Required runtime = `n_per_variant / (daily_traffic / 2)`
- Minimum runtime: 2 weeks regardless of sample size

## Step 5 — Define assignment strategy

- Unit of randomization: user_id (default) or session_id
- Traffic split: 50/50 (default) or partial rollout
- Hash seed: unique per experiment
- Exclusion criteria: new users only? existing users?

## Step 6 — Flag implementation outline

Describe the feature flag configuration:
```
Experiment ID: [kebab-case name]
Control: [current behavior]
Treatment: [new behavior]
Targeting: [who is eligible]
Rollout: 50% of eligible users
```

## Step 7 — Output experiment spec

Produce the following document:

```markdown
## Experiment Spec: [Name]

**Status**: Draft
**Owner**: [from context or "TBD"]
**Target launch**: TBD
**Target end**: TBD (minimum 2 weeks after launch)

### Hypothesis
IF [change], THEN [metric] will [direction ~X%], BECAUSE [mechanism].

### Metrics
**Primary**: [metric] — baseline [X%], MDE [Y%] relative
**Guardrails**: [list with current baselines]

### Sample size
- N per variant: [calculated]
- Total N: [2x]
- Daily exposed users: [estimate]
- Estimated runtime: [N weeks]

### Assignment
- Unit: user_id
- Split: 50/50
- Experiment ID: [kebab-case]
- Exclusions: [any]

### Pre-launch checklist
- [ ] SRM check configured (verify split within 1% of 50/50)
- [ ] Experiment exposure event tracked (`experiment_exposed`)
- [ ] Conversion event tracked
- [ ] Guardrail alerts set up
- [ ] Analysis query written before launch

### Analysis plan
- Statistical test: [z-test / t-test / Mann-Whitney]
- α = 0.05 (two-tailed)
- Power = 0.80
- Analysis date: [end date + 1 day]
- Decision criteria: [exact rule for ship/kill]
```
