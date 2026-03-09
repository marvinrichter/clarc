---
name: icon-system
description: "SVG icon system design: icon library selection (Lucide, Phosphor, Heroicons), custom icon brief writing, SVG optimization with SVGO, icon tokens (size, color, stroke), accessibility (aria-label, title, role), sprite sheet generation, icon naming conventions, and icon-to-code workflow. From picking an icon set to shipping accessible, performant icons."
---

# Icon System Skill

## When to Activate

- Choosing an icon library for a new product
- Building a custom icon set
- Auditing existing icons for consistency or accessibility
- Setting up SVG sprite sheets or icon components
- Defining icon tokens (sizes, stroke widths, colors)
- Writing a brief for a designer creating custom icons

---

## Icon Library Selection

Choose based on three criteria: style fit, license, and feature completeness.

### Major libraries comparison

| Library | Style | License | Count | Variable weight |
|---------|-------|---------|-------|----------------|
| **Lucide** | Clean line, 2px stroke | ISC (free) | 1400+ | No |
| **Phosphor** | Versatile, 6 weights | MIT (free) | 1200+ | Yes (thin/light/regular/bold/fill/duotone) |
| **Heroicons** | Tailwind-native, clean | MIT (free) | 292 | outline + solid |
| **Tabler** | Stroke-based, consistent | MIT (free) | 4800+ | No |
| **Radix Icons** | Minimal, 15×15 grid | MIT (free) | 318 | No |
| **Material Symbols** | Google, adaptive optical size | Apache 2.0 | 2900+ | Variable font |

**Decision guide:**
```
Tailwind project             → Heroicons (designed together)
React component library      → Lucide (tree-shakeable, consistent)
Need weight variants         → Phosphor
Large icon count needed      → Tabler
Material Design app          → Material Symbols (variable font)
Custom brand icons           → Write a brief (see below)
```

---

## Icon Token System

Every icon system needs three token layers:

### 1. Size tokens

```css
:root {
  --icon-xs:  12px;   /* inline text companion */
  --icon-sm:  16px;   /* button/label icons */
  --icon-md:  20px;   /* default UI icon */
  --icon-lg:  24px;   /* prominent action icons */
  --icon-xl:  32px;   /* feature/hero icons */
  --icon-2xl: 48px;   /* illustration-scale icons */
}
```

### 2. Stroke tokens (for line-based icons)

```css
:root {
  --icon-stroke-sm:  1.5px;   /* delicate, for large icons */
  --icon-stroke-md:  2px;     /* default (matches most libraries) */
  --icon-stroke-lg:  2.5px;   /* bold/accessible contexts */
}
```

Rule: stroke width must scale with icon size. A 2px stroke on a 12px icon looks heavy; use 1.5px. A 2px stroke on a 48px icon looks thin; use 2.5px.

### 3. Color tokens

Icons inherit `currentColor` by default — do NOT hardcode colors in SVG fill/stroke.

```css
/* Semantic icon colors */
--icon-default:   var(--color-neutral-700);
--icon-muted:     var(--color-neutral-400);
--icon-brand:     var(--color-primary);
--icon-success:   var(--color-success);
--icon-warning:   var(--color-warning);
--icon-danger:    var(--color-error);
--icon-inverse:   var(--color-neutral-50);  /* on dark backgrounds */
```

---

## SVG Optimization with SVGO

Never ship raw SVG from Figma or icon libraries — run through SVGO first.

### Recommended SVGO config (`svgo.config.js`)

```js
module.exports = {
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'cleanupAttrs',
    'mergeStyles',
    'inlineStyles',
    'minifyStyles',
    'cleanupIds',           // remove unnecessary IDs
    'removeUselessDefs',
    'cleanupNumericValues',
    'convertColors',        // normalize color values
    'removeUnknownsAndDefaults',
    'removeNonInheritableGroupAttrs',
    'removeUselessStrokeAndFill',
    'removeViewBox',        // keep false if icons vary in size
    'cleanupEnableBackground',
    'removeHiddenElems',
    'removeEmptyText',
    'convertShapeToPath',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'collapseGroups',
    'convertPathData',
    'convertEllipseToCircle',
    'convertTransform',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'mergePaths',
    'removeUnusedNS',
    'sortDefsChildren',
    'removeTitle',          // keep false if you need title for accessibility
    'removeDesc',
  ],
};
```

Typical result: 30-60% file size reduction.

---

## SVG Sprite Sheet

Use a sprite sheet for icons used multiple times across a page — reduces DOM nodes.

### Build script (`scripts/build-icons.js`)

