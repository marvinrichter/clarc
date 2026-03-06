---
name: accessibility
description: "Web accessibility (a11y) patterns: WCAG 2.2 compliance, semantic HTML, ARIA roles and attributes, keyboard navigation, focus management, screen reader testing, color contrast, and accessible component patterns for forms, modals, and menus."
---

# Accessibility (a11y) Skill

## When to Activate

- Building any web interface
- Adding modals, dropdowns, or custom interactive components
- Building forms (error messages, validation)
- Adding focus management (routing, modal open/close)
- Reviewing UI for WCAG compliance

---

## WCAG 2.2 Levels

| Level | Description | When required |
|-------|-------------|---------------|
| A | Minimum — major barriers removed | Always |
| AA | Standard — most legal requirements | EU EAA, ADA (US), most contracts |
| AAA | Enhanced — not always achievable | Public sector, specialized contexts |

**Target:** WCAG 2.2 Level AA for all production UI.

---

## Principle 1: Semantic HTML First

The best ARIA is no ARIA — use the right HTML element.

```tsx
// WRONG: div soup
<div onClick={handleClick} className="button">Submit</div>
<div className="heading">Product Details</div>
<div className="list">
  <div className="item">Apple</div>
</div>

// CORRECT: semantic HTML
<button onClick={handleClick}>Submit</button>
<h2>Product Details</h2>
<ul>
  <li>Apple</li>
</ul>

// Semantic HTML gives you for free:
// - keyboard accessibility (Tab, Enter, Space)
// - screen reader announcements
// - browser default styles
// - no ARIA needed
```

---

## Principle 2: ARIA When Necessary

```tsx
// Custom disclosure component
function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
      >
        {title}
        <ChevronIcon aria-hidden="true" />  {/* Decorative — hide from AT */}
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={`${contentId}-trigger`}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

// Live regions — announce dynamic content to screen readers
function NotificationToast({ message }: { message: string }) {
  return (
    // role="alert" = assertive (interrupts)
    // role="status" = polite (waits for user to finish)
    <div role="alert" aria-live="assertive" aria-atomic="true">
      {message}
    </div>
  );
}

// Loading states
function LoadingButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      aria-busy={loading}
      aria-label={loading ? 'Loading...' : undefined}
      disabled={loading}
    >
      {loading ? <Spinner aria-hidden="true" /> : children}
    </button>
  );
}
```

---

## Principle 3: Keyboard Navigation

Every interactive element must be reachable and operable with keyboard only.

```tsx
// Custom dropdown menu (keyboard pattern: WAI-ARIA Menu Button)
function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Escape':
        setOpen(false);
        // Return focus to trigger
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Options
      </button>
      {open && (
        <ul role="menu" ref={menuRef}>
          {items.map((item, i) => (
            <li
              key={item.id}
              role="menuitem"
              tabIndex={activeIndex === i ? 0 : -1}  // Roving tabindex
              onClick={() => { item.onSelect(); setOpen(false); }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Principle 4: Focus Management

```tsx
// Modal: trap focus inside when open
import { useEffect, useRef } from 'react';

function Modal({ open, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Move focus into modal
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Trap focus inside modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef}>
      <h2 id="modal-title">Dialog Title</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

// Router: restore focus after navigation
function RouterFocusManager() {
  const pathname = usePathname();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Move focus to page heading on route change
    headingRef.current?.focus();
  }, [pathname]);

  return <h1 ref={headingRef} tabIndex={-1}>{getPageTitle(pathname)}</h1>;
}
```

---

## Principle 5: Forms

```tsx
// Accessible form with error handling
function LoginForm() {
  const { register, formState: { errors } } = useForm();
  const errorId = useId();

  return (
    <form>
      {/* Summary error for screen readers */}
      {Object.keys(errors).length > 0 && (
        <div role="alert" aria-live="assertive">
          Please fix the errors below before continuing.
        </div>
      )}

      <div>
        {/* Always: visible label, error linked via aria-describedby */}
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${errorId}-email` : undefined}
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && (
          <span id={`${errorId}-email`} role="alert">
            {errors.email.message}
          </span>
        )}
      </div>

      <button type="submit">Sign in</button>
    </form>
  );
}
```

---

## Color Contrast Requirements (WCAG AA)

| Text size | Minimum contrast ratio |
|-----------|----------------------|
| Normal text (<18px regular, <14px bold) | 4.5:1 |
| Large text (≥18px regular, ≥14px bold) | 3:1 |
| UI components, icons | 3:1 |
| Disabled elements | No requirement |

```tsx
// Check in code: never trust "looks fine" — use a tool
// Tools: axe DevTools, Colour Contrast Analyser, browser devtools accessibility panel

// Common fails:
// - Gray placeholder text (#999 on white = 2.85:1 ✗)
// - Light blue links (#4A90D9 on white = 3.1:1 ✗ for body text)
// - White text on medium-blue buttons
```

---

## Testing

```bash
# Automated: catches ~30-40% of issues
npm install --save-dev @axe-core/react

# In development only:
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

# CI: axe-playwright for E2E
# Linting: eslint-plugin-jsx-a11y
npm install --save-dev eslint-plugin-jsx-a11y
```

```typescript
// playwright accessibility test
import { checkA11y } from 'axe-playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page, undefined, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
```

Manual testing: tab through the entire page with keyboard only. Use VoiceOver (macOS/iOS) or NVDA (Windows).

---

## Checklist

- [ ] All interactive elements reachable by Tab key
- [ ] No keyboard trap (except modals, which trap intentionally and close on Escape)
- [ ] Focus visually visible at all times (no `outline: none` without alternative)
- [ ] All images have `alt` text (`alt=""` for decorative images)
- [ ] Form inputs have visible labels (`<label>` element, not just placeholder)
- [ ] Form errors linked to inputs via `aria-describedby`
- [ ] Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- [ ] No information conveyed by color alone (use icon + text)
- [ ] Page has a logical heading hierarchy (h1 → h2 → h3, no skips)
- [ ] Modals trap focus and return focus to trigger on close
- [ ] `axe` integrated in CI — zero violations policy
