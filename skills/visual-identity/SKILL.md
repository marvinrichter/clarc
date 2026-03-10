---
name: visual-identity
description: "Brand identity development: color palette construction (primary/secondary/semantic/neutral), logo concept brief writing, typeface pairings, brand voice definition, mood board direction, and Brand Guidelines document structure. Use when establishing or evolving a visual brand — not for implementing existing tokens."
---

# Visual Identity Skill

## When to Activate

- Creating a visual identity for a new product, company, or project
- Rebranding an existing product
- Defining the design system foundation before token implementation
- Writing a brief for a designer or design agency
- Reviewing brand consistency across touchpoints
- Constructing an HSL-based color palette with WCAG AA contrast compliance for all text and UI controls
- Defining a brand voice document (3-word personality, Do/Don't word lists, tonality scale) before copy is written

---

## Color Palette Construction

A complete palette has four layers:

```
1. Primary     — 1 brand color (your most distinctive color)
2. Secondary   — 1-2 complementary colors
3. Semantic    — success, warning, error, info
4. Neutral     — 6-8 steps from near-white to near-black
```

### Generating the palette

Start from HSL, not hex — it gives control over lightness and saturation independently.

```
Primary example: HSL(250, 80%, 50%) — vivid indigo
  Light variant: HSL(250, 80%, 90%) — for backgrounds
  Dark variant:  HSL(250, 80%, 30%) — for hover states
```

### WCAG contrast check (mandatory)

Every color used for text or UI controls must pass WCAG AA:

| Use | Minimum contrast ratio |
|-----|------------------------|
| Normal text (body) | 4.5:1 against background |
| Large text (24px+) | 3:1 against background |
| UI components, focus indicators | 3:1 against adjacent color |

Tools: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/), Figma's built-in contrast plugin.

### Semantic colors (language-agnostic defaults)

```css
--color-success: hsl(142, 71%, 45%);  /* green — passes on white */
--color-warning: hsl(45, 93%, 47%);   /* amber — use dark text on top */
--color-error:   hsl(0, 84%, 60%);    /* red */
--color-info:    hsl(217, 91%, 60%);  /* blue */
```

Semantic colors must be distinct from the primary color — avoid blue-primary + blue-info conflicts.

### Neutral scale (8-step)

```
neutral-50:  hsl(220, 20%, 97%)   — page background
neutral-100: hsl(220, 16%, 94%)   — card background
neutral-200: hsl(220, 13%, 88%)   — divider
neutral-300: hsl(220, 11%, 76%)   — disabled border
neutral-400: hsl(220,  9%, 60%)   — placeholder text
neutral-500: hsl(220,  9%, 45%)   — secondary text
neutral-700: hsl(220, 12%, 28%)   — primary text
neutral-900: hsl(220, 16%, 12%)   — headings
```

---

## Logo Concept Brief

Do not generate the logo — write a brief for a human designer. A good brief eliminates 90% of revision cycles.

### Required sections

```markdown
## Logo Concept Brief — [Product Name]

### Brand in three words
[Word 1], [Word 2], [Word 3]
(These words define the feeling — not describe the product)

### What this logo must communicate
[1-2 sentences on the emotional impression it should leave]

### Form direction
- Shape family: Geometric | Humanist | Abstract | Lettermark | Wordmark
- Complexity: Simple (1-2 elements) | Medium | Complex mark
- Style: Modern / Minimal | Bold / Confident | Friendly / Approachable | Technical / Precise

### Reference logos (5 examples)
1. [Logo name] — because [one reason it relates]
2. ...
(Use logos from non-competing industries to avoid direct imitation)

### What to avoid
- [Specific form or motif to exclude]
- [Color to avoid]
- [Style cliché to avoid — e.g., "no speech bubbles", "no infinity symbols"]

### Primary medium
Digital UI (app icon, web) | Print | Both
(App icons need simpler shapes than print logos)

### Deliverables requested
- SVG wordmark (full color)
- SVG icon mark (standalone)
- Dark/light variants
- Minimum size usable: [N]px
```

---

## Typeface Pairing

A pairing consists of:
1. **Display / Heading** — for headlines, large text
2. **Body** — for paragraphs, UI text

### Pairing rule

Display and Body must contrast in classification:

| Display classification | Body classification |
|------------------------|-------------------|
| Serif | Sans-serif |
| Display sans (geometric) | Humanist sans |
| Slab serif | Clean sans |

Same classification (both Serif, both Geometric) → no contrast → visual monotony.

### Google Fonts recommendations

