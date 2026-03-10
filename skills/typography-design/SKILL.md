---
name: typography-design
description: "Typography as a creative discipline: typeface selection criteria, type pairing (serif + sans, display + body), modular scale systems, line-height and tracking ratios, hierarchy construction, and web/mobile rendering considerations. The decisions behind design tokens, not the tokens themselves."
---

# Typography Design Skill

## When to Activate

- Choosing typefaces for a new product or brand
- Building a typographic scale (H1–body–caption)
- Critiquing readability or hierarchy problems
- Optimising for web and mobile rendering
- Defining letter-spacing and line-height ratios
- Evaluating a font pairing
- Selecting a modular scale ratio appropriate for the information density of a UI
- Diagnosing FOUT or FOIT issues and choosing the right `font-display` strategy for body vs. display fonts

---

## Typeface Selection Criteria

Evaluate every candidate font on five criteria before using it:

| Criterion | What to check |
|-----------|--------------|
| **Personality** | Does the tone match the brand? (geometric = technical, humanist = friendly, slab = authoritative) |
| **Rendering quality** | Does it look good at screen sizes (12-18px)? Test hinting at small sizes. |
| **Weight range** | Minimum 4 weights needed: Light/Regular/Medium/Bold. Variable font preferred. |
| **Character set** | Does it support all required languages (Latin Extended, Cyrillic, Arabic)? |
| **License** | Free for web use? Requires self-hosting? Commercial license required? |

### Classification overview

| Classification | Characteristics | Use for |
|---------------|----------------|---------|
| **Geometric sans** | Circle-based O, uniform stroke | Tech, modern, minimal |
| **Humanist sans** | Variable stroke, organic | UI text, long-form, accessibility |
| **Transitional serif** | High contrast, bracketed serifs | Premium, editorial |
| **Slab serif** | Low contrast, block serifs | Authoritative, data-heavy |
| **Display** | Decorative, expressive | Headlines only, large sizes |

---

## Typeface Pairing Rules

### The contrast rule

Display and body must be from different classifications:

```
WORKS:
Geometric sans (display) + Humanist sans (body)
→ Space Grotesk + Inter

Serif (display) + Sans (body)
→ Playfair Display + Source Sans 3

Slab serif (display) + Clean sans (body)
→ Zilla Slab + Roboto

DOES NOT WORK:
Geometric sans + Geometric sans (both Inter-style: boring)
Two serifs (competing, no hierarchy)
Two display fonts (chaotic)
```

### The harmony rule

Despite contrasting in classification, paired fonts should share proportions:

- Similar x-height (body height of lowercase letters)
- Compatible optical weight at the same px size
- Test by setting both at the same size — do they feel balanced?

### Anti-patterns

- **Both fonts are variable fonts of the same super-family** — no contrast (e.g., Roboto + Roboto Condensed)
- **Display font used for body text** — decorative fonts are illegible at small sizes
- **Three or more typefaces** — almost always wrong; two is the limit

---

## Modular Scale

A modular scale generates all text sizes from a base size and a ratio. It creates visual harmony — sizes feel related rather than arbitrary.

### Choosing a ratio

| Ratio | Name | Character |
|-------|------|-----------|
| 1.067 | Minor Second | Tight, minimal — good for data-dense UIs |
| 1.125 | Major Second | Subtle, professional |
| 1.200 | Minor Third | Balanced — good default |
| 1.250 | Major Third | Clear hierarchy |
| 1.333 | Perfect Fourth | Strong contrast — editorial |
| 1.500 | Perfect Fifth | Very bold — display-heavy |

### Calculating the scale (base 16px, ratio 1.25)

```
caption:    10.24px  (16 × 1.25⁻²)
small:      12.80px  (16 × 1.25⁻¹)
base:       16.00px  (16 × 1.25⁰)
large:      20.00px  (16 × 1.25¹)
h4:         25.00px  (16 × 1.25²)
h3:         31.25px  (16 × 1.25³)
h2:         39.06px  (16 × 1.25⁴)
h1:         48.83px  (16 × 1.25⁵)
display:    61.04px  (16 × 1.25⁶)
```

### CSS custom properties

```css
:root {
  --text-xs:   0.640rem;   /* 10.24px */
  --text-sm:   0.800rem;   /* 12.80px */
  --text-base: 1.000rem;   /* 16.00px */
  --text-lg:   1.250rem;   /* 20.00px */
  --text-xl:   1.563rem;   /* 25.00px */
  --text-2xl:  1.953rem;   /* 31.25px */
  --text-3xl:  2.441rem;   /* 39.06px */
  --text-4xl:  3.052rem;   /* 48.83px */
  --text-5xl:  3.815rem;   /* 61.04px */
}
```

