---
name: visual-testing
description: "Visual Regression Testing: tool comparison (Chromatic/Percy/Playwright screenshots/BackstopJS), pixel-diff vs AI-based comparison, baseline management, flakiness strategies (masks, tolerances, waitForLoadState), CI integration with GitHub Actions, and Storybook integration."
---

# Visual Testing

Visual regression testing — detecting unintended UI changes automatically.

## When to Activate

- Setting up visual regression testing for a UI project
- Choosing between Chromatic, Percy, and Playwright screenshots
- Configuring baseline management (when to update, when to flag)
- Debugging flaky visual tests (antialiasing, font loading, animations)
- Integrating visual tests into CI/CD pipeline
- Preventing cross-platform baseline drift caused by macOS vs. Linux font rendering differences
- Masking dynamic content (timestamps, user avatars, random banners) to eliminate false positives

---

## Concept: Visual Regression Testing

Visual regression testing captures screenshots and compares them against a baseline — flagging any visual change for review.

```
Baseline (approved) ──────────────── Current screenshot
       │                                     │
       └──────── pixel diff ─────────────────┘
                      │
                 Difference > threshold?
                 YES → Fail test / flag for review
                 NO  → Pass
```

**Types of comparison:**

| Approach | Tool | Accuracy | Noise |
|----------|------|---------|-------|
| Pixel-exact | Playwright, BackstopJS | High | High (fonts, AA, rendering) |
| AI-based | Chromatic, Percy | Ignores irrelevant diffs | Low |
| Perceptual hash | Custom | Medium | Medium |

---

## Tool Comparison

| Tool | Type | Storybook | Multi-browser | Pricing |
|------|------|-----------|--------------|---------|
| **Chromatic** | Cloud (AI-based) | ✅ First-class | ✅ | Free up to 5k snapshots/mo |
| **Percy** (BrowserStack) | Cloud (AI-based) | ✅ | ✅ | Free up to 5k/mo |
| **Playwright** `toHaveScreenshot` | In-repo (pixel-diff) | ⚠️ Via test-runner | ✅ | Free (open source) |
| **BackstopJS** | Self-hosted (pixel-diff) | ⚠️ Manual setup | ✅ (Chromium) | Free |

**Decision guide:**
- Has Storybook + wants UI review workflow → **Chromatic**
- Has Storybook + wants multi-browser + cloud → **Percy**
- No Storybook + already uses Playwright → **Playwright `toHaveScreenshot`**
- On-prem / no cloud allowed → **BackstopJS**

---

## Chromatic (Storybook)

### Setup

```bash
npm install --save-dev chromatic

# Get project token from chromatic.com
npx chromatic --project-token=<your-token>
```

### GitHub Actions

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for baseline comparison

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true           # Only changed Stories
          exitZeroOnChanges: false    # Fail CI if visual changes found
          autoAcceptChanges: main     # Auto-accept changes on main branch
```

### PR Workflow

On PRs, Chromatic shows a visual diff UI:
- **Accept** — this change was intentional, update baseline
- **Deny** — this is a regression, must be fixed

```bash
# Update baselines locally (accept all current state)
npx chromatic --project-token=<token> --auto-accept-changes

# Build only changed stories (faster)
npx chromatic --project-token=<token> --only-changed
```

---

## Playwright `toHaveScreenshot`

### Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Writing Visual Tests

```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders correctly on desktop', async ({ page }) => {
    await page.goto('/');

    // Wait for everything to be stable
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    // Mask dynamic content (timestamps, avatars)
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      mask: [
        page.locator('[data-testid="last-updated"]'),
        page.locator('.user-avatar'),
      ],
      maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference
    });
  });

  test('renders product card correctly', async ({ page }) => {
    await page.goto('/products');
    await page.waitForSelector('[data-testid="product-card"]');

    const card = page.locator('[data-testid="product-card"]').first();

    await expect(card).toHaveScreenshot('product-card.png', {
      animations: 'disabled',  // No animation artifacts
    });
  });

  test('mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__snapshots__',
  updateSnapshots: 'none',  // Don't auto-update; use --update-snapshots flag

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },

  // Run on multiple viewports
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Update Baselines

```bash
# Create initial baselines or update intentionally
npx playwright test --update-snapshots

# Update only specific tests
npx playwright test homepage --update-snapshots

# Run comparison (CI — never update automatically)
npx playwright test
```