```js
const fs = require('fs');
const path = require('path');

const iconsDir = './src/icons';
const outputFile = './public/icons/sprite.svg';

const icons = fs.readdirSync(iconsDir)
  .filter(f => f.endsWith('.svg'))
  .map(f => {
    const id = path.basename(f, '.svg');
    const content = fs.readFileSync(path.join(iconsDir, f), 'utf8');
    // Extract inner SVG content, wrap in <symbol>
    const inner = content
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>/, '');
    return `<symbol id="icon-${id}" viewBox="0 0 24 24">${inner}</symbol>`;
  });

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${icons.join('\n')}\n</svg>`;
fs.writeFileSync(outputFile, sprite);
```

### Usage in HTML

```html
<!-- Inline sprite at top of body (or load via fetch) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <!-- sprite content -->
</svg>

<!-- Use icon -->
<svg class="icon icon-md" aria-hidden="true" focusable="false">
  <use href="/icons/sprite.svg#icon-arrow-right" />
</svg>
```

---

## React Icon Component Pattern

```tsx
interface IconProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;           // accessible label (required for meaningful icons)
  className?: string;
}

const sizeMap = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 };

export function Icon({ name, size = 'md', label, className }: IconProps) {
  const px = sizeMap[size];
  return (
    <svg
      width={px}
      height={px}
      aria-hidden={!label}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      className={className}
    >
      <use href={`/icons/sprite.svg#icon-${name}`} />
    </svg>
  );
}

// Decorative (no label): aria-hidden="true"
<Icon name="arrow-right" />

// Meaningful (standalone, must have label):
<Icon name="close" label="Close dialog" />
```

---

## Accessibility Rules

| Scenario | Pattern |
|----------|---------|
| Icon beside visible text label | `aria-hidden="true"` on SVG — text already describes it |
| Icon is the only label (button/link) | `aria-label` on the SVG **or** `<title>` inside SVG |
| Standalone icon with complex meaning | `<title>` + `aria-labelledby` |
| Decorative (purely visual) | `aria-hidden="true"`, `focusable="false"` |

```html
<!-- Icon-only button — WRONG (no accessible name) -->
<button><svg>...</svg></button>

<!-- CORRECT option 1: aria-label on button -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- CORRECT option 2: visually hidden text -->
<button>
  <svg aria-hidden="true" focusable="false">...</svg>
  <span class="sr-only">Close dialog</span>
</button>
```

---

## Icon Naming Conventions

Consistent naming prevents `icon-close` vs `icon-x` vs `icon-dismiss` chaos.

### Rules

```
Format:     kebab-case, all lowercase
Prefix:     none (the component adds "icon-")
Category:   noun-first, then modifier

Examples:
  arrow-right       (not right-arrow)
  arrow-up
  arrow-down
  chevron-right     (smaller, subtle arrow)
  caret-down        (for dropdowns)
  check             (not checkmark, tick, done)
  check-circle      (filled success state)
  x                 (not close, dismiss, cancel)
  x-circle
  alert-triangle    (not warning, caution)
  alert-circle
  info-circle
  plus
  minus
  search
  user
  users
  settings
  trash
  edit
  eye
  eye-off
```

### Semantic naming over literal

```
WRONG: pencil, garbage-bin, magnifying-glass
RIGHT: edit,   trash,       search
```

Semantic names survive icon style changes (pencil → pen → edit icon).

---

## Custom Icon Brief

When custom icons are needed, write a brief instead of designing them ad hoc.

```markdown
## Custom Icon Brief — [Product Name]

### Icon style
- Grid: 24×24px (use 20×20 for compact variant)
- Stroke width: 2px, round cap and join
- Style: [Line only | Filled | Duotone (line + fill at 20% opacity)]
- Corner radius: [0 = sharp | 2px = slightly rounded | 4px = friendly]

### Visual language
- [2-3 sentences on the aesthetic — e.g., "Clean and precise, technical feel.
  No decorative elements. Minimal path count."]

### Reference library
- Base style on: [Lucide | Heroicons | Phosphor Regular]
- Diverge by: [e.g., slightly rounder corners, 1.5px stroke instead of 2px]

### Icons needed
| Name | Purpose | Notes |
|------|---------|-------|
| api-key | Represents an API key credential | Key shape, maybe with circuit motif |
| webhook | Webhook event trigger | Chain/hook motif |

### Prohibited patterns
- No gradient fills
- No drop shadows
- No more than 3 distinct path shapes per icon

### Deliverables
- SVG files, 24×24 viewBox
- Optimized via SVGO
- Named: kebab-case (e.g., api-key.svg)
```

---

## Checklist

- [ ] Icon library chosen and justified (style fit, license, feature set)
- [ ] Size tokens defined (at minimum: sm/md/lg = 16/20/24px)
- [ ] Stroke token defined (2px default, scales with size)
- [ ] All SVGs use `currentColor` — no hardcoded fill/stroke colors
- [ ] SVGs optimized via SVGO
- [ ] Sprite sheet or tree-shakeable component pattern implemented
- [ ] Decorative icons: `aria-hidden="true"` and `focusable="false"`
- [ ] Meaningful icons: `aria-label` or `<title>` present
- [ ] Icon-only buttons: accessible name on the button element
- [ ] Naming convention documented and enforced
- [ ] Icon inventory exists (list of all icon names and their semantic purpose)
