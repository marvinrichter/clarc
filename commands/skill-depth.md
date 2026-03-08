---
description: Analyze a clarc skill for prompt-engineering quality — actionability ratio, trigger precision, example completeness, internal consistency, length calibration, cross-reference validity, and freshness. Deeper analysis than /skill-stocktake. Use /skill-depth --all to analyze all skills.
---

# Skill Depth Analysis

Invoke the **skill-depth-analyzer** agent to evaluate one or all clarc skills against a 7-dimension prompt-engineering quality rubric.

## Usage

```
/skill-depth <skill-name>    — analyze a specific skill
/skill-depth --all           — analyze all skills in skills/
```

## vs. /skill-stocktake

| | `/skill-stocktake` | `/skill-depth` |
|--|--|--|
| Focus | Quality, freshness, overlap | Prompt-engineering depth |
| Actionability ratio | ❌ | ✅ |
| Cross-reference verification | ❌ | ✅ |
| Example completeness scoring | ❌ | ✅ |
| Internal consistency check | ❌ | ✅ |
| Length calibration | ❌ | ✅ |

Use `/skill-stocktake` for a quick system overview. Use `/skill-depth` to deeply improve individual skills.

## What It Scores

| Dimension | Weight | What it checks |
|-----------|--------|---------------|
| Actionability Ratio | 25% | ≥40% of content is code/commands/concrete patterns? |
| Trigger Precision | 20% | Is "When to Activate" specific enough to avoid mis-triggering? |
| Example Completeness | 20% | Are examples complete and runnable (not just pseudo-code)? |
| Internal Consistency | 15% | Do sections contradict each other? Is terminology consistent? |
| Length Calibration | 10% | 100–300 lines ideal; <50 too thin; >400 unfocused |
| Cross-Reference Validity | 5% | Do referenced skills/agents/commands actually exist? |
| Freshness | 5% | Are library versions, APIs, and patterns current? |

**Weighted score:**
```
overall = actionability×0.25 + trigger×0.20 + examples×0.20 +
          consistency×0.15 + length×0.10 + crossrefs×0.05 + freshness×0.05
```

## Output

### Single Skill (`/skill-depth typescript-patterns`)

```json
{
  "skill": "typescript-patterns",
  "file": "skills/typescript-patterns/SKILL.md",
  "total_lines": 220,
  "code_lines": 114,
  "actionability_pct": 52,
  "example_count": 5,
  "overall_score": 8.4,
  "dimensions": {
    "actionability_ratio":      { "score": 9, "note": "52% code content, 5 complete examples" },
    "trigger_precision":        { "score": 8, "note": "Trigger specifies TypeScript type-system scenarios" },
    "example_completeness":     { "score": 9, "note": "All examples are complete with imports" },
    "internal_consistency":     { "score": 8, "note": "Minor: 'interface' vs 'type' preference inconsistent" },
    "length_calibration":       { "score": 9, "note": "220 lines — within ideal range" },
    "cross_reference_validity": { "score": 10, "note": "All references verified" },
    "freshness":                { "score": 7, "note": "TypeScript 5.x patterns — current" }
  },
  "issues": [],
  "verdict": "EXCELLENT — no issues found"
}
```

### All Skills (`/skill-depth --all`)

Summary table sorted by score ascending, followed by full JSON for skills below 7.0.

Results saved to `docs/system-review/skill-depth-<date>.json`.

```
| Skill | Score | Lines | Actionability | Issues |
|-------|-------|-------|---------------|--------|
| debugging-workflow | 5.9 | 28 | 18% | HIGH: too thin, HIGH: no examples |
| typescript-patterns | 8.4 | 220 | 52% | — |
```

## Steps Claude Should Follow

1. **Delegate to skill-depth-analyzer**: Launch it with the skill name or `--all` flag
2. **For single skill**: Display the scored JSON and highlight HIGH/MEDIUM issues
3. **For --all mode**:
   - Save results to `docs/system-review/skill-depth-YYYY-MM-DD.json`
   - Display the summary table (sorted by score ascending)
   - Print full JSON only for skills scoring below 7.0
4. **Suggest improvements**: For each HIGH issue, provide a concrete fix suggestion
