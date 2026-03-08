---
name: web-performance
description: "Web performance optimization: Core Web Vitals (LCP, CLS, INP), Lighthouse CI with budget configuration, bundle analysis (webpack-bundle-analyzer, vite-bundle-visualizer), hydration performance, network waterfall reading, image optimization (WebP/AVIF, srcset), and font performance."
---

# Web Performance Skill

Slow websites lose users. Google uses Core Web Vitals for search ranking. This skill covers measuring, diagnosing, and fixing web performance — from server response time to the last pixel painted.

## When to Activate

- Core Web Vitals are failing in Search Console or Lighthouse
- Bundle size has grown and pages feel slow
- Setting up Lighthouse CI to prevent regressions
- Diagnosing why a page's LCP or INP is poor
- Before a major release that changes the critical rendering path

---

## Core Web Vitals

The three metrics Google uses for search ranking and UX quality:

### LCP — Largest Contentful Paint

**What:** Time until the largest visible element (hero image, heading) is fully rendered.
**Target:** < 2.5s (Good), 2.5–4s (Needs Improvement), > 4s (Poor)

**Common causes of poor LCP:**
1. Slow server response (TTFB > 600ms)
2. Render-blocking resources (CSS/JS in `<head>` without `defer`/`async`)
3. Slow LCP image (not preloaded, not optimized)
4. Client-side rendering (entire page waits for JS)

**Fixes:**
```html
<!-- Preload LCP image -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<!-- Avoid lazy-loading the LCP image -->
<img src="/hero.webp" alt="Hero" loading="eager" fetchpriority="high">
<!-- NOT: loading="lazy" — never lazy-load the LCP element -->

<!-- Preconnect to critical third-party origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

```javascript
// Next.js — priority for LCP image
import Image from 'next/image';
<Image src="/hero.webp" alt="Hero" priority width={1200} height={600} />
```

### CLS — Cumulative Layout Shift

**What:** Total unexpected layout shift during page load. 0 = no shift.
**Target:** < 0.1 (Good), 0.1–0.25 (Needs Improvement), > 0.25 (Poor)

**Common causes:**
1. Images without `width` and `height` attributes
2. Ads or iframes injected without reserved space
3. Dynamic content (banners, cookie notices) inserted above existing content
4. Web fonts causing FOUT (Flash of Unstyled Text)

**Fixes:**
```html
<!-- Always specify dimensions -->
<img src="/photo.jpg" width="800" height="600" alt="...">

<!-- CSS aspect ratio box to reserve space -->
<div style="aspect-ratio: 16/9;">
  <img src="/video-thumbnail.jpg" style="width: 100%; height: 100%; object-fit: cover;">
</div>

<!-- Reserve space for ads -->
<div style="min-height: 250px;">
  <!-- ad loads here -->
</div>
```

```css
/* Font: swap prevents invisible text, reduces CLS from font loading */
@font-face {
  font-family: 'MyFont';
  font-display: swap;  /* Show fallback, swap when loaded */
  src: url('/fonts/myfont.woff2') format('woff2');
}
```

### INP — Interaction to Next Paint

**What:** Latency from user interaction (click, tap, key press) to next paint. Replaced FID in March 2024.
**Target:** < 200ms (Good), 200–500ms (Needs Improvement), > 500ms (Poor)

**Common causes:**
1. Long tasks blocking the main thread (> 100ms)
2. Synchronous heavy computation on user interaction
3. Layout thrashing (read/write DOM in loop)
4. Large React re-renders on every keystroke

**Fixes:**
```javascript
// Break up long tasks
function processLargeList(items) {
    return new Promise(resolve => {
        const results = [];
        let i = 0;

        function processChunk() {
            const deadline = performance.now() + 5; // 5ms budget
            while (i < items.length && performance.now() < deadline) {
                results.push(heavyProcess(items[i++]));
            }
            if (i < items.length) {
                // Yield to browser for paint/input events
                setTimeout(processChunk, 0);
            } else {
                resolve(results);
            }
        }
        processChunk();
    });
}

// Use scheduler.postTask for prioritized work
scheduler.postTask(() => heavyComputation(), { priority: 'background' });
```

---

## Lighthouse CI

### Local Audit

```bash
# Quick audit
npx lighthouse https://myapp.com --view

# JSON output for parsing
npx lighthouse https://myapp.com --output json --output-path report.json

# Performance metrics only
npx lighthouse https://myapp.com --only-categories=performance --output json \
  | jq '.categories.performance.score * 100'