### CI Integration

```yaml
# .github/workflows/visual.yml
name: Visual Regression

on:
  push:
    branches: [main]
  pull_request:

jobs:
  visual:
    runs-on: ubuntu-latest  # Use SAME OS as baseline generation!
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run visual tests
        run: npx playwright test tests/visual/

      - name: Upload diff artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: tests/visual/__snapshots__/
          retention-days: 30
```

---

## BackstopJS (Open Source)

```bash
npm install --save-dev backstopjs

# Initialize
npx backstop init

# Generates backstop.json with default scenarios
```

```json
// backstop.json
{
  "id": "my-app",
  "viewports": [
    { "label": "desktop", "width": 1280, "height": 900 },
    { "label": "mobile", "width": 375, "height": 812 }
  ],
  "scenarios": [
    {
      "label": "Homepage",
      "url": "http://localhost:3000",
      "delay": 500,
      "hideSelectors": [".timestamp", ".avatar"],
      "misMatchThreshold": 0.1,
      "requireSameDimensions": true
    },
    {
      "label": "Product Card",
      "url": "http://localhost:3000/products",
      "selectors": ["[data-testid='product-card']"],
      "delay": 300,
      "misMatchThreshold": 0.5
    }
  ],
  "paths": {
    "bitmaps_reference": "backstop_data/bitmaps_reference",
    "bitmaps_test": "backstop_data/bitmaps_test",
    "html_report": "backstop_data/html_report"
  },
  "engine": "playwright",
  "report": ["browser", "CI"]
}
```

```bash
# Create baseline
npx backstop reference

# Run test
npx backstop test

# Approve new baseline (after intentional changes)
npx backstop approve
```

---

## Flakiness Prevention

Visual tests are the most flaky test type. Key strategies:

### 1. Wait for Stable State

```typescript
// WRONG: screenshot before fonts/network settle
await page.goto('/');
await expect(page).toHaveScreenshot();

// CORRECT: wait for everything
await page.goto('/');
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);  // Extra buffer for CSS animations
await expect(page).toHaveScreenshot({ animations: 'disabled' });
```

### 2. Mask Dynamic Content

```typescript
// Mask elements that change every render
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('[data-testid="current-time"]'),
    page.locator('.random-promo-banner'),
    page.locator('[data-testid="session-id"]'),
  ],
});
```

### 3. Disable Animations

```typescript
// Option A: Playwright config
use: {
  launchOptions: {
    args: ['--force-prefers-reduced-motion'],  // Chromium
  },
}

// Option B: Inject CSS
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `,
});

// Option C: toHaveScreenshot option
await expect(page).toHaveScreenshot({ animations: 'disabled' });
```

### 4. Platform Consistency

```bash
# Generate baselines on exactly the same OS as CI
# WRONG: generate on macOS, compare on Linux CI → font rendering differs

# CORRECT: Use Docker for local baseline generation
docker run --rm -v $(pwd):/work mcr.microsoft.com/playwright:v1.44.0-jammy bash -c \
  "cd /work && npm ci && npx playwright test --update-snapshots"
```

### 5. Tolerances

```typescript
// Small tolerance for anti-aliasing and sub-pixel rendering
await expect(page).toHaveScreenshot({
  maxDiffPixelRatio: 0.01,  // 1% of all pixels can differ
  // OR
  maxDiffPixels: 50,         // At most 50 pixels can differ
  // OR (Playwright 1.50+)
  threshold: 0.2,            // Per-pixel color difference threshold (0-1)
});
```

---

## Baseline Management Best Practices

```
DO commit baselines to git — they're your visual contract
DO update baselines intentionally (not automatically in CI)
DO run visual tests in the same Docker image as CI
DO organize by component/page, not randomly

DON'T auto-update baselines on every push
DON'T skip visual tests to "fix" CI
DON'T generate baselines on developer machines if CI uses different fonts/OS
```

```bash
# Baseline update workflow (team process):
# 1. Make UI change (intentional)
# 2. Update baselines locally
npx playwright test --update-snapshots

# 3. Review diff in PR — confirm change is intentional
# 4. Merge PR with updated snapshots committed
git add tests/visual/__snapshots__/
git commit -m "chore(visual): update baselines for new button style"
```

## Reference

- `storybook-patterns` — Storybook CSF3, play functions, Chromatic CI integration
- `e2e-testing` — Playwright E2E tests (functional, not visual)
