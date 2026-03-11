---
description: Comprehensive accessibility audit — automated axe scan, keyboard navigation check, color contrast review, ARIA audit, and prioritized CRITICAL/HIGH/MEDIUM issue backlog
---

# A11y Audit Command

Run an accessibility audit for: $ARGUMENTS

## Your Task

Systematically assess accessibility across 5 dimensions and produce a prioritized issue backlog.

## Step 1 — Setup Automated Scanning

Check what testing infrastructure exists:

```bash
# Check for existing a11y tools
cat package.json | grep -E "axe|pa11y|playwright|storybook"

# Check if Playwright is configured
ls playwright.config.ts playwright.config.js 2>/dev/null

# Check for Storybook (addon-a11y)
cat package.json | grep "addon-a11y"
ls .storybook/ 2>/dev/null
```

Install axe-playwright if not present:

```bash
npm install --save-dev @axe-core/playwright

# Or for jest-based projects:
npm install --save-dev jest-axe @types/jest-axe
```

## Step 2 — Automated Scan (axe-playwright)

Create and run an automated scan across all routes:

```typescript
// scripts/a11y-scan.ts
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/settings',
  // Add more routes
];

async function runA11yAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const allViolations: Record<string, unknown>[] = [];

  for (const route of ROUTES) {
    await page.goto(`http://localhost:3000${route}`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    for (const violation of results.violations) {
      allViolations.push({
        route,
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length,
        example: violation.nodes[0]?.html?.slice(0, 100),
      });
    }
  }

  console.log(JSON.stringify(allViolations, null, 2));
  await browser.close();
}

runA11yAudit();
```

```bash
# Run the scan (requires app running)
npx tsx scripts/a11y-scan.ts > a11y-results.json 2>&1
```

## Step 3 — Keyboard Navigation Check

Manually check (or document for team):

```markdown
### Keyboard Navigation Checklist

Run through these with mouse disconnected:

Interactive Elements:
[ ] All links reachable via Tab
[ ] All buttons reachable via Tab
[ ] All form fields reachable via Tab
[ ] Custom components (dropdowns, date pickers) reachable

Focus Visibility:
[ ] Focus indicator is visible on all interactive elements
[ ] Focus indicator has ≥ 3:1 contrast ratio (WCAG 2.2)
[ ] Focus indicator is ≥ 2px (WCAG 2.2)

Modals / Overlays:
[ ] Focus moves into modal when opened
[ ] Focus trapped inside modal (Tab/Shift+Tab stays inside)
[ ] Escape closes modal
[ ] Focus returns to trigger after modal closes

Navigation:
[ ] Skip-to-main-content link exists and works
[ ] Tab order is logical (follows visual reading order)
[ ] No keyboard traps (can always Tab away)
```

Check keyboard support in code:

```bash
# Find custom interactive elements that may lack keyboard support
grep -rn "onClick\|onMouseDown\|onMouseUp" src/ --include="*.tsx" --include="*.jsx" | \
  grep -v "onKey\|button\|a \|input\|select\|textarea" | head -20

# Divs/spans with click handlers (likely missing keyboard support)
grep -rn "<div.*onClick\|<span.*onClick" src/ --include="*.tsx" | head -20
```

## Step 4 — Color Contrast Check

```bash
# Find color definitions in CSS/Tailwind
grep -rn "color:\|background-color:\|text-\|bg-" src/ --include="*.css" --include="*.scss" | \
  grep -v "transparent\|inherit\|currentColor" | head -30

# Find hardcoded colors in components
grep -rn "#[0-9a-fA-F]{3,6}\|rgb(\|rgba(" src/ --include="*.tsx" --include="*.css" | head -20
```

**Contrast requirements:**
- Normal text (< 18pt / < 14pt bold): **4.5:1 minimum**
- Large text (≥ 18pt / ≥ 14pt bold): **3:1 minimum**
- UI components, icons, borders: **3:1 minimum**
- Decorative elements: exempt

Tools to check contrast:
- Chrome DevTools → Accessibility pane (click element, see contrast ratio)
- [contrast-ratio.com](https://contrast-ratio.com) — manual hex input
- `npm install -g color-contrast` — CLI tool

## Step 5 — ARIA Audit

```bash
# Find ARIA attributes in use
grep -rn "aria-" src/ --include="*.tsx" --include="*.jsx" | grep -v "test\|spec" | head -40

