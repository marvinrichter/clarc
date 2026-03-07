---
name: data-visualization
description: "Data visualization implementation: chart type selection framework (when to use bar/line/scatter/pie/heatmap/treemap), D3.js patterns, Recharts/Chart.js/Victory integration, accessible charts (ARIA roles, color-blind safe palettes), responsive SVG patterns, and performance for large datasets. Use when implementing any chart or graph."
---

# Data Visualization Skill

## When to Activate

- Implementing any chart, graph, or data visualization component
- Choosing the right chart type for a dataset
- Adding accessibility (ARIA, color-blind-safe palettes) to existing charts
- Optimizing chart performance for large datasets
- Making SVG charts responsive

---

## Chart Type Selection

### Decision table

| Goal | Chart Type | When NOT to use |
|------|-----------|----------------|
| Compare values across categories | Bar chart (vertical) | More than ~15 categories |
| Compare many categories | Horizontal bar | — |
| Show trend over time | Line chart | Non-continuous data |
| Show distribution | Histogram / Box plot | Fewer than 30 data points |
| Show correlation between two variables | Scatter plot | — |
| Show part-to-whole (≤5 segments) | Pie / Donut chart | More than 5 segments → use stacked bar |
| Show part-to-whole with many segments | Stacked bar chart | — |
| Show hierarchical data | Treemap / Sunburst | More than 3 levels deep |
| Show density across two dimensions | Heatmap | — |
| Show geographic data | Choropleth map | Non-geographic comparisons |

### Anti-patterns

- **3D charts** — distort perception of value; never use
- **Pie with >5 segments** — use horizontal bar instead
- **Dual Y-axis** — misleads; prefer two separate charts
- **Truncated Y-axis** — starting Y above 0 exaggerates differences; only acceptable for line charts showing trend

---

## D3.js Patterns

### Data Join (enter/update/exit)

```typescript
import * as d3 from 'd3';

const svg = d3.select('#chart').append('svg').attr('width', width).attr('height', height);

// Bind data
const bars = svg.selectAll('rect').data(data, d => d.id);

// Enter — new elements
bars.enter()
  .append('rect')
  .attr('x', d => xScale(d.category))
  .attr('y', d => yScale(d.value))
  .attr('width', xScale.bandwidth())
  .attr('height', d => height - yScale(d.value))
  .attr('fill', '#4f46e5');

// Update — existing elements
bars
  .attr('y', d => yScale(d.value))
  .attr('height', d => height - yScale(d.value));

// Exit — removed elements
bars.exit().remove();
```

### Scale types

```typescript
// Linear scale — continuous numeric data
const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, width]);

// Time scale — date/time axis
const xScale = d3.scaleTime().domain([startDate, endDate]).range([0, width]);

// Band scale — categorical axis (bar charts)
const xScale = d3.scaleBand()
  .domain(categories)
  .range([0, width])
  .padding(0.1);

// Ordinal scale — color mapping
const colorScale = d3.scaleOrdinal()
  .domain(categories)
  .range(d3.schemeTableau10);
```

### Axis setup

```typescript
const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2s'));
const yAxis = d3.axisLeft(yScale).tickFormat(d => `${d}%`);

svg.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0, ${height})`)
  .call(xAxis);

svg.append('g').attr('class', 'y-axis').call(yAxis);
```

### Responsive SVG (viewBox)

```typescript
// Use viewBox instead of fixed width/height
const svg = d3.select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .attr('preserveAspectRatio', 'xMidYMid meet')
  .style('width', '100%')
  .style('height', 'auto');
```

### Transitions

```typescript
bars.transition()
  .duration(300)
  .ease(d3.easeQuadOut)
  .attr('height', d => height - yScale(d.value))
  .attr('y', d => yScale(d.value));
```

---

## React Chart Libraries

| Library | Best for | Trade-offs |
|---------|----------|-----------|
| **Recharts** | Dashboards, simple charts, React-native API | Less customizable than D3 |
| **Victory** | Animated charts, React Native support | Larger bundle |
| **Chart.js + react-chartjs-2** | Canvas-based, performance with many points | Canvas rendering |
| **Observable Plot** | Data exploration, R-style API | Not production-component-focused |
| **D3** | Custom charts, complex interactions | High learning curve |

### Recharts — minimal bar chart

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function SalesChart({ data }: { data: { month: string; sales: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} />
        <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Sales']} />
        <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## Accessibility

### ARIA on SVG

```tsx
// Wrap SVG with role + aria-label
<svg
  role="img"
  aria-label="Monthly sales from January to December 2024, showing 40% growth"
  viewBox="0 0 800 400"
>
  {/* Provide title + description for screen readers */}
  <title>Monthly Sales 2024</title>
  <desc>Bar chart showing monthly sales revenue. January: $12,000. February: $15,000...</desc>

  {/* Chart content */}
</svg>
```

### Color-blind-safe palettes

Avoid encoding information in red/green alone. Use these tested palettes:

```typescript
// Okabe-Ito — safe for all color vision deficiencies (8 colors)
const OKABE_ITO = [
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#F0E442', // yellow
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
  '#000000', // black
];

// For sequential data — use perceptually uniform single-hue scale
const scale = d3.scaleSequential(d3.interpolateViridis).domain([0, maxValue]);
```

### Texture for critical distinctions

When color alone cannot be relied on, add patterns:

```tsx
// SVG pattern for hatch fill
<defs>
  <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#4f46e5" strokeWidth="1" />
  </pattern>
</defs>
<rect fill="url(#hatch)" />
```

---

## Responsive Charts

### ResizeObserver pattern

```typescript
import { useEffect, useRef, useState } from 'react';

function useChartDimensions(ref: React.RefObject<HTMLDivElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
}
```

### Mobile breakpoints for axis labels

```typescript
// Rotate labels on small screens
const tickAngle = width < 400 ? -45 : 0;
const textAnchor = width < 400 ? 'end' : 'middle';
```

---

## Performance for Large Datasets

### Canvas vs. SVG threshold

| Dataset size | Recommendation |
|---|---|
| < 500 points | SVG (better accessibility, hover events) |
| 500–5000 points | SVG with path aggregation or simplification |
| > 5000 points | Canvas rendering (Chart.js canvas, PixiJS) |

### Aggregation on server

Do not render 100,000 points — aggregate first:

```typescript
// Send aggregated data from server
// Bin into N buckets on backend, send max N=500 points to client
const binned = d3.bin()
  .domain(xScale.domain())
  .thresholds(200)(data.map(d => d.value));
```

### Debounced resize

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash-es';

const debouncedResize = useMemo(
  () => debounce(setDimensions, 100),
  []
);
```

---

## Checklist

- [ ] Chart type matches data relationship (comparison/trend/correlation/composition/hierarchy)
- [ ] No 3D charts, no dual Y-axis
- [ ] SVG has `role="img"` and `aria-label` or `<title>` + `<desc>`
- [ ] Color palette is color-blind-safe (Okabe-Ito or similar)
- [ ] No red/green as sole distinguishing colors
- [ ] `viewBox` set for responsive scaling
- [ ] ResizeObserver used for dynamic width (not window resize alone)
- [ ] Canvas rendering for >5000 data points
- [ ] Server-side aggregation for very large datasets
- [ ] Loading, empty, and error states implemented
- [ ] Axis labels readable at mobile breakpoints