```

### Lighthouse CI (GitHub Actions)

```bash
# Install
npm install -g @lhci/cli
```

```javascript
// lighthouserc.js
module.exports = {
    ci: {
        collect: {
            url: ['http://localhost:3000/', 'http://localhost:3000/about'],
            numberOfRuns: 3,
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', {minScore: 0.9}],
                'categories:accessibility': ['error', {minScore: 0.9}],
                'first-contentful-paint': ['warn', {maxNumericValue: 2000}],
                'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
                'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
                'total-blocking-time': ['warn', {maxNumericValue: 300}],
                'interactive': ['warn', {maxNumericValue: 3500}],
            },
        },
        upload: {
            target: 'temporary-public-storage',  // Free storage for 7 days
        },
    },
};
```

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20}

      - name: Install & build
        run: npm ci && npm run build

      - name: Start server
        run: npm start &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## Bundle Analysis

### Webpack

```bash
# Generate bundle stats
webpack --profile --json > stats.json

# Analyze (interactive treemap)
npx webpack-bundle-analyzer stats.json
```

### Vite

```bash
npm install -D rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
export default defineConfig({
    plugins: [
        visualizer({ open: true, gzipSize: true, brotliSize: true })
    ]
});

# Run build — opens treemap automatically
npm run build
```

### Next.js

```bash
npm install -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({});

# Run analysis
ANALYZE=true npm run build
```

### Reading a Bundle Treemap

```
Large box = large chunk of bundle
Color = which entry point uses this chunk
Nested boxes = modules within a chunk

Look for:
1. Unexpectedly large boxes — should this be code split?
2. Duplicate modules — same library in multiple chunks
3. Unused code that shouldn't be in bundle (moment.js timezones, all of lodash)
4. Development-only code in production (test utilities, devtools)

Common quick wins:
- lodash: Use lodash-es + tree shaking, or specific imports
  import debounce from 'lodash/debounce';  // NOT: import _ from 'lodash'
- moment.js: Replace with date-fns or dayjs (10x smaller)
- polyfills: Only include what your browser targets need
```

### Code Splitting

```javascript
// React lazy loading
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Route-based code splitting (React Router)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Reports = React.lazy(() => import('./pages/Reports'));

// Dynamic import
const { heavyFunction } = await import('./heavyModule');
```

---

## Network Waterfall Reading

In Chrome DevTools Network panel:

```
| DNS | TCP | SSL | TTFB | Download |
|-----|-----|-----|------|----------|

TTFB (Time to First Byte) > 600ms → server-side issue
DNS resolution > 100ms → use preconnect or DNS prefetch
SSL handshake > 200ms → use HTTPS keep-alive, HSTS preload
Large download → compression, caching

Blocking resources (red lines):
- CSS in <head> without media query → blocks all rendering
- JS in <head> without defer/async → blocks parsing

Waterfall patterns:
- Staircase → sequential fetching (add preload, HTTP/2 push, or inline critical)
- Parallel → good, resources fetched simultaneously
- Long flat line → large resource, needs splitting or lazy loading
```

---

## Image Optimization

```html
<!-- Modern formats: WebP (broad support) or AVIF (best compression) -->
<picture>
  <source srcset="/image.avif" type="image/avif">
  <source srcset="/image.webp" type="image/webp">
  <img src="/image.jpg" alt="..." width="800" height="600">
</picture>

<!-- Responsive images -->
<img
  srcset="/image-400.webp 400w, /image-800.webp 800w, /image-1600.webp 1600w"
  sizes="(max-width: 768px) 100vw, 50vw"
  src="/image-800.webp"
  alt="..."
  width="800" height="600"
  loading="lazy"
>
```

```bash
# Convert with sharp (Node.js)
npx sharp-cli -i input.jpg -o output.webp --quality 80 --format webp

# CLI with imagemagick
convert input.jpg -quality 85 output.webp
```

---

## Font Performance

```css
/* font-display: swap — show fallback text immediately, swap when loaded */
/* Prevents invisible text but may cause layout shift */
@font-face {
  font-family: 'MyFont';
  font-display: swap;
  src: url('/fonts/myfont.woff2') format('woff2');
  font-weight: 400;
  unicode-range: U+0000-00FF;  /* Only Latin characters — subsetting */
}

/* font-display: optional — use font only if available within 100ms */
/* Zero CLS, might show fallback font occasionally */
@font-face {
  font-display: optional;
  /* ... */
}
```

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/myfont.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect to Google Fonts (if using) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

## React Performance

```javascript
// React DevTools Profiler: record interactions, find slow renders
// Install React DevTools browser extension

// Prevent unnecessary re-renders
const MemoizedComponent = React.memo(MyComponent);

// Memoize expensive computations
const sortedList = useMemo(() => items.sort(compareByDate), [items]);

// Stable callbacks to prevent child re-renders
const handleClick = useCallback(() => {
    doSomething(id);
}, [id]);

// Virtualize long lists
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={10000} itemSize={50} width="100%">
    {({ index, style }) => <Row index={index} style={style} />}
</FixedSizeList>
```

---

## Reference Commands

- `/web-perf` — guided web performance audit workflow
- `/profile` — server-side profiling for backend performance
- `load-testing` skill — generate load to measure server performance
