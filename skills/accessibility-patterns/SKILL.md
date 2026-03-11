---
name: accessibility-patterns
description: "Web Accessibility (WCAG 2.2): key success criteria (contrast, keyboard, focus, ARIA), ARIA patterns (aria-label/labelledby/describedby, roles, live regions, state attributes), keyboard navigation (focus trap, skip links, roving tabindex), screen reader testing (NVDA/VoiceOver/TalkBack), automated testing (axe-core, axe-playwright, jest-axe), and accessible component patterns (modals, tables, forms, data visualizations)."
---

# Accessibility Patterns

Build accessible UIs that work for all users — keyboard, screen readers, and beyond.

## When to Activate

- Building or reviewing interactive components (modals, forms, dropdowns, tabs)
- Running accessibility audits on existing code
- Adding automated a11y tests with axe-core or jest-axe
- Implementing keyboard navigation or focus management
- Checking WCAG 2.2 compliance
- Adding ARIA attributes to custom components

---

## WCAG 2.2 — Key Success Criteria

| Criterion | Level | What it means |
|-----------|-------|---------------|
| 1.1.1 Non-text Content | A | All images need alt text or `aria-label` |
| 1.3.1 Info and Relationships | A | Use semantic HTML — headings, lists, landmarks |
| 1.4.3 Contrast Minimum | AA | Text: 4.5:1 ratio; large text (≥18pt): 3:1 |
| 1.4.11 Non-text Contrast | AA | UI components and graphics: 3:1 ratio |
| 2.1.1 Keyboard | A | Everything operable via keyboard |
| 2.4.3 Focus Order | A | Tab order is logical and meaningful |
| 2.4.7 Focus Visible | AA | Keyboard focus is always visible |
| **2.4.11 Focus Appearance** | AA | **(WCAG 2.2 new)** Focus indicator: ≥2px, ≥3:1 contrast |
| **2.5.8 Target Size** | AA | **(WCAG 2.2 new)** Touch targets ≥24×24 CSS px |
| 4.1.2 Name, Role, Value | A | ARIA attributes are correct and complete |

---

## ARIA Patterns

### Labels

```html
<!-- aria-label: inline label, no visible text -->
<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- aria-labelledby: reference to visible element -->
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Delete</h2>
  ...
</div>

<!-- aria-describedby: supplementary description -->
<input
  id="email"
  type="email"
  aria-describedby="email-hint email-error"
/>
<p id="email-hint">Use your company email address.</p>
<p id="email-error" role="alert">This field is required.</p>

<!-- Prefer aria-labelledby over aria-label when visible text exists -->
<!-- Prefer semantic HTML over ARIA where possible -->
```

### Roles

```html
<!-- Only add role when semantic HTML is not available -->
<div role="button" tabindex="0" onkeydown="handleKey(event)">Custom Button</div>
<!-- Better: use <button> instead -->

<!-- Landmark roles (use semantic HTML equivalents) -->
<div role="banner">...</div>      <!-- Use <header> -->
<div role="main">...</div>        <!-- Use <main> -->
<div role="navigation">...</div>  <!-- Use <nav> -->
<div role="contentinfo">...</div> <!-- Use <footer> -->
<div role="complementary">...</div> <!-- Use <aside> -->

<!-- Widget roles — no semantic equivalent -->
<div role="dialog" aria-modal="true" aria-labelledby="title">
<div role="tooltip" id="tip-1">
<div role="tabpanel" aria-labelledby="tab-1">
<div role="status" aria-live="polite">  <!-- for status updates -->
```

### Live Regions

```html
<!-- polite: announces after current user action completes -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Dynamic content here — screen reader announces on change -->
  3 results found
</div>

<!-- assertive: interrupts immediately — use sparingly for errors -->
<div role="alert" aria-live="assertive">
  Error: Payment failed. Please try again.
</div>

<!-- status: polite, lower priority -->
<div role="status">Saving...</div>
```

