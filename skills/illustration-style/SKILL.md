---
name: illustration-style
description: "Illustration style definition for digital products: style brief writing (flat, isometric, line art, 3D, abstract), consistency rules for multi-illustrator teams, SVG illustration techniques, color consistency across scenes, AI-assisted illustration prompting (Midjourney, DALL-E, Stable Diffusion), and illustration do/don't patterns. From defining a style to maintaining it at scale."
---

# Illustration Style Skill

## When to Activate

- Defining an illustration style for a new product (before any assets are created)
- Writing a brief for a freelance illustrator or agency
- Auditing existing illustrations for style consistency
- Creating SVG illustrations in code
- Using AI tools to generate illustration assets
- Deciding whether illustrations or icons serve a UI need better

---

## Illustration Style Categories

Choose one primary style before creating any assets.

| Style | Character | Best for | Complexity |
|-------|-----------|----------|-----------|
| **Flat 2D** | Bold shapes, no shadows, limited depth | SaaS, consumer apps, onboarding | Low |
| **Flat + soft shadows** | Flat forms with subtle shadow layers | Marketing, landing pages | Medium |
| **Line art** | Outline-only, no fills | Technical, minimal, developer tools | Low |
| **Semi-flat / skeuomorphic-light** | Slight gradients, gentle depth | Premium consumer, fintech | Medium |
| **Isometric** | 3D-looking, 2D projection | Infrastructure, data, engineering | High |
| **3D rendered** | True depth, lighting, render | Product showcase, premium marketing | Very high |
| **Abstract / geometric** | Shape-based, non-representational | Background art, texture, pattern | Variable |
| **Character-based** | People/animals as brand mascots | Community, consumer, education | High |

### Decision criteria

```
Developer / B2B tool   → Line art or flat 2D (clean, technical)
Consumer product       → Flat + soft shadows or character-based (approachable)
Infrastructure/DevOps  → Isometric (communicates complexity, systems thinking)
Premium/luxury         → 3D rendered or semi-flat (quality signals)
Abstract pattern       → Geometric (for backgrounds, not storytelling)
Brand mascot needed    → Character-based (requires consistent character sheet)
```

---

## Illustration Style Brief

Write this document before any illustrations are created. It defines the visual contract.

```markdown
## Illustration Style Brief — [Product Name]

### Overview
[1-2 sentences on what the illustrations will communicate about the brand]

### Style category
[Flat 2D | Flat + soft shadows | Line art | Isometric | 3D | Character-based | Abstract]

### Color palette
- Primary palette: [list hex/OKLCH values from brand guidelines]
- Illustration-specific tints: [lighter variants of brand colors for fills]
- Maximum colors per scene: [3 | 4 | 5]
- Background treatment: [solid fill | transparent | gradient]

### Form language
- Line weight: [none | 1px | 2px | 3px]
- Corner treatment: [sharp (0px) | slightly rounded (4px) | very rounded (8px+)]
- Shape complexity: [simple, max 4-6 distinct shapes per object | medium | complex]
- Depth: [flat | subtle shadow (2-3 layers) | full 3D]

### Human representation
- Include people: [yes | no | abstract only]
- Skin tones: [diverse — see palette below | single neutral | avoid representation]
- Skin tone palette: [list 4-6 inclusive tones if people included]
- Facial detail level: [full face | minimal (dots for eyes) | no faces]
- Gender/body diversity: [explicit requirement or note]

### Perspective
- Projection: [front-facing | 3/4 view | isometric | top-down]
- Eye level: [horizon at 1/3 | centered | varies per scene]

### Consistency rules (mandatory)
1. Every illustration uses the defined palette — no color outside it
2. Stroke weight is the same across all illustrations (if using line art)
3. Corner radius is the same for all shapes
4. Character proportions follow the character sheet (if character-based)
5. Minimum negative space: [N]% of the artboard must be empty

### Reference illustrations
1. [URL or description] — because [reason]
2. [URL or description] — because [reason]
3. [URL or description] — because [reason]

### Artboard specs
- Standard artboard: [800×600px | 1200×800px | custom]
- Viewbox: [artboard size]
- Export format: [SVG | PNG @2x | both]
- File naming: [kebab-case, e.g., empty-state-search.svg]

### What to avoid
- [e.g., "No photorealistic elements mixed with flat shapes"]
- [e.g., "No more than 2 characters per scene"]
- [e.g., "No text embedded in illustrations — text belongs in product UI"]
```

---

## SVG Illustration Techniques

### Structure template for flat illustrations

```svg
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">

  <!-- 1. Background layer -->
  <rect width="800" height="600" fill="#F0F4FF" />

  <!-- 2. Background shapes (decorative, low contrast) -->
  <circle cx="650" cy="100" r="200" fill="#E0E8FF" opacity="0.5" />

  <!-- 3. Mid-ground objects -->
  <g class="mid-ground">
    <!-- objects at medium scale -->
  </g>

  <!-- 4. Foreground subjects -->
  <g class="foreground">
    <!-- main illustration subjects -->
  </g>

  <!-- 5. Highlights and details (top layer) -->
  <g class="highlights" opacity="0.8">
    <!-- subtle light effects, sparkles, etc. -->
  </g>

</svg>
```

