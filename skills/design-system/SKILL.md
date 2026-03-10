---
name: design-system
description: "Design system architecture: design tokens (color, spacing, typography, radius), component library layers (Primitive → Composite → Pattern), theming with CSS Custom Properties and Tailwind, Storybook documentation, and dark mode. The foundation for consistent UI across an entire product."
---

# Design System Skill

## When to Activate

- Starting a new product UI from scratch
- UI feels inconsistent across pages (colors, spacing, typography vary)
- Multiple developers building UI components independently
- Setting up dark mode or multiple themes
- Building a component library
- Documenting components for a team
- Migrating hardcoded color or spacing values to a token-based system that supports theming
- Structuring components across Primitive, Composite, and Pattern layers to avoid circular dependencies

---

## Layer Architecture

```
Tokens          → Raw values (colors, spacing scale, radius, shadows)
Semantic Tokens → Named by purpose (--color-surface, --color-brand-primary)
Primitives      → Unstyled, accessible base components (Button, Input, Dialog)
Composites      → Styled, opinionated components (SearchBar, UserCard)
Patterns        → Full UI sections (EmptyState, DataTable, PageHeader)
```

Each layer only imports from the layer below it. Never skip layers.

---

## Design Tokens

### CSS Custom Properties (recommended — works with any framework)

```css
/* tokens/colors.css */
:root {
  /* Palette — raw values, not used directly in components */
  --blue-50:  #eff6ff;
  --blue-100: #dbeafe;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;

  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;

  --red-500:  #ef4444;
  --green-500: #22c55e;
  --yellow-500: #eab308;

  /* Semantic tokens — used in components */
  --color-brand:           var(--blue-600);
  --color-brand-hover:     var(--blue-700);
  --color-brand-subtle:    var(--blue-50);

  --color-surface:         #ffffff;
  --color-surface-raised:  var(--gray-50);
  --color-surface-overlay: var(--gray-100);

  --color-text-primary:    var(--gray-900);
  --color-text-secondary:  var(--gray-500);
  --color-text-disabled:   var(--gray-200);
  --color-text-inverse:    #ffffff;
  --color-text-brand:      var(--blue-600);

  --color-border:          var(--gray-200);
  --color-border-strong:   var(--gray-500);
  --color-border-brand:    var(--blue-500);

  --color-feedback-error:        var(--red-500);
  --color-feedback-success:      var(--green-500);
  --color-feedback-warning:      var(--yellow-500);
  --color-feedback-info:         var(--blue-500);

  --color-feedback-error-subtle:   #fef2f2;
  --color-feedback-success-subtle: #f0fdf4;
}

/* Dark mode — swap semantic tokens only */
[data-theme="dark"] {
  --color-surface:         #0f172a;
  --color-surface-raised:  #1e293b;
  --color-surface-overlay: #334155;

  --color-text-primary:    #f8fafc;
  --color-text-secondary:  #94a3b8;
  --color-text-disabled:   #475569;

  --color-border:          #334155;
  --color-border-strong:   #64748b;
}
```

```css
/* tokens/spacing.css */
:root {
  --space-1:  0.25rem;  /*  4px */
  --space-2:  0.5rem;   /*  8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Semantic spacing */
  --spacing-component-xs: var(--space-2);
  --spacing-component-sm: var(--space-3);
  --spacing-component-md: var(--space-4);
  --spacing-component-lg: var(--space-6);
  --spacing-section:      var(--space-12);
  --spacing-page:         var(--space-16);
}
```

```css
/* tokens/typography.css */
:root {
  --font-sans:  'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;

  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */

  --leading-tight:  1.25;
  --leading-snug:   1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
}
```

```css
/* tokens/shape.css */
:root {
  --radius-sm:   0.25rem;  /* 4px  — tags, badges */
  --radius-md:   0.375rem; /* 6px  — buttons, inputs */
  --radius-lg:   0.5rem;   /* 8px  — cards */
  --radius-xl:   0.75rem;  /* 12px — modals, panels */
  --radius-full: 9999px;   /* pills */

  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```

---

## Tailwind Theme Integration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover:   'var(--color-brand-hover)',
          subtle:  'var(--color-brand-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised:  'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled:  'var(--color-text-disabled)',
          inverse:   'var(--color-text-inverse)',
          brand:     'var(--color-text-brand)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
          brand:   'var(--color-border-brand)',
        },
        error:   'var(--color-feedback-error)',
        success: 'var(--color-feedback-success)',
        warning: 'var(--color-feedback-warning)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
} satisfies Config;
```

---

## Primitive Components

Primitives are headless (no visual opinions) or minimally styled. They handle accessibility and behavior; Composites handle visual design.

```tsx
// components/primitives/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const button = cva(
  // Base — always applied
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-md',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary:   'bg-brand text-text-inverse hover:bg-brand-hover',
        secondary: 'bg-surface-overlay text-text-primary hover:bg-border',
        ghost:     'text-text-primary hover:bg-surface-overlay',
        danger:    'bg-error text-white hover:bg-red-600',
        outline:   'border border-border text-text-primary hover:bg-surface-raised',
      },
      size: {
        sm: 'h-8  px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={button({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner size="sm" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

---

## Dark Mode Toggle

```tsx
// providers/ThemeProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: 'system', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## Storybook Documentation

```tsx
// components/primitives/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ['autodocs'],    // Auto-generate docs from JSDoc + props
  argTypes: {
    variant: { control: 'select' },
    size: { control: 'select' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Button', variant: 'primary' } };
export const Secondary: Story = { args: { children: 'Button', variant: 'secondary' } };
export const Loading: Story = { args: { children: 'Saving', loading: true } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };

// Comprehensive variant matrix
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['primary', 'secondary', 'ghost', 'danger', 'outline'] as const).map(v => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
};
```

---

## Checklist

- [ ] Design tokens defined as CSS Custom Properties (not hardcoded values in components)
- [ ] Semantic tokens used in components (not palette tokens directly)
- [ ] Dark mode swaps semantic tokens only (palette tokens unchanged)
- [ ] Component variants use `cva` (class-variance-authority) — not inline ternaries
- [ ] All interactive components have `focus-visible` ring
- [ ] Storybook story per component with all variant/state combinations
- [ ] No magic numbers in components — always a token reference
- [ ] Typography scale uses `--text-*` tokens, not arbitrary `text-[17px]`
- [ ] Spacing uses scale (`p-4`, `gap-6`) — never arbitrary spacing
- [ ] `forwardRef` on all primitive components (allows composition)