### State Attributes

```html
<!-- Expandable controls -->
<button aria-expanded="false" aria-controls="menu-list">Menu</button>
<ul id="menu-list" hidden>...</ul>

<!-- Toggle buttons -->
<button aria-pressed="false">Bold</button>

<!-- Selectable items (tabs, list items) -->
<div role="tab" aria-selected="true" id="tab-1">Details</div>

<!-- Form state -->
<input aria-required="true" aria-invalid="true" aria-describedby="error-1" />
<p id="error-1" role="alert">Email address is required.</p>

<!-- Busy/loading state -->
<div aria-busy="true" aria-label="Loading results...">
  <Spinner />
</div>
```

---

## Keyboard Navigation

### Focus Trap (Modals/Drawers)

```typescript
// Focus trap — keep focus inside modal while open
function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1)!;

  // Move focus into modal on open
  firstElement?.focus();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  return () => container.removeEventListener('keydown', handleKeyDown);
}

// React hook
function useFocusTrap(isOpen: boolean, containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const previouslyFocused = document.activeElement as HTMLElement;
    const cleanup = trapFocus(containerRef.current);

    return () => {
      cleanup();
      // Restore focus when modal closes
      previouslyFocused?.focus();
    };
  }, [isOpen]);
}
```

### Skip Links

```html
<!-- First element on page — skip to main content -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<main id="main-content" tabindex="-1">
  <!-- tabindex="-1" allows programmatic focus without appearing in tab order -->
  ...
</main>
```

```css
/* Visible only when focused */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: 9999;
  padding: 8px;
  background: #000;
  color: #fff;
  text-decoration: none;
}
.skip-link:focus {
  top: 6px;
}
```

### Focus Management on Route Change (SPA)

```tsx
// Restore focus to page heading on every route change
function RouterFocusManager() {
  const pathname = usePathname();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [pathname]);

  return <h1 ref={headingRef} tabIndex={-1}>{getPageTitle(pathname)}</h1>;
}
```

### WAI-ARIA Menu Button (Dropdowns)

```tsx
// Full keyboard support: Enter/Space/ArrowDown opens, ArrowUp/Down/Home/End navigate, Escape closes
function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

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
      case 'ArrowDown': e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)); break;
      case 'ArrowUp':   e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); break;
      case 'Home':      e.preventDefault(); setActiveIndex(0); break;
      case 'End':       e.preventDefault(); setActiveIndex(items.length - 1); break;
      case 'Escape':    setOpen(false); break;
      case 'Tab':       setOpen(false); break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        Options
      </button>
      {open && (
        <ul role="menu">
          {items.map((item, i) => (
            <li key={item.id} role="menuitem" tabIndex={activeIndex === i ? 0 : -1}
                onClick={() => { item.onSelect(); setOpen(false); }}>
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Roving tabindex (Radio Groups, Toolbars)

```typescript
// Only one item in group has tabindex="0" at a time
// Arrow keys move focus within the group
function RovingTabGroup({ items }: { items: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let next = index;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (index + 1) % items.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (index - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = items.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setActiveIndex(next);
    itemRefs[next]?.focus();
  };

  return (
    <div role="radiogroup">
      {items.map((item, i) => (
        <div
          key={item}
          role="radio"
          tabIndex={i === activeIndex ? 0 : -1}
          aria-checked={i === activeIndex}
          onKeyDown={(e) => handleKeyDown(e, i)}
          ref={(el) => { itemRefs[i] = el; }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
```

### Escape Key Convention

```typescript
// All overlays (modals, drawers, dropdowns, tooltips) must close on Escape
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isOpen, onClose]);
```

---

For screen reader testing checklists (NVDA/VoiceOver), automated testing (axe-core, jest-axe, @axe-core/react), and accessible component patterns (modal, table, form, data visualization), see skill `accessibility-patterns-advanced`.
