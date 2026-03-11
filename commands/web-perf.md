---
description: Web performance audit — run Lighthouse, interpret Core Web Vitals, analyze bundle, identify quick wins, and set up regression prevention
---

# Web Performance Audit Command

Audit web performance and improve Core Web Vitals: $ARGUMENTS

## Your Task

Run a comprehensive web performance audit: measure Core Web Vitals, analyze the bundle, identify the top opportunities, create a prioritized improvement plan, and optionally set up Lighthouse CI for regression prevention.

## Step 1 — Install Tools

```bash
# Lighthouse CLI
npm install -g lighthouse @lhci/cli

# Chrome is required (headless)
# macOS: already installed if Chrome is present
# Linux: apt-get install -y google-chrome-stable
```

## Step 2 — Run Lighthouse Audit

```bash
# Basic audit (opens browser report)
npx lighthouse https://myapp.com --view

# JSON for parsing
npx lighthouse https://myapp.com \
  --output json \
  --output html \
  --output-path ./lighthouse-report \
  --only-categories performance,accessibility,best-practices,seo

# Mobile simulation (default) vs. Desktop
npx lighthouse https://myapp.com --preset=desktop --view

# Throttling options
npx lighthouse https://myapp.com \
  --throttling-method=devtools \  # More realistic than simulated
  --view
```

Parse key metrics from JSON:
```bash
npx lighthouse https://myapp.com --output json | jq '{
  score: (.categories.performance.score * 100 | round),
  lcp: .audits["largest-contentful-paint"].displayValue,
  cls: .audits["cumulative-layout-shift"].displayValue,
  inp: .audits["interaction-to-next-paint"].displayValue,
  tbt: .audits["total-blocking-time"].displayValue,
  fcp: .audits["first-contentful-paint"].displayValue,
  ttfb: .audits["server-response-time"].displayValue,
  opportunities: [.audits | to_entries[] | select(.value.details.type == "opportunity") | {audit: .key, savings: .value.details.overallSavingsMs}] | sort_by(-.savings) | .[0:5]
}'
```

## Step 3 — Interpret Core Web Vitals

Interpret each metric and identify root causes:

**TTFB (Time to First Byte) — Server Response**
- < 200ms: Excellent
- 200–600ms: OK
- > 600ms: Fix server first before any other optimization

Root causes of slow TTFB:
- No CDN for static HTML
- Server-side computation slow (database queries, external API calls)
- Cold starts (serverless functions)

Fix:
```bash
# Check server response time
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" https://myapp.com
```

**LCP (Largest Contentful Paint)**
- < 2.5s: Good
- 2.5–4s: Needs improvement
- > 4s: Poor

Diagnostic flow:
1. If TTFB > 600ms → fix server first
2. If render-blocking resources exist → defer/async JS, inline critical CSS
3. If LCP element is an image → preload it
4. If LCP element is loaded via JS → server-render it

**CLS (Cumulative Layout Shift)**
- < 0.1: Good
- 0.1–0.25: Needs improvement
- > 0.25: Poor

Find the shifting elements:
```javascript
// Add to browser console on your page:
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        console.log('Layout shift:', entry.value, entry.sources);
    }
}).observe({ type: 'layout-shift', buffered: true });
```

**INP (Interaction to Next Paint)**
- < 200ms: Good
- 200–500ms: Needs improvement
- > 500ms: Poor

Find long tasks:
```javascript
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
            console.log('Long task:', entry.duration + 'ms', entry);
        }
    }
}).observe({ type: 'longtask', buffered: true });
```

## Step 4 — Bundle Analysis

Detect the bundler and run analysis:

```bash
# Detect bundler
cat package.json | jq '.devDependencies | keys[]' | grep -E "webpack|vite|rollup|parcel|esbuild"
```

**webpack:**
```bash
# Add to webpack.config.js or run directly
WEBPACK_BUNDLE_ANALYZER=true npm run build
# or
npx webpack --profile --json > stats.json && npx webpack-bundle-analyzer stats.json
```

