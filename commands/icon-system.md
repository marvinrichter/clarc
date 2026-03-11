---
description: Generate an icon system specification — library selection recommendation, token definitions (size/stroke/color), naming convention, accessibility rules, and a React icon component template. Use when starting a new project or auditing existing icons.
---

# Icon System

Generate a complete icon system specification for a product.

## Usage

```
/icon-system
/icon-system --library lucide --framework react
/icon-system --audit   # audit existing icons for consistency issues
```

## Steps

Use the `icon-system` skill throughout this command.

### 1. Gather context (ask if not in `$ARGUMENTS`)

- **Framework**: React / Vue / Svelte / HTML / other?
- **Brand style**: Minimal/technical | Friendly/rounded | Bold/geometric | Custom
- **Custom icons needed**: Yes / No (how many approximate)
- **Audit mode**: Is this for a new project or reviewing existing icons?

### 2. Library recommendation

Based on the brand style and framework:
- Compare Lucide, Phosphor, Heroicons, Tabler (size, style, license, weight variants)
- Recommend one primary library with justification
- Note if a custom icon brief is needed for brand-specific icons

### 3. Token definitions

Output a complete token set:

```css
/* Size tokens */
--icon-xs: 12px;
--icon-sm: 16px;
--icon-md: 20px;   /* default */
--icon-lg: 24px;
--icon-xl: 32px;

/* Stroke tokens (if line-based icons) */
--icon-stroke-sm: 1.5px;
--icon-stroke-md: 2px;     /* default */
--icon-stroke-lg: 2.5px;

/* Color tokens (inherit currentColor — define semantic intent) */
--icon-default: var(--color-neutral-700);
--icon-muted:   var(--color-neutral-400);
--icon-brand:   var(--color-primary);
--icon-success: var(--color-success);
--icon-warning: var(--color-warning);
--icon-danger:  var(--color-error);
--icon-inverse: var(--color-neutral-50);
```

### 4. Naming convention

Document the naming convention for the project:
- Format: kebab-case (arrow-right, not rightArrow)
- Semantic names over literal (edit not pencil, trash not garbage)
- List top 20 common icons with canonical names

### 5. Icon component template

Generate a typed React (or framework-appropriate) icon component with:
- Size prop mapped to token
- `aria-hidden` for decorative icons
- `aria-label` support for meaningful icons
- `focusable="false"` for SVG

### 6. Accessibility rules summary

Concise do/don't for the team:
- When `aria-hidden="true"` is correct
- When `aria-label` is required
- Icon-only button pattern

### 7. Audit mode (if `--audit` flag)

If reviewing existing icons:
1. List all icon-related files found in codebase
2. Check: Are multiple icon libraries mixed?
3. Check: Are hardcoded colors in SVGs (not `currentColor`)?
4. Check: Do icon-only interactive elements have accessible names?
5. Check: Is there a consistent naming convention?
6. Output: Priority-sorted fix list

## Output

Deliver as a markdown document that can be saved to `docs/icon-system.md`:
- Library decision with rationale
- Token CSS block (copy-pasteable)
- Naming convention table
- Icon component code
- Accessibility rules
- (In audit mode) finding list with severity

## After This

- `/design-system-review` — verify icons integrate correctly with the design system
- `/code-review` — review icon component implementation
