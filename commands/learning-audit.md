---
description: Audit the effectiveness of the clarc continuous-learning-v2 loop — instinct quality, conflict detector accuracy, evolution velocity, and learning coverage gaps. Produces a structured health report for the learning system.
---

# Learning Loop Audit

Analyze the health and effectiveness of the `continuous-learning-v2` learning flywheel.

## Usage

```
/learning-audit             — full audit of the learning system
/learning-audit --quick     — instinct quality check only (faster)
```

## What It Analyzes

### 1. Instinct Quality

Read all instincts from `skills/continuous-learning-v2/instincts/` (or wherever stored).

For each instinct, assess:
- **Specificity**: Is it actionable? ("Always run prettier before committing" ✓ vs "Write good code" ✗)
- **Redundancy**: Does it semantically duplicate another instinct?
- **Freshness**: When was it last updated? >90 days without reinforcement → stale
- **Applicability**: Has this instinct been applied in recent sessions?

Report:
```
Instinct Quality Summary:
  Total instincts: N
  Actionable (specific): N (X%)
  Redundant pairs: N
  Stale (>90 days): N
  Well-formed: N (X%)
```

### 2. Conflict Detector Accuracy

Run the conflict detector on the current instinct set:
```bash
python3 skills/continuous-learning-v2/scripts/conflict-detector.py
```

If the script exists and outputs `conflicts.json`:
- How many conflicts detected?
- Spot-check 3–5 flagged pairs: are they true conflicts or false positives?
- Estimate True Positive Rate (if detectable from context)

Report:
```
Conflict Detector:
  Conflicts found: N
  Estimated true positives: N
  False positives detected: N
  Recommendation: [action or "no action needed"]
```

### 3. Evolution Velocity

Check conversion metrics:
- How many instincts exist total?
- Check git log for `/evolve` command usage (commits mentioning "evolve" or "instinct → skill")
- Check `skills/` for recently created skills (git log on skills/)
- Estimate: Instinct → Skill conversion rate

Report:
```
Evolution Velocity:
  Total instincts: N
  Skills created from instincts: N (estimated from git history)
  Conversion rate: X% (target: ~20% of instincts become skills)
  Last evolve run: YYYY-MM-DD (or "unknown")
```

### 4. Learning Coverage Gaps

Cross-reference instincts with the coverage map at `docs/system-review/coverage-map.md` (if available):
- Which uncovered scenarios from the coverage map have NO related instincts?
- Which developer workflows are never mentioned in the instinct corpus?

Report:
```
Coverage Gaps:
  Scenarios with no instinct coverage:
    - Load Testing (no instincts about performance testing patterns)
    - Incident Management (no instincts about production incident response)
    - ...
```

## Steps Claude Should Follow

1. **Read instinct files**: Check `skills/continuous-learning-v2/` for instinct storage format and location
2. **Run conflict detector** (if available): `python3 skills/continuous-learning-v2/scripts/conflict-detector.py`
3. **Check git log for evolution**: `git log --oneline --all | grep -i "evolve\|instinct"` to estimate velocity
4. **Check coverage map**: Read `docs/system-review/coverage-map.md` if present
5. **Produce report**: Structured markdown report saved to `docs/system-review/learning-audit-YYYY-MM-DD.md`
6. **Recommendations**: End with 3–5 specific actionable recommendations ranked by impact

## Output Format

```markdown
# Learning Loop Audit — YYYY-MM-DD

## Overall Health: [HEALTHY | NEEDS ATTENTION | CRITICAL]

## Instinct Quality
[summary table]

## Conflict Detector
[results]

## Evolution Velocity
[metrics]

## Coverage Gaps
[list of uncovered scenarios]

## Recommendations
1. [highest impact action]
2. ...
```

Save to: `docs/system-review/learning-audit-YYYY-MM-DD.md`
