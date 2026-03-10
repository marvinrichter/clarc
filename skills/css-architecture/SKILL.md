---
name: css-architecture
description: "CSS architecture for modern web apps: Tailwind conventions and when to break them, CSS Modules for complex components, responsive design system with container queries, fluid typography, and avoiding the most common Tailwind pitfalls."
---

# CSS Architecture Skill

## When to Activate

- Setting up styling strategy for a new project
- Tailwind classes growing out of control (50+ classes per element)
- Responsive design is inconsistent across breakpoints
- Typography and spacing feel arbitrary, not systematic
- Deciding between Tailwind, CSS Modules, or CSS-in-JS
- Adding complex animations or pseudo-element styles that Tailwind utilities cannot express
- Implementing fluid typography with `clamp()` for smooth viewport-based scaling

---

## Strategy Selection

```
Tailwind alone:        Most components — utilities for layout, spacing, color
CSS Modules:           Components with complex state variants or animations
CSS Custom Properties: Design tokens, theming, values that change at runtime
Inline styles:         Only for truly dynamic values (computed from JS)
Never:                 Styled-components/Emotion (runtime cost, poor DX in 2025)
```

**Default for new projects:** Tailwind + CSS Custom Properties for tokens.

---

## Tailwind: The Right Conventions

### What to write directly in className

```tsx
// Layout, spacing, color, typography — write directly
<div className="flex items-center gap-4 px-6 py-4 bg-surface rounded-lg">
  <h2 className="text-lg font-semibold text-text-primary">Title</h2>
  <p className="text-sm text-text-secondary">Subtitle</p>
</div>
```

### When to extract to a component (not `@apply`)

```tsx
// WRONG: @apply for reuse — defeats Tailwind's purpose, generates dead CSS
// .btn { @apply px-4 py-2 bg-blue-500 text-white rounded; }

// CORRECT: extract to a TypeScript component
// Reuse the component, not the CSS class
function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variant === 'success' && 'bg-green-100 text-green-700',
      variant === 'error'   && 'bg-red-100 text-red-700',
      variant === 'warning' && 'bg-yellow-100 text-yellow-700',
    )}>
      {children}
    </span>
  );
}
```

### When `@apply` IS acceptable

```css
/* Only for base HTML elements you can't add classes to */
/* (e.g., markdown content from a CMS, prose styling) */

.prose h1 { @apply text-3xl font-bold text-text-primary mb-4; }
.prose h2 { @apply text-2xl font-semibold text-text-primary mb-3; }
.prose p  { @apply text-base leading-relaxed text-text-primary mb-4; }
.prose a  { @apply text-text-brand underline hover:no-underline; }
.prose ul { @apply list-disc pl-5 space-y-1; }
/* Use @tailwindcss/typography plugin instead where possible */
```

### cn() utility (always use, never string concatenation)

```typescript
// lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges Tailwind classes correctly — handles conflicts (p-4 + px-6 → px-6)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  'base-class',
  isActive && 'text-brand',
  size === 'lg' && 'text-lg',
  className,   // Always accept className prop for overrides
)} />
```

---

## CSS Modules: When to Use

Use CSS Modules when Tailwind becomes unmanageable: complex keyframe animations, pseudo-elements (`::before`, `::after`), `:has()` selectors, or more than ~20 conditional classes.

```tsx
// components/RippleButton/RippleButton.tsx
import styles from './RippleButton.module.css';
import { cn } from '@/lib/cn';

export function RippleButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(styles.root, 'px-4 py-2 font-medium', className)}
      {...props}
    >
      {children}
    </button>
  );
}
```

```css
/* components/RippleButton/RippleButton.module.css */
/* Complex interaction state impossible in Tailwind alone */
.root {
  position: relative;
  overflow: hidden;
}

.root::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgb(255 255 255 / 0.3) 0%, transparent 70%);
  transform: scale(0);
  transition: transform 0.4s, opacity 0.4s;
  opacity: 0;
}

.root:active::after {
  transform: scale(4);
  opacity: 1;
  transition: 0s;
}
```

---

## Responsive Design System

### Breakpoints (mobile-first)