---

## Spacing Ratios

### Line height

| Context | Line height | Why |
|---------|-------------|-----|
| Display / headlines | 1.1–1.2 | Tight — prevents gaps between lines at large sizes |
| Subheadings | 1.2–1.3 | — |
| Body text | 1.5–1.7 | Loose — aids readability at body sizes |
| Long-form (articles) | 1.6–1.8 | Maximum readability |
| UI labels, buttons | 1.0–1.2 | Single-line — no wrapping expected |

### Letter spacing (tracking)

| Context | Tracking | Why |
|---------|----------|-----|
| Headlines (32px+) | -0.02em to -0.04em | Tight — large letters feel too spaced at default |
| Body text | 0 (default) | Never adjust body letter spacing |
| ALL CAPS / small caps | +0.05em to +0.12em | All-caps needs extra air |
| UI labels (12-14px) | +0.01em | Tiny text benefits from extra tracking |

### Paragraph spacing

- Paragraph spacing = 0.75–1× the base line height
- Never use double line breaks for paragraph spacing in production — use `margin-bottom`
- Tighter paragraph spacing for UI; looser for editorial / article layouts

---

## Hierarchy Construction

### The three tools

Build hierarchy using these tools in priority order:

1. **Size** — most powerful; large type draws the eye first
2. **Weight** — second; bold vs. regular creates emphasis
3. **Color** — third; primary vs. secondary vs. disabled

Avoid using all three at once — it creates noise. One or two tools per level is enough.

### Anti-patterns

- **Too many sizes** — if more than 5 distinct text sizes exist in a single viewport, something is wrong
- **All bold** — when everything is emphasized, nothing is
- **Color only** — low-contrast secondary text on colored backgrounds fails WCAG

### H1–H6 specification template

```
H1 — 3.052rem / line-height 1.15 / weight 700 / tracking -0.02em
H2 — 2.441rem / line-height 1.20 / weight 700 / tracking -0.01em
H3 — 1.953rem / line-height 1.25 / weight 600 / tracking 0
H4 — 1.563rem / line-height 1.30 / weight 600 / tracking 0
Body large — 1.125rem / line-height 1.60 / weight 400
Body — 1.000rem / line-height 1.60 / weight 400
Body small — 0.875rem / line-height 1.50 / weight 400
Caption — 0.750rem / line-height 1.40 / weight 400 / tracking +0.01em
```

---

## Rendering Considerations

### Variable fonts

Use variable fonts where possible — one file covers all weights, reducing HTTP requests:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;   /* entire weight axis */
  font-display: swap;
}
```

### FOUT / FOIT strategy

- **FOUT** (Flash of Unstyled Text) — content visible immediately, swaps to web font
- **FOIT** (Flash of Invisible Text) — invisible until font loads

Use `font-display: swap` for body text (FOUT — content always readable).
Use `font-display: optional` for decorative display fonts (skip if load is slow).

### System font stack fallback

Define a fallback that matches the web font's character:

```css
/* For sans-serif web font */
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* For serif web font */
font-family: 'Playfair Display', ui-serif, Georgia, 'Times New Roman', serif;

/* Mono */
font-family: 'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
```

### iOS vs. Android rendering

- iOS renders fonts at 1× sharper than Android at the same CSS px
- Android at small sizes may need `+0.01em` letter spacing for clarity
- Test at 12-14px on a physical Android device — system font fallbacks look very different

---

## Checklist

- [ ] Typeface evaluated on: personality, rendering, weight range, character set, license
- [ ] Pairing contrasts in classification (not two geometric sans)
- [ ] Paired fonts share similar x-height
- [ ] Modular scale chosen with ratio appropriate to the UI density
- [ ] Line height: 1.5-1.7 for body, 1.1-1.2 for headlines
- [ ] Negative tracking on headlines (32px+); never on body
- [ ] Positive tracking on all-caps text
- [ ] Hierarchy uses at most 2 of the 3 tools per level (size, weight, color)
- [ ] Maximum 5 distinct text sizes in a single viewport
- [ ] Variable font used where available
- [ ] `font-display: swap` on body text fonts
- [ ] System font fallback stack defined for each web font
