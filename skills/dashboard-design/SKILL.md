---
name: dashboard-design
description: "Dashboard architecture and UX: KPI hierarchy, information density decisions, filter patterns, drill-down navigation, real-time update strategies (polling vs. WebSocket vs. SSE), empty and loading states for charts, and responsive dashboard layouts. Use when designing or building any analytics dashboard."
---

# Dashboard Design Skill

## When to Activate

- Designing or building an analytics dashboard from scratch
- Deciding on layout, widget placement, or information hierarchy
- Adding filters, date pickers, or drill-down navigation
- Implementing real-time data updates
- Designing empty, loading, and error states for dashboard widgets

---

## KPI Hierarchy

Structure information by importance, not by data availability.

### Layout tiers

```
┌─────────────────────────────────────────────────────────────────┐
│  PRIMARY KPIs  (large number, trend indicator, sparkline)        │
│  Revenue: $1.2M  ↑12%   Users: 48,320  ↑3%   NPS: 67  →0%    │
├─────────────────────────────────────────────────────────────────┤
│  SECONDARY CHARTS  (medium size, 2-3 per row)                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │ Sales     │  │ Traffic   │  │ Retention │                   │
│  │ by region │  │ sources   │  │ cohort    │                   │
│  └───────────┘  └───────────┘  └───────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│  SUPPORTING TABLES / DETAIL VIEWS  (full width, below the fold) │
│  Recent transactions | Top pages | Conversion funnel           │
└─────────────────────────────────────────────────────────────────┘
```

### Reading pattern

- **F-Pattern** — for data-dense dashboards (analysts); top-left priority
- **Z-Pattern** — for executive dashboards; headline metric top-left, key visual top-right, CTA bottom-right

### Audience-specific density

| Audience | Density | Interaction |
|----------|---------|-------------|
| Executive | Low — 3-5 KPIs, one chart | No filters, no drill-down |
| Manager | Medium — 6-10 KPIs, 3-4 charts | Date range, department filter |
| Analyst | High — full data tables, custom filters | Drill-down, export, comparisons |

---

## Information Density

### Progressive disclosure

Show summary → reveal detail on interaction:

```
Summary card: "Revenue: $1.2M ↑12%"
  → Click → Expand: monthly breakdown chart
  → Click "View details" → Full page with table + filters
```

### Drill-down pattern

```typescript
interface DrillDownState {
  level: 'overview' | 'region' | 'store';
  selection: string | null;
}

function Dashboard() {
  const [drill, setDrill] = useState<DrillDownState>({ level: 'overview', selection: null });

  return (
    <>
      <Breadcrumb drill={drill} onNavigate={setDrill} />
      {drill.level === 'overview' && <OverviewChart onDrillDown={(region) => setDrill({ level: 'region', selection: region })} />}
      {drill.level === 'region' && <RegionChart region={drill.selection!} onDrillDown={(store) => setDrill({ level: 'store', selection: store })} />}
      {drill.level === 'store' && <StoreDetail store={drill.selection!} />}
    </>
  );
}
```

---

## Filter Design

### Global vs. local filters

- **Global filters** (date range, user segment) — apply to all widgets; place in page header
- **Local filters** (sort order, top N) — apply to one widget; place inside the widget card

### Filter state URL serialization

```typescript
// Serialize filters to URL params — enables sharing and browser back/forward
import { useSearchParams } from 'react-router-dom';

function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    dateRange: searchParams.get('dateRange') ?? '30d',
    region: searchParams.get('region') ?? 'all',
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  return { filters, setFilter };
}
```

### Filter reset

Always provide a visible "Reset filters" link when non-default filters are active:

```tsx
{hasActiveFilters && (
  <button onClick={resetFilters} className="text-sm text-blue-600 hover:underline">
    Reset filters
  </button>
)}
```

### "No results" state

When filters produce no data, explain why and offer an escape:

```tsx
function NoResults({ filters }: { filters: Filters }) {
  return (
    <div className="flex flex-col items-center py-16">
      <SearchOffIcon className="h-12 w-12 text-gray-400" />
      <p className="mt-2 font-medium">No data for these filters</p>
      <p className="text-sm text-gray-500">
        Try changing the date range or removing the region filter.
      </p>
      <button onClick={resetFilters} className="mt-4 btn-secondary">
        Clear filters
      </button>
    </div>
  );
}
```

---

## Real-time Updates

### When to use which strategy

| Strategy | Latency | Complexity | Use when |
|----------|---------|-----------|----------|
| Polling | 5-60s | Low | Simple metrics, infrequent updates |
| SSE | <1s | Medium | Server-pushed updates, uni-directional |
| WebSocket | <100ms | High | Bi-directional, high-frequency (trading, live ops) |

