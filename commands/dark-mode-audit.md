---
description: Audit a codebase's dark mode implementation — checks color strategy (not just CSS invert), elevation system, token structure, contrast ratios on dark surfaces, and common mistakes. Outputs a prioritized finding list with fixes.
---

# Dark Mode Audit

Audit a dark mode implementation for correctness, visual quality, and accessibility.

## Usage

```
/dark-mode-audit
/dark-mode-audit src/styles/
/dark-mode-audit --tokens-only   # only review token structure
```

## Steps

Use the `color-theory` and `design-system` skills throughout.

### 1. Locate color definitions

Search for:
- CSS custom properties (`--color-*`, `--surface-*`, `--bg-*`, `--text-*`)
- Tailwind config color values
- Theme files (theme.ts, tokens.css, variables.scss)
- Dark mode class or attribute overrides (`[data-theme="dark"]`, `.dark`, `prefers-color-scheme`)

Report: where are dark mode colors defined and how is the mode switched?

### 2. Check color strategy

**Surface colors**
- Are dark mode backgrounds true black (`#000000`) or off-black? (black = fail)
- Is there a multi-step surface scale (5+ distinct levels) or just one dark bg?
- Do lighter surfaces communicate higher elevation?

**Text colors**
- Is dark mode text true white (`#ffffff`) or off-white? (white = harsh)
- Does secondary text have enough contrast on the dark surface?
- Does disabled text still meet WCAG AA (≥ 4.5:1 on body, ≥ 3:1 for large)?

**Brand / accent colors**
- Is the brand color unchanged between light and dark mode?
- Does the brand color have sufficient contrast on dark surfaces?
- Are saturated colors slightly desaturated in dark mode?

**Semantic colors**
- Are success/warning/error colors lightened for dark surfaces?
- Do semantic colors pass WCAG on dark backgrounds?

### 3. Check elevation system

In dark mode, elevation should use surface color lightness, not shadow alone:
- Is there a surface scale (level 0 → level 4, each lighter)?
- Do modals / overlays / tooltips appear distinctly "above" the base surface?
- Are box shadows reduced or removed in dark mode?

### 4. Contrast analysis

For each color pair found (text on background):
- Report the estimated contrast ratio
- Flag anything below WCAG AA (4.5:1 normal text, 3:1 large text/UI)
- Special attention: placeholder text, disabled state, secondary text on cards

### 5. Common mistakes scan

Check for each:

| Issue | How to detect |
|-------|--------------|
| CSS `filter: invert()` used for dark mode | Search codebase for `invert` |
| Pure black background | `#000000` or `rgb(0,0,0)` in dark styles |
| Pure white text | `#ffffff` or `rgb(255,255,255)` in dark text tokens |
| Same brand color as light mode with no contrast check | Compare token values |
| Images/illustrations not adapted for dark mode | Check if `<img>` elements have dark mode variants |
| Focus rings invisible on dark surfaces | Check `:focus-visible` styles in dark mode |
| Shadows unchanged between modes | Check `box-shadow` dark mode overrides |

### 6. Token naming audit

- Are dark mode tokens semantic (named by purpose, not value)?
- Is `prefers-color-scheme` media query present as fallback?
- Is there a manual toggle mechanism (in addition to system preference)?

### 7. Output

Produce a structured report:

```
## Dark Mode Audit — [Project Name]

### Summary
[N] issues found: [N] Critical, [N] High, [N] Medium

### Critical (visual or accessibility failures)
[List with file:line and exact fix]

### High (quality issues that degrade experience)
[List with description and recommended approach]

### Medium (polish and best practice)
[List]

### What's working well
[Positive observations]

### Quick wins (can fix in < 30 minutes)
[Highest-impact, lowest-effort fixes]
```

## After This

- `/code-review` — review dark mode token fixes
- `/design-system-review` — full design system audit if token gaps are widespread
