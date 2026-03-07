---
description: Review data visualizations for chart type appropriateness, WCAG accessibility (color contrast, ARIA), responsive behavior, and performance. Applies data-visualization skill.
---

# Chart Review

Review chart and data visualization components for correctness, accessibility, and performance.

## Steps

### 1. Find chart components

Search the codebase for chart components using these patterns:

```
Glob: **/*{Chart,Graph,Viz,Visualization,chart,graph}*.*
Glob: **/recharts/**
Glob: **/d3/**
Glob: **/chartjs/**
```

If `$ARGUMENTS` specifies a file or directory, scope the search there.

### 2. Check chart type appropriateness

For each chart found, verify the chart type matches the data relationship:

| Data relationship | Appropriate chart | Red flag |
|---|---|---|
| Comparison across categories | Bar chart | Pie with many segments |
| Trend over time | Line chart | Bar chart for continuous time |
| Correlation | Scatter plot | — |
| Part-to-whole | Pie (≤5), Stacked bar (>5) | 3D chart |
| Hierarchy | Treemap | Nested pie |

Flag: `[HIGH]` wrong chart type; `[MEDIUM]` suboptimal choice.

### 3. Check ARIA accessibility

- SVG elements must have `role="img"` and `aria-label` (or `<title>` + `<desc>` children)
- Data encoding must not rely solely on color (check if patterns or shapes also encode information)
- Touch targets for interactive charts must be ≥44px

Flag: `[HIGH]` missing ARIA on SVG; `[MEDIUM]` color-only encoding.

### 4. Check color palette

Grep for hardcoded color values in chart components. Flag if:
- Red (`#ff0000`, `red`) and green (`#00ff00`, `green`) are the only two colors used (color-blind risk)
- No palette constant is referenced (magic hex strings)

Suggest: Okabe-Ito palette or ColorBrewer as replacement.

Flag: `[HIGH]` red/green only; `[MEDIUM]` magic hex strings.

### 5. Check responsive SVG

- SVG must have `viewBox` attribute set
- SVG must not have fixed `width`/`height` in pixels (or must use `100%` with container)
- `preserveAspectRatio` should be set for non-square charts

Flag: `[MEDIUM]` missing viewBox; `[LOW]` fixed pixel dimensions.

### 6. Check chart states

For each chart component, verify:
- Loading state (skeleton or spinner)
- Empty state (no data message, distinct from loading)
- Error state (with retry action)

Flag: `[HIGH]` no error state; `[MEDIUM]` missing empty state or loading skeleton.

### 7. Check performance

- For charts rendering >500 data points client-side via SVG → flag for Canvas consideration
- Look for `data.map()` inside render that could be memoized
- Check if resize handlers are debounced

Flag: `[MEDIUM]` unbounded SVG rendering; `[LOW]` missing memoization.

## Output Format

```
[SEVERITY] Issue Title
File: path/to/chart.tsx:42
Issue: What is wrong.
Fix: Suggested change.
```

End with a summary table and verdict.

## Reference Skill

`data-visualization` — chart type decision table, ARIA patterns, Okabe-Ito palette, responsive SVG, Canvas vs. SVG threshold
`dashboard-design` — chart states (loading/empty/error), real-time update strategies