```typescript
// tailwind.config.ts — use semantic breakpoint names
theme: {
  screens: {
    sm: '640px',   // Large phones
    md: '768px',   // Tablets
    lg: '1024px',  // Small desktop
    xl: '1280px',  // Desktop
    '2xl': '1536px', // Large desktop
  },
}

// Usage: always mobile-first (no prefix = all sizes, then override up)
<div className="
  grid
  grid-cols-1        /* mobile */
  sm:grid-cols-2     /* tablet */
  lg:grid-cols-3     /* desktop */
  gap-4
  sm:gap-6
">
```

### Container Queries (modern, component-aware)

Container queries let a component respond to its container size, not viewport size. Better for reusable components.

```css
/* In a .module.css or global.css */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card-body {
    flex-direction: row;
  }
}
```

```tsx
// Or with Tailwind v4 container queries:
<div className="@container">
  <div className="flex flex-col @md:flex-row gap-4">
    {/* Responds to container, not viewport */}
  </div>
</div>
```

### Fluid Typography

Scale font sizes smoothly between viewport sizes without breakpoint jumps.

```css
/* Fluid typography with clamp() */
:root {
  /* Font scales from 16px at 320px viewport to 18px at 1280px */
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);

  /* Headings scale more aggressively */
  --text-h1: clamp(1.875rem, 1.5rem + 1.875vw, 3rem);    /* 30px → 48px */
  --text-h2: clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem);   /* 24px → 36px */
  --text-h3: clamp(1.25rem, 1.1rem + 0.75vw, 1.75rem);   /* 20px → 28px */
}

/* Formula: clamp(min, preferred, max)
   preferred = minSize + (maxSize - minSize) * (100vw - minWidth) / (maxWidth - minWidth)
   Use: https://clamp.font-size.app/ to calculate */
```

---

## Layout Patterns

### Sidebar layout

```tsx
<div className="flex h-screen overflow-hidden">
  {/* Sidebar: fixed width, scrollable */}
  <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-border">
    <Sidebar />
  </aside>

  {/* Main: fills remaining space, scrollable independently */}
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-4xl mx-auto px-6 py-8">
      {children}
    </div>
  </main>
</div>
```

### Holy grail (header + sidebar + content + footer)

```tsx
<div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
  <header className="border-b border-border px-6 h-16 flex items-center">
    <Header />
  </header>

  <div className="grid grid-cols-[240px_1fr] overflow-hidden">
    <aside className="overflow-y-auto border-r border-border"><Sidebar /></aside>
    <main className="overflow-y-auto p-6"><Outlet /></main>
  </div>

  <footer className="border-t border-border px-6 py-4 text-sm text-text-secondary">
    <Footer />
  </footer>
</div>
```

### Card grid (responsive, no JS)

```tsx
<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
  {items.map(item => <Card key={item.id} item={item} />)}
</div>
```

---

## Common Tailwind Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `text-[#3b82f6]` (arbitrary color) | Bypasses token system, not themeable | Use `text-brand` from design token |
| `mt-[13px]` (arbitrary spacing) | Off the spacing scale, inconsistent | Round to nearest scale value |
| Conditional classes with string template | `tailwind-merge` can't deduplicate | Use `cn()` + conditional objects |
| 40+ classes on one element | Unreadable, hard to override | Extract to component |
| `!important` modifiers | Specificity battles | Fix the source of the conflict |
| Purge not configured | 10MB CSS bundle | Ensure `content` paths cover all files |

---

## Checklist

- [ ] `cn()` (clsx + tailwind-merge) used for all conditional classes
- [ ] Arbitrary values (`[]`) used only when design token doesn't exist
- [ ] CSS Modules used for animations and complex pseudo-selectors
- [ ] Responsive design mobile-first (`sm:`, `md:`, `lg:` prefixes)
- [ ] Fluid typography with `clamp()` for headings
- [ ] `container-type` set on components that need container queries
- [ ] No `@apply` except for prose/markdown styles
- [ ] `className` prop forwarded on all components (allows external overrides)
- [ ] Tailwind `content` config covers all template paths (no missing purge)