**Vite:**
```bash
# vite.config.ts — add visualizer plugin temporarily
npm install -D rollup-plugin-visualizer
# Add: plugins: [visualizer({ open: true, gzipSize: true })]
npm run build
```

**Next.js:**
```bash
npm install -D @next/bundle-analyzer
ANALYZE=true npm run build
```

**Interpret the treemap:**

Look for:
1. **Unexpectedly large packages** — candidates for replacement or lazy loading
2. **Duplicates** — same library in multiple chunks (webpack optimization needed)
3. **moment.js** → replace with `date-fns` or `dayjs` (10x smaller)
4. **lodash** without tree shaking → use `lodash-es` + tree shaking
5. **All of a library when only one function is used** → import specifically

Quick wins to check:
```bash
# Check if moment.js is used
npx bundlesize  # or
du -sh node_modules/moment   # 67MB locales

# Find what's using large packages
cat node_modules/large-pkg/package.json | jq '.name, .version'
npm why large-pkg
```

## Step 5 — Quick Wins Assessment

For each opportunity from Lighthouse, assess impact × effort:

| Metric | Issue | Fix | Impact | Effort |
|--------|-------|-----|--------|--------|
| LCP | Hero image not preloaded | `<link rel="preload" as="image">` | High | 15 min |
| LCP | Render-blocking JS | Add `defer` attribute | High | 30 min |
| CLS | Images without dimensions | Add `width`/`height` | Medium | 1h |
| LCP | No image compression | Convert to WebP | Medium | 2h |
| Bundle | `moment.js` (67KB) | Replace with `dayjs` (2KB) | Medium | 4h |
| TBT | Long tasks on interaction | Break up with setTimeout | High | 1 day |
| INP | Heavy React re-render | Add `React.memo` / `useMemo` | Medium | 4h |

## Step 6 — Prioritized Improvement Plan

Output:

```markdown
## Web Performance Audit Results

**URL:** [url]
**Date:** [YYYY-MM-DD]
**Device:** Mobile / Desktop

### Scores
| Metric | Score | Status |
|--------|-------|--------|
| Performance | [N]/100 | [🔴/🟡/🟢] |
| LCP | [Xs] | [🔴/🟡/🟢] |
| CLS | [N] | [🔴/🟡/🟢] |
| INP | [Xms] | [🔴/🟡/🟢] |
| TTFB | [Xms] | [🔴/🟡/🟢] |

### Priority 1: Fix This Today (< 2 hours total)
1. **[Issue]**: [exact fix]
   - Expected: LCP improves by ~Xs

### Priority 2: Fix This Week
1. **[Issue]**: [exact fix]

### Priority 3: Fix This Month
1. **[Issue]**: [exact fix]

### Bundle Opportunities
- [Package]: [Xkb] — replace with [alternative] ([Xkb])
- Code split: [route] — estimated [Xkb] savings

### Regression Prevention
Set up Lighthouse CI to catch regressions: see `/web-perf --setup-ci`
```

## Step 7 — Lighthouse CI Setup (Optional)

If the user wants regression prevention:

```bash
# Install
npm install -D @lhci/cli

# Create configuration
cat > lighthouserc.js << 'EOF'
module.exports = {
    ci: {
        collect: {
            url: ['http://localhost:3000/'],
            numberOfRuns: 3,
            settings: { preset: 'desktop' }
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', {minScore: 0.85}],
                'largest-contentful-paint': ['error', {maxNumericValue: 3000}],
                'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
                'total-blocking-time': ['warn', {maxNumericValue: 400}],
            },
        },
        upload: { target: 'temporary-public-storage' },
    },
};
EOF
```

Generate `.github/workflows/lighthouse.yml`:
```yaml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20}
      - run: npm ci && npm run build
      - run: npm start &
      - run: npx wait-on http://localhost:3000
      - run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Reference Skills

- `web-performance` — detailed Core Web Vitals patterns, React optimization, font performance
- `performance-profiling` — server-side profiling when backend is the bottleneck
- `load-testing` — server performance under realistic traffic

## After This

- `/tdd` — add performance regression tests for critical metrics
- `/code-review` — review performance optimisation changes
