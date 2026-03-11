---
name: accessibility-patterns-advanced
description: Advanced accessibility patterns — screen reader testing (NVDA/VoiceOver/TalkBack checklists), automated testing (axe-core+Playwright, jest-axe, @axe-core/react dev warnings), and accessible component implementations (modal, table, form, data visualization).
---

# Accessibility Patterns — Advanced

This skill extends `accessibility-patterns` with screen reader testing, automated testing, and accessible component patterns. Load `accessibility-patterns` first.

## When to Activate

- Running manual screen reader tests (NVDA, VoiceOver, TalkBack)
- Setting up automated a11y testing with axe-core or jest-axe
- Implementing accessible modal, table, form, or data visualization components

---

## Screen Reader Testing

### NVDA + Chrome (Windows)

```
Navigation shortcuts:
H / Shift+H     — next/previous heading
F / Shift+F     — next/previous form field
B / Shift+B     — next/previous button
L / Shift+L     — next/previous list
D / Shift+D     — next/previous landmark
Tab             — next interactive element
Enter/Space     — activate button or link

Test checklist:
□ Turn on NVDA (Insert+Escape to toggle speech)
□ Navigate headings with H — is structure logical?
□ Tab through all interactive elements — are labels announced?
□ Submit a form with errors — are errors announced?
□ Open a modal — does focus move inside?
□ Close modal — does focus return to trigger?
```

### VoiceOver + Safari (macOS/iOS)

```
Navigation shortcuts (VO = Control+Option):
VO+U            — Rotor (shows headings, links, landmarks)
VO+Right/Left   — next/previous element
VO+Space        — activate element
VO+Command+H    — next heading
Tab             — next interactive element

Test checklist:
□ Open Rotor (VO+U) — are headings and landmarks correct?
□ Navigate to form — are labels associated?
□ Check dynamic content — does VoiceOver announce changes?
□ Test custom widgets — are roles and states announced?
```

---

## Automated Testing

### axe-core + Playwright

```typescript
// playwright.config.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage has no critical violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .exclude('.third-party-widget')  // Exclude known third-party
      .analyze();

    // Filter to only serious/critical
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('modal dialog is accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="open-modal"]');
    await page.waitForSelector('[role="dialog"]');

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

### jest-axe (Component Tests)

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button component', () => {
  it('is accessible', async () => {
    const { container } = render(
      <Button onClick={() => {}}>Save changes</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('icon button has accessible label', async () => {
    const { container } = render(
      <IconButton aria-label="Close dialog" icon={<CloseIcon />} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### @axe-core/react (Dev-Mode Warnings)

```typescript
// index.tsx — dev-mode only
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);  // Check every 1s, log to console
  });
}
```

**Automation finds ~30% of real issues.** Always supplement with manual keyboard and screen reader testing.

---

## Accessible Component Patterns

### Accessible Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, containerRef);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={containerRef}
      className="modal"
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label={`Close ${title}`}>
        ✕
      </button>
    </div>
  );
}
```

### Accessible Table

```html
<table>
  <caption>Monthly sales by region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North America</th>
      <td>$1.2M</td>
      <td>$1.5M</td>
    </tr>
  </tbody>
</table>
```

### Accessible Form

```html
<form novalidate>
  <div class="form-field">
    <label for="email">Email address <span aria-hidden="true">*</span></label>
    <input
      id="email"
      type="email"
      autocomplete="email"
      aria-required="true"
      aria-invalid="true"
      aria-describedby="email-error"
    />
    <p id="email-error" role="alert" class="error">
      Please enter a valid email address.
    </p>
  </div>
</form>
```

### Accessible Data Visualization

```tsx
// Every chart needs a text alternative
function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <figure>
      <figcaption>Monthly sales 2026 — peaks in Q2 and Q4</figcaption>

      {/* Visual chart for sighted users */}
      <canvas aria-hidden="true" ref={chartRef} />

      {/* Text table for screen reader users */}
      <table className="sr-only">
        <caption>Monthly sales data 2026</caption>
        <thead>
          <tr><th>Month</th><th>Sales</th></tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.month}>
              <td>{d.month}</td>
              <td>{formatCurrency(d.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
```

---

## Reference

- `accessibility-patterns` — WCAG criteria, ARIA patterns, keyboard navigation, focus trap, skip links
- `storybook-patterns` — addon-a11y for story-level accessibility checks
- `e2e-testing` — Playwright E2E tests (add axe checks to critical flows)
