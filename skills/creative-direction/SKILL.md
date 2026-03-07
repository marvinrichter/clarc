---
name: creative-direction
description: "Creative direction for digital products: defining visual language, writing illustration style briefs, icon style guidelines, photography/image direction, motion language definition, and maintaining creative consistency across touchpoints. Use when defining what a product should look and feel like."
---

# Creative Direction Skill

## When to Activate

- Defining the overall look and feel of a new product or feature
- Briefing a designer, illustrator, or motion designer
- Reviewing creative work for brand consistency
- Diagnosing why a product's visual language feels inconsistent or off-brand
- Setting up creative guidelines before the first external designer joins

---

## Visual Language Definition

A visual language is the set of choices that makes all visual elements feel like they belong to the same product. Define it on four dimensions:

### 1. Form

What kind of shapes define the product?

| Direction | Character | Examples |
|-----------|-----------|---------|
| **Geometric** | Precise, technical, modern | Circles, squares, exact angles |
| **Organic** | Warm, human, approachable | Rounded, irregular, flowing curves |
| **Abstract** | Expressive, creative, unique | Custom shapes, non-literal |
| **Flat** | Clean, minimal, digital-native | No depth, no shadow |

### 2. Line

How lines are used (in icons, borders, dividers):

| Direction | When to use |
|-----------|------------|
| **Clean/structural** | Technical products, data tools |
| **Expressive/hand-drawn** | Creative tools, lifestyle products |
| **Minimal/absent** | Premium, luxury, content-first |

### 3. Texture

Is the visual world flat, or does it have depth and material?

| Direction | Effect |
|-----------|--------|
| **Flat** | Modern, digital, minimal (Material Design, Fluent at 1× depth) |
| **Subtle depth** | Card shadows, gentle gradients |
| **Layered/glass** | iOS 26 Liquid Glass, translucency |
| **Material/textured** | Paper grain, fabric, brushed metal (rare in UI, common in marketing) |

### 4. Spatiality

Does the product feel two-dimensional or three-dimensional?

| Direction | Example |
|-----------|---------|
| **Flat** | Stripe, Linear |
| **Soft 3D** | Notion's homepage, Lottie animations |
| **Skeuomorphic** | iOS pre-2013; rare today except for specific effects |

---

## Illustration Style Brief

An illustration brief ensures a freelancer or agency produces work that fits without revision cycles.

```markdown
## Illustration Style Brief — [Product Name]

### Style direction
[e.g., "Flat vector with geometric forms, minimal detail, 3-4 color palette maximum"]

### Mood
[e.g., "Friendly and optimistic — like a knowledgeable colleague, not a corporate report"]

### Style references (3-5 links or descriptions)
1. [Reference] — because [one specific reason it relates]
2. ...

### Color palette
- Primary: [Hex or HSL]
- Secondary: [Hex or HSL]
- Neutrals: [range]
- Maximum colors per illustration: [N]

### Character style (if characters appear)
- Body type: [abstract / semi-realistic / geometric]
- Diversity: [explicit brief on skin tones, body types, age range]
- Expression: [neutral and calm / expressive / realistic]
- No characters — icon/object-only illustrations

### Stroke
- Stroke: [none / 1px / 2px]
- Stroke color: [same as fill / dark outline / none]
- Corner radius on shapes: [sharp / slightly rounded / very rounded]

### What to avoid
- [Specific style, element, or cliché to exclude]
- [e.g., "No stock illustration hand-shake imagery", "No purple gradients"]

### File deliverables
- SVG (scalable, editable)
- PNG at 2× and 3× for raster contexts
- Figma source file with components
```

---

## Icon Style Guide

Consistent icons are one of the highest-leverage consistency investments.

### Core decisions

| Decision | Options | Choose based on |
|----------|---------|----------------|
| **Stroke vs. fill** | Stroke only / Fill only / Stroke + fill (mixed) | Stroke = light, precise; Fill = bold, clear at small sizes |
| **Stroke width** | 1px / 1.5px / 2px (at 24px grid) | Heavier for bold brand, lighter for minimal |
| **Corner radius** | 0px (sharp) / 1-2px (slightly rounded) / full (pill) | Matches brand form direction |
| **Grid size** | 24×24px (standard) / 20×20px (compact) / 16×16px (micro) | Match primary usage context |
| **Keyline shapes** | Circle / Square / Landscape / Portrait / Pentagon | Used to harmonize optical size across icons |