# Check for common ARIA mistakes

# Missing aria-label on icon buttons
grep -rn "<button" src/ --include="*.tsx" | grep -v "aria-label\|aria-labelledby" | head -10

# role="dialog" without aria-labelledby
grep -rn 'role="dialog"' src/ --include="*.tsx" | grep -v "aria-labelledby\|aria-label" | head -10

# aria-label on non-interactive elements (usually wrong)
grep -rn 'aria-label' src/ --include="*.tsx" | grep '<div\|<span\|<p\|<section' | head -10

# Check for aria-hidden on focusable elements (breaks keyboard access)
grep -rn 'aria-hidden="true"' src/ --include="*.tsx" | grep 'button\|a \|input\|tabindex' | head -10

# Check for duplicate IDs (breaks aria-labelledby)
grep -rn 'id="' src/ --include="*.tsx" | sed 's/.*id="\([^"]*\)".*/\1/' | sort | uniq -d | head -10
```

**Common ARIA mistakes:**

| Pattern | Problem | Fix |
|---------|---------|-----|
| `<div role="button">` | Missing `tabindex="0"` and keyboard handler | Use `<button>` instead |
| `aria-label` on `<div>` | Labels non-interactive element | Remove, or add `role` + `tabindex` |
| `role="dialog"` without `aria-labelledby` | Screen reader can't name the dialog | Add `aria-labelledby="dialog-title-id"` |
| `aria-hidden="true"` on focusable element | Keyboard focus vanishes | Remove `aria-hidden` or `tabindex` |
| Dynamic content without `aria-live` | Screen reader doesn't announce changes | Add `aria-live="polite"` to container |

## Step 6 — Screen Reader Spot Check

Document findings from manual screen reader testing:

```bash
# Which screen reader + browser combination was tested?
# NVDA + Chrome (Windows) — most common
# VoiceOver + Safari (macOS) — required for Apple platforms
# TalkBack + Chrome (Android) — required for mobile
```

**Spot check targets:**
- Main navigation — are all items announced with correct roles?
- Primary form — are labels associated? Are errors announced?
- Key dynamic interaction (modal, notification, search results)
- Data table (if present) — are headers associated?

## Step 7 — Generate Audit Report

```markdown
## Accessibility Audit Report

**Date:** [today]
**Scope:** [app name + routes audited]
**WCAG Level:** 2.2 AA
**Testing:** Automated (axe) + Manual keyboard + Spot check

---

### Summary

| Dimension | Status | Critical | High | Medium |
|-----------|--------|---------|------|--------|
| Automated (axe) | 🔴/🟡/🟢 | N | N | N |
| Keyboard Navigation | 🔴/🟡/🟢 | N | N | N |
| Color Contrast | 🔴/🟡/🟢 | N | N | N |
| ARIA | 🔴/🟡/🟢 | N | N | N |
| Screen Reader | 🔴/🟡/🟢 | N | N | N |

---

### Prioritized Issue Backlog

#### CRITICAL (WCAG Level A violations — fix immediately)

1. **[Route]: [Issue description]**
   - WCAG: [criterion]
   - Impact: [who is affected]
   - Fix: [specific code fix]

#### HIGH (WCAG Level AA violations)

1. **[Route]: [Issue description]**
   - WCAG: [criterion]
   - Fix: [specific code fix]

#### MEDIUM (Best practice violations)

1. **[Route]: [Issue description]**
   - Fix: [specific recommendation]

---

### Quick Wins (< 1 hour each)

1. Add `aria-label` to icon-only buttons: [list specific components]
2. Add `role="alert"` to error messages: [list form fields]
3. Add skip-to-main-content link to layout

### Next Steps

1. Fix all CRITICAL issues before next release
2. Add `axe-playwright` to CI pipeline (block on critical violations)
3. Enable `@storybook/addon-a11y` for ongoing component-level checks
4. Schedule quarterly manual keyboard + screen reader review
```

## Reference Skills

- `accessibility-patterns` — WCAG 2.2, ARIA, keyboard navigation, screen reader testing, axe-core
- `storybook-patterns` — addon-a11y integration for component-level checks
- `e2e-testing` — add axe to Playwright E2E tests

## After This

- `/tdd` — add accessibility unit tests for flagged violations
- `/code-review` — review accessibility fixes before committing
