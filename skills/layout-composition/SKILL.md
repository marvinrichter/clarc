---
name: layout-composition
description: "Visual layout and composition principles: grid systems (column, baseline, modular), Gestalt principles (proximity, alignment, contrast, repetition, enclosure), whitespace as an active design element, visual hierarchy construction, and focal point design. Use when making layout decisions, not just implementing them."
---

# Layout Composition Skill

## When to Activate

- Making layout decisions for a new screen or component
- Diagnosing why a layout feels crowded, inconsistent, or confusing
- Choosing a grid system for a design system
- Evaluating visual hierarchy in a design review
- Deciding where to place the primary CTA

---

## Grid Systems

Choose the grid based on the content type:

| Grid type | Best for | Key characteristic |
|-----------|----------|-------------------|
| **Column grid** | General UI, marketing pages | 12 columns (web), 4 columns (mobile) |
| **Baseline grid** | Text-heavy layouts, editorial | 4px or 8px vertical rhythm |
| **Modular grid** | Cards, dashboards, galleries | Equal-sized cells |
| **Custom** | Full-bleed hero, landing pages | Explicit asymmetry by design |

### Column grid (12-column, web)

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;                /* gutter */
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;          /* page margin */
}

/* Common span patterns */
.full-width     { grid-column: span 12; }
.two-thirds     { grid-column: span 8; }
.one-third      { grid-column: span 4; }
.half           { grid-column: span 6; }
.one-quarter    { grid-column: span 3; }
```

### Breakpoint adaptation

```css
@media (max-width: 1024px) { .grid { grid-template-columns: repeat(8, 1fr); } }
@media (max-width: 768px)  { .grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
@media (max-width: 480px)  { .grid { grid-template-columns: 1fr; gap: 12px; } }
```

### 8px base unit (baseline grid)

All spacing values must be multiples of 8px (or 4px for fine-grained work):

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

Why 8px? Screen densities (1×, 2×, 3×) all divide evenly into 8 — values stay crisp.

---

## Gestalt Principles

These principles describe how humans automatically group visual elements. Use them deliberately.

### 1. Proximity

Elements close together are perceived as a group. Distance creates separation.

```
APPLY: Group related form fields together, separate from unrelated sections.
       Keep labels within 8px of their inputs; put 32px between field groups.

COMMON MISTAKE: Equal spacing between everything — no visual grouping.
```

### 2. Alignment

Elements aligned on a shared invisible axis appear ordered and related.

```
APPLY: Align all body text to the same left edge. Align card content to a grid.
       Mixing left-aligned and center-aligned text in one section creates visual noise.

COMMON MISTAKE: Centering headings while left-aligning body — breaks axis consistency.
```

### 3. Contrast

Differences in size, color, or weight create emphasis and hierarchy.

```
APPLY: Primary button: filled, bold color. Secondary: outlined, muted.
       H1: 3× larger than body. Key metric: 4× larger than label.

COMMON MISTAKE: All buttons the same size and color — no hierarchy.
                "Everything is bold" — when everything is emphasized, nothing is.
```

### 4. Repetition (Consistency)

Repeating visual elements across a composition creates unity and reduces cognitive load.

```
APPLY: All cards have the same padding, border radius, shadow.
       All section headers use the same H2 style.
       All CTAs are the same button component.

COMMON MISTAKE: Slightly different card styles across pages — feels inconsistent,
                erodes trust.
```

### 5. Enclosure

A boundary (card, background, border, shadow) groups elements and separates them from surroundings.

```
APPLY: Cards use a container with border/shadow to define a unit of content.
       Modal dialogs use a contrasting background to separate from page.
       Sidebar uses a different background to separate from main content.

COMMON MISTAKE: Using both a border AND a shadow — double enclosure is redundant.
                Use one or the other.
```

---

## Whitespace as Design Element

### Macro whitespace (between sections)

Space between major sections signals a topic change and gives the eye a rest:

```
Section → 80-120px gap → Section
(Not 24px — that's content spacing, not section separation)
```

### Micro whitespace (within components)

Space between text and adjacent elements (icons, borders, other text):

```
Icon + label: 8px gap
Label + input: 4-8px gap
Button padding: 12px vertical, 24px horizontal
Card padding: 24-32px
```

### Active vs. passive whitespace

- **Active whitespace** — intentional empty space that directs attention (isolation of a CTA, breathing room around a hero element)
- **Passive whitespace** — space that appears between elements as a byproduct of layout

A premium product feel is often achieved by increasing active whitespace — the Apple website being the canonical example.

### "Breathing room" principle

If a design feels crowded, increase whitespace by 50% and evaluate. Crowded layouts are perceived as less trustworthy and more stressful to read.

---

## Visual Hierarchy

### Priority ordering

Build hierarchy with these tools, in descending effectiveness:

```
1. SIZE         — largest elements are read first; 3× size = highest priority
2. WEIGHT       — bold vs. regular; use weight to indicate importance within same size
3. COLOR        — primary color = primary action; muted = secondary
4. POSITION     — top-left is read first (F-pattern); center commands attention
5. CONTRAST     — high contrast = foreground; low contrast = recedes
```

### Maximum hierarchy levels

Use a maximum of 3 distinct visual levels per screen:

```
Level 1: Primary heading / Key metric — most prominent
Level 2: Body text / Secondary labels — readable, not competing
Level 3: Caption / Helper text — clearly subordinate

WRONG: 5 different font sizes, 3 different colors, 4 different weights in one card
       → user cannot determine what matters
```

### Hierarchy failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "I don't know where to look" | No single primary element | Increase size/contrast of one element 2-3× |
| "It all looks the same" | Insufficient contrast between levels | Widen the size or weight gap |
| "It feels cluttered" | Too many level-1 elements | Demote secondary items to level 2 |

---

## Focal Point Design

### The One Primary CTA Rule

Every screen has exactly one primary action. Everything else is secondary or tertiary.

```
WRONG: Two equally prominent blue buttons ("Save" and "Publish")
RIGHT: "Publish" (filled, primary color) and "Save draft" (text link or ghost)
```

### Visual focal point techniques

1. **Isolation** — surround the focal element with more whitespace than its neighbors
2. **Scale** — make the focal element 2-3× larger than surrounding elements
3. **Contrast** — use the highest-contrast color in the palette for the primary CTA
4. **Leading lines** — angled elements, arrows, or directional photography that point toward the CTA

### F-Pattern and Z-Pattern

```
F-Pattern (content-heavy pages):
Users read: top-left header → left edge down → another horizontal scan partway down
→ Primary content: top-left
→ CTAs: top-right or in the first horizontal scan

Z-Pattern (marketing/landing pages):
Top-left → Top-right → Diagonal to Bottom-left → Bottom-right (final CTA)
→ Key visual or proof point: top-right
→ Primary CTA: bottom-right
```

---

## Checklist

- [ ] Grid system chosen for content type (column / baseline / modular)
- [ ] Spacing values are 8px multiples
- [ ] Proximity: related elements ≤8px apart; section gaps ≥32px
- [ ] All elements align to a shared column or edge (no floating elements)
- [ ] Contrast: primary button visually dominates secondary
- [ ] Repetition: card components, buttons, headings are visually consistent
- [ ] Enclosure: card uses border OR shadow, not both
- [ ] Section gaps are macro (80-120px), not micro
- [ ] Exactly one primary CTA per screen
- [ ] Maximum 3 hierarchy levels per screen
- [ ] Active whitespace used to isolate the primary focal element
