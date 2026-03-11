---
description: Set up visual regression testing for a project — detects project type, recommends tool (Chromatic/Playwright/Percy), installs, creates baselines, and configures CI
---

# Visual Test Command

Set up visual regression testing for: $ARGUMENTS

## Your Task

Detect the project setup, recommend the right visual testing tool, configure it, create initial baselines, and set up CI integration.

## Step 1 — Detect Project Setup

```bash
# Has Storybook?
ls .storybook/ storybook.config.js 2>/dev/null
cat package.json | grep -E '"storybook|@storybook'

# Has Playwright?
ls playwright.config.ts playwright.config.js 2>/dev/null
cat package.json | grep '"@playwright/test"'

# Project type
ls next.config.js next.config.ts vite.config.ts 2>/dev/null
cat package.json | grep -E '"react|vue|svelte|angular'
```

## Step 2 — Tool Recommendation

Based on project setup:

```
Has Storybook AND wants review workflow?
  → Chromatic (cloud, AI-based diff, UI review)

Has Storybook AND wants multi-browser AND cloud?
  → Percy (BrowserStack)

Has Playwright already AND no Storybook?
  → Playwright toHaveScreenshot (in-repo, pixel-diff)

No cloud, on-prem, open source only?
  → BackstopJS + Docker

Budget is $0 AND has Playwright?
  → Playwright toHaveScreenshot
```

Present recommendation with rationale. Ask user to confirm.

## Step 3 — Installation

### Chromatic

```bash
npm install --save-dev chromatic

# Get project token from chromatic.com (or ask user for it)
# Add to .env.local: CHROMATIC_PROJECT_TOKEN=chpt_abc123
```

### Playwright `toHaveScreenshot`

```bash
# Already using Playwright? Just add visual tests
npm install --save-dev @playwright/test
npx playwright install chromium

# Create visual test directory
mkdir -p tests/visual
```

### BackstopJS

```bash
npm install --save-dev backstopjs
npx backstop init
```

## Step 4 — Configure

### Playwright Configuration

Generate `playwright.config.ts` (or extend existing):

```typescript
// playwright.config.ts additions for visual testing
export default defineConfig({
  // Visual tests directory
  projects: [
    {
      name: 'visual',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
      },
      snapshotDir: './tests/visual/__snapshots__',
    },
  ],
});
```

### First Visual Test

Generate a starter visual test based on the project's main routes:

```typescript
// tests/visual/pages.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for fonts
    await page.evaluate(() => document.fonts.ready);
  });

  test('homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
```

## Step 5 — Create Initial Baselines

```bash
# Playwright — generate baseline screenshots
# IMPORTANT: run in Docker if CI uses Linux
npx playwright test tests/visual/ --update-snapshots

# Show what was created
ls tests/visual/__snapshots__/

# Chromatic — first push creates baseline
npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN

# BackstopJS
npx backstop reference
```

## Step 6 — Configure Flakiness Prevention

```typescript
// Add to all visual tests:

// 1. Wait for network idle
await page.waitForLoadState('networkidle');

// 2. Wait for fonts
await page.evaluate(() => document.fonts.ready);

// 3. Disable animations
await page.addStyleTag({
  content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'
});

// 4. Mask dynamic content
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('.dynamic-content'),
  ],
  maxDiffPixelRatio: 0.01,
  animations: 'disabled',
});
```

## Step 7 — CI Integration

Generate GitHub Actions workflow:

### Playwright Visual CI

```yaml
# .github/workflows/visual.yml
name: Visual Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  visual:
    runs-on: ubuntu-latest  # SAME OS as baseline generation!
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Start app
        run: npm run build && npm run start &
        env:
          NODE_ENV: production

      - name: Wait for app
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Visual tests
        run: npx playwright test tests/visual/

      - name: Upload diffs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs-${{ github.run_id }}
          path: tests/visual/__snapshots__/
          retention-days: 14
```

### Chromatic CI

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on: [push, pull_request]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
          exitZeroOnChanges: false
          autoAcceptChanges: main
```

## Step 8 — Report Setup

Show what was configured:

```markdown
## Visual Testing Setup Complete

**Tool:** [Chromatic / Playwright / BackstopJS]
**Coverage:** [N] routes / [N] stories

### Baseline Created
- [list of baselines]

### CI Integration
- GitHub Actions workflow: `.github/workflows/visual.yml`

### Team Workflow
**Review visual changes in PRs:**
[Tool-specific instructions]

**Update baselines intentionally:**
[Command to run]

### Known Flakiness Mitigations Applied
- [x] Network idle wait
- [x] Font loading wait
- [x] Animation disabled
- [x] Dynamic content masked: [list of selectors]

### Next Steps
1. Commit baselines: `git add tests/visual/__snapshots__/ && git commit -m "chore: add visual test baselines"`
2. Add more coverage: `[pages/stories to add]`
3. Add to PR template: "Did you update visual baselines if needed?"
```

## Reference Skills

- `visual-testing` — tool comparison, flakiness strategies, baseline management
- `storybook-patterns` — Chromatic integration, CSF3 stories
- `e2e-testing` — Playwright functional tests (complement to visual tests)

## After This

- `/code-review` — review visual test implementation
- `/tdd` — add unit tests alongside visual regression tests