### Color consistency technique

Define colors as SVG variables or use a `<defs>` block:

```svg
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Reusable gradients -->
    <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>

    <!-- Reusable shapes (for character parts) -->
    <circle id="character-head" r="40" fill="#FBBF24" />
  </defs>

  <!-- Reference reusable elements -->
  <rect fill="url(#sky-gradient)" width="800" height="300" />
  <use href="#character-head" x="400" y="200" />
</svg>
```

### CSS class-based theming

For illustrations that must adapt to light/dark mode:

```svg
<svg class="illustration" viewBox="0 0 800 600">
  <rect class="illustration__background" width="800" height="600" />
  <circle class="illustration__accent" cx="400" cy="300" r="100" />
</svg>
```

```css
.illustration__background { fill: var(--surface-illustration, #F0F4FF); }
.illustration__accent     { fill: var(--color-brand-muted, #E0E8FF); }

[data-theme="dark"] {
  --surface-illustration: #1e2030;
  --color-brand-muted:    #2d3158;
}
```

---

## Character Consistency Sheet

If using characters, create a character sheet document before production.

```markdown
## Character Sheet — [Character Name]

### Proportions
- Head-to-body ratio: [1:3 | 1:4 | 1:5]
- Head width: [N]px at standard 400px character height
- Eye placement: [center | upper-third] of head
- Arm length: [N]% of body height

### Parts library
Every character is assembled from these parts:
- Heads: [N variations — neutral, happy, focused, surprised]
- Bodies: [standing, sitting, reaching, walking]
- Arms: [relaxed, raised, crossed, typing]
- Skin tones: [list 4-6 hex values]
- Clothing: [list color options from brand palette]
- Hair: [list colors and styles]

### Rules
1. Never mix proportions between character variants
2. Skin tone must be from the approved skin tone palette
3. Character always faces [left | right | can vary] at rest
4. Shadow (if used) always falls [left | right | below]
```

---

## AI-Assisted Illustration

### When to use AI illustration

```
Appropriate:
- Concept exploration / mood boarding
- Background textures and abstract patterns
- Generating reference for a human illustrator
- One-off marketing assets with low brand consistency requirement

NOT appropriate:
- Illustrations that must match existing hand-drawn style exactly
- Character-based illustrations (consistency nearly impossible)
- Illustrations that need SVG format (AI outputs raster)
- High-brand-stakes assets (product itself, website hero)
```

### Prompting for style consistency

Structure: `[style adjective] [medium] illustration of [subject], [color description], [mood], [technical spec]`

```
Flat vector illustration of a developer at a laptop, muted indigo and amber
color palette, clean minimal style, soft white background, no shadows,
simple geometric shapes, editorial illustration style

Isometric illustration of a cloud server infrastructure, dark blue and teal
color palette, precise clean lines, technical diagram style, no people,
no text labels

Line art illustration of a smartphone showing a dashboard UI, single color
outlines, indigo stroke on white background, minimal and elegant,
2px stroke weight
```

### Consistency across a set

To generate a consistent series:
1. Create a "seed" prompt that works well
2. Add `in the same style as [first image description]` to all subsequent prompts
3. Use `--seed [N]` in Midjourney to maintain style continuity
4. Use ControlNet in Stable Diffusion with a reference image for structural consistency

### Post-processing workflow

```
AI output (raster) → Remove background (remove.bg) →
Vectorize (Adobe Illustrator Trace / Vector Magic) →
Clean up in Figma/Illustrator →
Optimize with SVGO →
Add CSS variables for theme adaptation
```

---

## Illustration vs. Icon Decision

When to use an illustration vs. an icon:

| Use illustration when | Use icon when |
|----------------------|--------------|
| Empty states — explain what's missing | Action buttons, navigation |
| Onboarding — welcome / feature intro | Inline with text |
| Success states — celebrate completion | Status indicators |
| Error states — show what went wrong (with character) | Form validation |
| Marketing hero sections | Compact UI lists |
| Concept explanation (how it works) | Toolbar, tabs |

Anti-pattern: using illustrations in compact UI contexts (table rows, dropdown options, badges) — use icons instead.

---

## Checklist

- [ ] Style category chosen and documented in brief
- [ ] Color palette defined (max colors per scene specified)
- [ ] Form language defined: corner radius, stroke weight, depth approach
- [ ] Human representation guidelines defined (inclusive skin tones if people present)
- [ ] No text embedded in SVG illustrations
- [ ] CSS custom properties used for theme-adaptable colors
- [ ] Character sheet created if character-based style
- [ ] File naming follows kebab-case convention
- [ ] SVGs optimized (no bloat from Figma/AI exports)
- [ ] AI-generated assets post-processed and cleaned before production use
- [ ] Illustration vs. icon decision made deliberately (not mixed arbitrarily)
