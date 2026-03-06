---
name: experiment-design
description: "A/B testing and experimentation workflow: hypothesis design, metric selection, sample size calculation, statistical significance, common pitfalls (peeking, SRM, novelty effect), and experiment lifecycle. Complements feature-flags (implementation) with statistical rigor."
---

# Experiment Design

> **Scope**: The *what* and *why* of experiments — statistical methodology, hypothesis design, and result analysis.
> For *how* to implement the flag that powers the experiment, see [feature-flags](../feature-flags/SKILL.md).

## When to Activate

- Designing an A/B test for a product change
- Choosing the right success metric for an experiment
- Calculating required sample size before launching
- Analyzing experiment results and deciding ship/kill
- Spotting and fixing a flawed experiment (SRM, peeking, novelty)
- Setting up an experimentation platform

---

## The Experiment Lifecycle

```
1. Hypothesis     →  What change, what metric, what direction?
2. Metric choice  →  Primary metric + guardrail metrics
3. Sample size    →  How many users, how long?
4. Launch         →  Random assignment via feature flag
5. Monitor        →  SRM check, guardrail watch (don't peek at results)
6. Analyze        →  Statistical significance, practical significance
7. Decision       →  Ship, iterate, or kill
8. Document       →  Record results for future reference
```

---

## Step 1: Hypothesis

A good hypothesis has three parts:

```
IF we [change],
THEN [metric] will [increase/decrease],
BECAUSE [mechanism].
```

**Good:**
> If we reduce checkout steps from 5 to 3, then checkout completion rate will increase, because fewer steps means less friction for users who abandon mid-flow.

**Bad:**
> If we redesign checkout, then users will like it more.
> *(No specific metric, no mechanism, "like" is unmeasurable)*

---

## Step 2: Metric Selection

### Primary metric (one only)
The single number that determines ship/kill. Choose the metric closest to the behavior you're changing:

| Change type | Good primary metric |
|-------------|-------------------|
| Checkout flow | Checkout completion rate |
| Email subject line | Open rate |
| Onboarding | Day-7 retention |
| Search relevance | Click-through rate |
| Pricing page | Plan upgrade rate |

### Guardrail metrics (2-5)
Metrics that must not degrade significantly:
- Revenue per user (always)
- Error rate / p99 latency (always)
- Support ticket rate
- Churn rate

A significant guardrail regression = kill the experiment, even if primary metric wins.

### Metric types

| Type | Formula | Notes |
|------|---------|-------|
| Conversion rate | converted / exposed | Binary, use z-test |
| Mean | sum / count | Continuous, use t-test |
| Ratio | numerator / denominator | Use delta method for variance |
| Retention | active at day N / cohort | Use survival analysis |

---

## Step 3: Sample Size Calculation

Required inputs:
- **Baseline rate** (current conversion rate, e.g. 5%)
- **MDE** (minimum detectable effect — smallest change worth shipping, e.g. +10% relative = 5.5%)
- **α** (false positive rate, default 0.05)
- **Power** (1 - false negative rate, default 0.80)

### Quick formula (two-proportion z-test)

```python
import math

def sample_size_per_variant(p_baseline, mde_relative, alpha=0.05, power=0.80):
    """
    p_baseline: current conversion rate (e.g. 0.05 for 5%)
    mde_relative: minimum detectable effect as relative change (e.g. 0.10 for +10%)
    """
    p_treatment = p_baseline * (1 + mde_relative)
    p_pooled = (p_baseline + p_treatment) / 2

    z_alpha = 1.96  # for alpha=0.05 two-tailed
    z_power = 0.84  # for power=0.80

    numerator = (z_alpha * math.sqrt(2 * p_pooled * (1 - p_pooled)) +
                 z_power * math.sqrt(p_baseline * (1 - p_baseline) +
                                     p_treatment * (1 - p_treatment))) ** 2
    denominator = (p_treatment - p_baseline) ** 2

    return math.ceil(numerator / denominator)

# Example: 5% baseline, need to detect +10% relative improvement
n = sample_size_per_variant(0.05, 0.10)
print(f"Need {n:,} users per variant ({n*2:,} total)")
# → Need ~31,000 per variant
```

### Runtime estimation

```
Days to run = sample_size_per_variant / (daily_exposed_users / num_variants)
```

**Rules:**
- Run for at least **1 full business cycle** (typically 2 weeks) regardless of significance
- Never end early because it looks good (peeking problem)
- Never extend because it "almost" reached significance

---

## Step 4: Random Assignment

Use your feature flag system for assignment. Critical requirements:

1. **Consistent hashing** — same user always gets same variant
2. **Unit of randomization** matches unit of analysis:
   - User-level metric → randomize by user_id
   - Session-level metric → randomize by session_id (only if users don't span sessions)
3. **Independent across experiments** — use different hash seeds per experiment
4. **Log assignment** — record which variant each user received at assignment time

```typescript
function assignVariant(userId: string, experimentId: string): 'control' | 'treatment' {
  const hash = murmurhash3(`${experimentId}:${userId}`);
  const bucket = hash % 100; // 0-99
  return bucket < 50 ? 'control' : 'treatment';
}
```

---

## Step 5: SRM Check (Sample Ratio Mismatch)

Before analyzing results, verify your assignment split is as expected:

```python
from scipy.stats import chi2_contingency
import numpy as np

def check_srm(control_count, treatment_count, expected_split=0.5):
    total = control_count + treatment_count
    expected_control = total * expected_split
    expected_treatment = total * (1 - expected_split)

    chi2, p, _, _ = chi2_contingency([
        [control_count, treatment_count],
        [expected_control, expected_treatment]
    ])
    return p  # p < 0.01 → SRM detected, do not trust results

p = check_srm(control_count=10234, treatment_count=9456)
if p < 0.01:
    print(f"⚠ SRM detected (p={p:.4f}) — investigate before analyzing")
```

SRM causes: logging bugs, bot traffic, cache serving stale variants, redirect chains.

---

## Step 6: Result Analysis

### Two-proportion z-test (conversion rates)

```python
from statsmodels.stats.proportion import proportions_ztest
import numpy as np

def analyze_experiment(control_conversions, control_n,
                       treatment_conversions, treatment_n):
    count = np.array([treatment_conversions, control_conversions])
    nobs  = np.array([treatment_n, control_n])

    z_stat, p_value = proportions_ztest(count, nobs)

    p_control   = control_conversions / control_n
    p_treatment = treatment_conversions / treatment_n
    lift        = (p_treatment - p_control) / p_control

    print(f"Control:   {p_control:.3%}")
    print(f"Treatment: {p_treatment:.3%}")
    print(f"Lift:      {lift:+.2%}")
    print(f"p-value:   {p_value:.4f} ({'significant' if p_value < 0.05 else 'not significant'})")

    return p_value < 0.05 and lift > 0
```

### 95% confidence interval

```python
from statsmodels.stats.proportion import proportion_confint

lo, hi = proportion_confint(
    treatment_conversions, treatment_n, alpha=0.05, method='wilson'
)
print(f"95% CI for treatment rate: [{lo:.3%}, {hi:.3%}]")
```

---

## Common Pitfalls

| Pitfall | Description | Fix |
|---------|-------------|-----|
| **Peeking** | Stopping early when you see p < 0.05 | Pre-commit to end date; use sequential testing if you need early stopping |
| **SRM** | Assignment split doesn't match expectation | Always run SRM check before analysis |
| **Novelty effect** | Users behave differently just because it's new | Run for at least 2 weeks; analyze long-term cohort |
| **Multiple testing** | Testing 5 metrics, one will be p < 0.05 by chance | Pre-register one primary metric; apply Bonferroni for secondary |
| **Network effects** | User A's treatment affects user B (social features) | Use cluster randomization (by household, team, etc.) |
| **Carryover** | User saw control, now in treatment and remembers | Washout period; exclude switchers |
| **Simpson's paradox** | Aggregate shows win, but loses in every segment | Segment by platform/country/plan before reporting |

---

## Decision Framework

| Result | Action |
|--------|--------|
| Significant positive primary, no guardrail regressions | Ship |
| Significant positive primary, guardrail regression | Investigate regression, fix and re-test |
| Significant negative primary | Kill |
| Not significant | Ship only if there's a strong qualitative reason; otherwise kill |
| SRM detected | Fix assignment bug, restart experiment |

---

## Experiment Documentation Template

```markdown
## Experiment: [Name]

**Hypothesis**: If [change], then [metric] will [direction], because [mechanism]
**Primary metric**: [metric name] (baseline: X%)
**MDE**: [X]% relative
**Guardrail metrics**: [list]
**Sample size**: [N per variant]
**Runtime**: [start] → [end] (N days)

### Results
| Metric | Control | Treatment | Lift | p-value | Significant? |
|--------|---------|-----------|------|---------|--------------|
| [primary] | | | | | |
| [guardrail 1] | | | | | |

**SRM check**: p=[X] ✓ / ✗
**Decision**: [Ship / Kill / Iterate]
**Learnings**: [What did we learn?]
```

---

## Related

- [feature-flags](../feature-flags/SKILL.md) — implementation of flag-based assignment
- [analytics-workflow](../analytics-workflow/SKILL.md) — tracking experiment exposure and conversion events
- `/experiment` command — walk through designing a new experiment
