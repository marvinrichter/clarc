---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.html"
  - "**/*.vue"
  - "**/*.svelte"
---

# Accessibility Rules (Universal)

These rules apply to all UI projects regardless of framework.

## Core Principles

1. **Semantic HTML before ARIA** — Use `<button>`, `<nav>`, `<main>`, `<header>` before reaching for `role=` attributes
2. **Every interactive element must be keyboard accessible** — If you can click it, you can Tab to it and activate with Enter/Space
3. **Every image needs an alternative** — Decorative: `alt=""`. Informative: descriptive alt text. Functional (linked): describes the destination
4. **Never use color as the only information channel** — Pair color with icon, text, or pattern

## Mandatory Checklist

Before marking any UI feature complete:

- [ ] All interactive elements reachable by Tab key
- [ ] Focus indicator is visible (don't remove `outline` without replacement)
- [ ] Focus indicator meets WCAG 2.2: ≥ 2px, ≥ 3:1 contrast against adjacent colors
- [ ] All images have `alt` attribute (empty string if decorative)
- [ ] All form inputs have associated `<label>` (via `for`/`id` or wrapping)
- [ ] Error messages are announced (use `role="alert"` or `aria-live`)
- [ ] Color contrast: text ≥ 4.5:1 (normal), ≥ 3:1 (large text / UI components)
- [ ] Touch targets ≥ 24×24 CSS px (WCAG 2.2 — 44×44 recommended)

## ARIA Rules

```
DO:
✅ Use aria-label when no visible text exists (icon buttons, close buttons)
✅ Use aria-labelledby to reference visible heading text for dialogs/sections
✅ Use aria-describedby to associate hints or errors with inputs
✅ Use aria-live="polite" for dynamic content updates (search results, status messages)
✅ Use aria-expanded on trigger elements (accordion headers, dropdown toggles)
✅ Use aria-invalid="true" + aria-describedby on invalid form fields
✅ Use aria-hidden="true" to hide decorative icons from screen readers
✅ Use role="dialog" + aria-modal="true" + aria-labelledby on modal dialogs

DON'T:
❌ Add aria-label to elements that already have visible text
❌ Use aria-hidden="true" on focusable elements (keyboard focus disappears)
❌ Add role="button" to a <div> — use <button> instead
❌ Use aria-live="assertive" for non-critical updates (it interrupts)
❌ Leave role="dialog" without aria-labelledby or aria-label
❌ Use duplicate id values anywhere on the page
```

## Keyboard Interaction Patterns

```
Modals / Dialogs:
- Focus MUST move into the dialog on open
- Focus MUST be trapped inside (Tab and Shift+Tab cycle within)
- Escape MUST close the dialog
- Focus MUST return to the trigger element on close

Menus / Dropdowns:
- Enter / Space opens the menu
- Arrow keys navigate items
- Escape closes the menu, returns focus to trigger
- Home / End jump to first/last item

Tabs:
- Tab key moves to the tab panel (not between tabs)
- Arrow keys move between tab headers (roving tabindex)
- Activated tab panel receives focus

Data Tables:
- Use <th scope="col"> for column headers
- Use <th scope="row"> for row headers
- Use <caption> to name the table
```

## Component Patterns (Required)

### Buttons

```html
<!-- Icon-only button MUST have aria-label -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- Never use <div> or <span> as a button -->
<!-- ❌ BAD: <div class="btn" onclick="...">Submit</div> -->
<!-- ✅ GOOD: <button type="button">Submit</button> -->
```

### Forms

```html
<!-- Every input needs a label -->
<label for="email">Email address</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">Please enter a valid email</span>
```

### Images

```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 40% in Q2 2026" />

<!-- Decorative image -->
<img src="divider.png" alt="" role="presentation" />

<!-- Linked image -->
<a href="/dashboard">
  <img src="logo.png" alt="Return to dashboard" />
</a>
```

## Automated Testing (Required)

Every project with a UI must include automated accessibility tests:

```typescript
// Add to existing E2E tests (Playwright)
import AxeBuilder from '@axe-core/playwright';

test('page has no critical a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const critical = results.violations.filter(v =>
    v.impact === 'critical' || v.impact === 'serious'
  );
  expect(critical).toEqual([]);
});
```

**Remember:** Automated tools catch ~30% of real accessibility issues. Supplement with keyboard testing and screen reader spot checks.

## Reference

- `accessibility-patterns` skill — WCAG 2.2 deep-dive, ARIA patterns, keyboard navigation, screen reader testing, accessible component library
- `/a11y-audit` command — run a comprehensive accessibility audit