| Pairing | Display | Body | Character |
|---------|---------|------|-----------|
| Classic tech | Space Grotesk | Inter | Clean, neutral |
| Premium | Playfair Display | Source Sans 3 | Elegant, readable |
| Friendly | Nunito | Open Sans | Rounded, approachable |
| Bold | Bebas Neue | Roboto | Impactful, modern |

### CSS custom properties snippet

```css
:root {
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
}
```

---

## Brand Voice

### The 3-word personality

Distill the brand into exactly three adjectives that feel in tension but coherent:

```
Examples:
"Precise, Warm, Direct"  (not contradictory — precise data, warm tone, no fluff)
"Bold, Honest, Playful"  (ambitious but transparent, doesn't take itself too seriously)
```

### Do/Don't word lists

```markdown
## Voice

**Do use:**
- Clear, active verbs: build, ship, measure, improve
- Specific over vague: "47ms latency" not "faster"
- Second person: "you" not "the user" or "developers"
- Questions to engage: "What slows your team down?"
- Concrete benefits: "Save 3 hours a week"

**Avoid:**
- Jargon without context
- Passive voice: "can be configured by" → "you configure"
- Superlatives: "best", "revolutionary", "game-changing"
- Hedging: "might", "could possibly", "in some cases"
- Corporate-speak: "leverage", "synergy", "robust solution"
```

### Tonality scale

Rate the brand 1-5 on each axis:

```
Formal       1 — 2 — 3 — 4 — 5    Casual
Serious      1 — 2 — 3 — 4 — 5    Playful
Technical    1 — 2 — 3 — 4 — 5    Accessible
Confident    1 — 2 — 3 — 4 — 5    Humble
```

This tells writers how to calibrate any piece of copy.

---

## Mood Board Direction

Five image descriptions that define the visual aesthetic — no real images, just text briefs:

```markdown
## Mood Board Direction

1. **Environment**: [e.g., "A developer's desk at dusk — ambient dark, focused light pool from monitor. Clean, purposeful, no clutter. Warm tungsten vs. cool screen."]

2. **Color feeling**: [e.g., "Deep indigo backgrounds with electric accent strokes. High contrast. Feels like late-night precision work."]

3. **Texture/material**: [e.g., "Matte surfaces, no gloss. Slight grain texture in backgrounds. Reminiscent of brushed metal or raw concrete — honest materials."]

4. **People**: [e.g., "Focused individuals mid-task. Not posing. Candid, documentary style. Diverse in background and age. Never smiling at camera."]

5. **Product/UI**: [e.g., "Minimal, dark UI. Code and data visible. Terminal aesthetic. No gradients. Precision typography. Feels like a professional instrument."]
```

---

## Brand Guidelines Structure

When creating a brand guidelines document (`docs/brand-guidelines.md`):

```markdown
# [Product] Brand Guidelines

## 1. Brand Foundation
   - Mission statement
   - Brand promise (one sentence)
   - Target audience

## 2. Logo
   - Primary usage (full color)
   - Reversed (on dark)
   - Minimum size
   - Clear space rules
   - Prohibited uses (distortion, recolor, drop shadow)

## 3. Color
   - Primary palette (Hex, RGB, HSL, CMYK)
   - Secondary palette
   - Semantic colors
   - Neutral scale
   - Usage examples (text on background contrast ratios)

## 4. Typography
   - Typeface names and download/license links
   - Heading scale (H1-H6 sizes)
   - Body text specification
   - Code/mono font
   - Fallback stack

## 5. Imagery
   - Photography style
   - Illustration style (if applicable)
   - Icon style
   - Image prohibited uses

## 6. Voice & Tone
   - 3-word personality
   - Tonality scale
   - Do/Don't word lists
   - Writing examples (before/after rewrites)

## 7. Application Examples
   - Website header
   - Email signature
   - Social media card
   - App icon

## 8. Prohibited Uses
   - Visual dos and don'ts in one page
```

---

## Checklist

- [ ] Color palette has all four layers: primary, secondary, semantic, neutral
- [ ] Primary color passes WCAG AA (4.5:1) on intended background
- [ ] Semantic colors are distinct from primary (no blue-info on blue-primary brand)
- [ ] Logo brief written (not the logo itself): 3-word personality, form direction, 5 references, what to avoid
- [ ] Typeface pairing contrasts in classification (not both serif, not both geometric)
- [ ] Fallback font stack defined
- [ ] Brand voice: 3-word personality, Do/Don't word lists, tonality scale
- [ ] Mood board: 5 text-description image directions
- [ ] Brand Guidelines document structure created