### Icon grid

All icons must sit on the grid — optical alignment, not metric:

```
24×24px grid example:
- Live area: 20×20px (2px margin on each side)
- Key shapes:
  - Circle: 20px diameter
  - Square: 18×18px
  - Landscape: 20×16px
  - Portrait: 16×20px
```

### Icon set specification

```markdown
## Icon Style — [Product Name]

- Grid: 24×24px
- Stroke: 1.5px, round cap, round join
- Corner radius: 2px on rectangles
- Keyline: circle-based
- Style: stroke only (no fill except for selected/active state)
- Selected state: filled version of the same icon shape
- Prohibited: gradient fills, drop shadows, mixed stroke widths in one icon
```

---

## Photography / Image Direction

### Brief template

```markdown
## Photography Direction — [Product Name]

### Mood
[e.g., "Candid and purposeful — professionals mid-task, not posed. Natural lighting."]

### Color treatment
- [ ] Natural / unfiltered
- [ ] Warm toned (increased temperature, amber shadows)
- [ ] Cool toned (blue-shifted)
- [ ] High contrast (increased clarity, deep blacks)
- [ ] Black and white
- [ ] Duotone with brand colors

### Composition rules
- [e.g., "Subject in the left third; leave space for text on the right"]
- [e.g., "Always show context — never isolated on white background"]
- [e.g., "Close-up product shots only; no wide environmental shots"]

### People (if applicable)
- Diversity: [explicit brief — skin tones, age range, gender, body type, ability]
- Looking at camera: [yes / no / occasionally]
- Expression: [neutral focus / natural smile / candid]
- What they are doing: [mid-task / using product / collaborating]
- What they are NOT doing: [posing / looking at camera / stock smile]

### What to avoid
- [e.g., "No office handshake photos"]
- [e.g., "No white background cutouts"]
- [e.g., "No images that could be read as endorsements by real people without consent"]
```

---

## Motion Language

Motion in UI communicates relationships and state — not decoration.

### Core principles

1. **Purpose** — motion should communicate something (state change, hierarchy, progress) — not just look nice
2. **Speed** — UI transitions 100-300ms; content transitions 300-600ms; celebration/delight 400-800ms
3. **Easing** — the most important parameter

### Easing reference

| Easing | Use for |
|--------|---------|
| `ease-out` | Elements entering the screen (decelerates to rest) |
| `ease-in` | Elements leaving the screen (accelerates away) |
| `ease-in-out` | Elements moving across the screen |
| `spring` (CSS: `linear()` or JS spring) | Delight moments, expanding panels, drag release |
| `linear` | Progress bars, loaders |

```css
/* Standard transitions */
.enter  { animation: slideIn 250ms cubic-bezier(0, 0, 0.2, 1); }   /* ease-out */
.exit   { animation: slideOut 200ms cubic-bezier(0.4, 0, 1, 1); }  /* ease-in */
.move   { transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1); } /* ease-in-out */
```

### Choreography

When multiple elements animate together, stagger them to create hierarchy:

```css
/* Each child starts 50ms after the previous */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
```

### `prefers-reduced-motion`

Always respect:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Cross-Touchpoint Consistency Audit

Before launch or a major rebrand, audit all touchpoints:

| Touchpoint | Visual | Voice | Color | Typography |
|------------|--------|-------|-------|-----------|
| Web (marketing) | — | — | — | — |
| Web app (product) | — | — | — | — |
| Email (transactional) | — | — | — | — |
| Email (marketing) | — | — | — | — |
| Social (organic) | — | — | — | — |
| Social (paid ads) | — | — | — | — |
| Docs / help center | — | — | — | — |
| Mobile app | — | — | — | — |

Rate each ✓ (consistent) / ~ (mostly consistent) / ✗ (off-brand). Fix ✗ items before launch.

---

## Checklist

- [ ] Visual language defined on 4 dimensions: form, line, texture, spatiality
- [ ] Illustration style brief written with style references, color palette, and character direction
- [ ] Icon style guide: grid, stroke width, corner radius, keyline shapes, selected state
- [ ] Photography brief: mood, color treatment, diversity, composition, prohibitions
- [ ] Motion language: easing for enter/exit/move, duration range, choreography rule
- [ ] `prefers-reduced-motion` respected in all animations
- [ ] Cross-touchpoint audit completed before launch