### Polling

```typescript
function usePolledData<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(url);
      setData(await response.json());
    };

    fetchData(); // immediate first fetch
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [url, intervalMs]);

  return data;
}
```

### Server-Sent Events (SSE)

```typescript
function useSSE<T>(url: string) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    source.onerror = () => {
      // Browser auto-reconnects SSE; log but don't crash
      console.warn('SSE connection lost, reconnecting…');
    };

    return () => source.close();
  }, [url]);

  return data;
}
```

### Reconnect logic (WebSocket)

```typescript
function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [data, setData] = useState(null);

  const connect = useCallback(() => {
    wsRef.current = new WebSocket(url);

    wsRef.current.onmessage = (event) => setData(JSON.parse(event.data));

    wsRef.current.onclose = () => {
      // Exponential backoff reconnect
      setTimeout(connect, Math.min(1000 * 2 ** reconnectCount.current, 30_000));
      reconnectCount.current++;
    };

    wsRef.current.onopen = () => { reconnectCount.current = 0; };
  }, [url]);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  return data;
}
```

### Optimistic updates

Update the UI immediately before the server confirms:

```typescript
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateMetric,
  onMutate: async (newValue) => {
    await queryClient.cancelQueries({ queryKey: ['metrics'] });
    const previous = queryClient.getQueryData(['metrics']);
    queryClient.setQueryData(['metrics'], (old) => ({ ...old, value: newValue }));
    return { previous };
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(['metrics'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  },
});
```

---

## Chart States

Every chart widget must implement all four states.

### Loading state — skeleton

```tsx
function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" /> {/* title */}
      <div className="flex items-end gap-2 h-48">
        {[0.6, 0.9, 0.4, 0.7, 1, 0.5, 0.8].map((h, i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${h * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
```

### Empty state — no data yet

```tsx
function EmptyChart({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <ChartBarIcon className="h-10 w-10 text-gray-300" />
      <p className="mt-2 text-sm font-medium text-gray-500">No {title} data yet</p>
      <p className="text-xs text-gray-400">Data will appear once activity begins.</p>
    </div>
  );
}
```

### Error state — with retry

```tsx
function ChartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-48">
      <ExclamationTriangleIcon className="h-10 w-10 text-red-400" />
      <p className="mt-2 text-sm font-medium">Failed to load chart</p>
      <button onClick={onRetry} className="mt-3 btn-secondary text-sm">Retry</button>
    </div>
  );
}
```

### Partial data warning

```tsx
{data.isPartial && (
  <p className="text-xs text-amber-600 mt-1">
    Showing data through {format(data.lastUpdated, 'MMM d, HH:mm')} — real-time data may be delayed.
  </p>
)}
```

---

## Responsive Dashboard Layouts

### CSS Grid dashboard

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
}

/* KPI cards — 3 per row on desktop, 2 on tablet, 1 on mobile */
.kpi-card {
  grid-column: span 4;
}
@media (max-width: 1024px) { .kpi-card { grid-column: span 6; } }
@media (max-width: 640px)  { .kpi-card { grid-column: span 12; } }

/* Main chart — 8 columns, sidebar — 4 columns */
.main-chart { grid-column: span 8; }
.sidebar    { grid-column: span 4; }
@media (max-width: 1024px) {
  .main-chart, .sidebar { grid-column: span 12; }
}
```

### Widget reorder on mobile

On mobile, stack widgets vertically in priority order (most important first). Do not rely on CSS order — explicitly set the visual order for mobile:

```css
@media (max-width: 640px) {
  .revenue-kpi { order: 1; }
  .users-kpi   { order: 2; }
  .main-chart  { order: 3; }
  .sidebar     { order: 4; }
  .detail-table { order: 5; }
}
```

---

## Checklist

- [ ] Primary KPIs at top (large number, trend %)
- [ ] Secondary charts in middle tier
- [ ] Detail tables below the fold
- [ ] Reading pattern matches audience (F-pattern for analysts, Z for executives)
- [ ] Global filters in page header; local filters inside widget
- [ ] Filter state serialized to URL params
- [ ] "No results" state with clear explanation and reset action
- [ ] Real-time strategy chosen based on latency requirement (polling/SSE/WebSocket)
- [ ] Reconnect logic for WebSocket
- [ ] Loading skeleton implemented for every chart widget
- [ ] Empty state implemented (distinct from error state)
- [ ] Error state with retry button
- [ ] Responsive CSS Grid layout (12-column)
- [ ] Mobile widget order matches importance priority
