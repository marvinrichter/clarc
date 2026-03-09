---
name: color-theory
description: "Color theory beyond palette generation: color harmony rules (complementary, analogous, triadic, split-complementary), color psychology by industry, dark mode color strategy (perceptual lightness, not inversion), simultaneous contrast, color blindness design patterns, and HSL/OKLCH color space decisions. The reasoning behind color choices, not just the output."
---

# Color Theory Skill

## When to Activate

- Explaining why a color combination feels off (harmony analysis)
- Designing a dark mode that doesn't look like a CSS `invert()` filter
- Choosing colors that communicate the right emotion for an industry
- Debugging color accessibility beyond basic contrast ratios
- Deciding between HSL, OKLCH, and other color spaces

---

## Color Harmony Systems

Harmony rules predict which colors feel intentional together vs. random.

### The color wheel

Based on hue (0–360°):
```
0°   Red
30°  Orange
60°  Yellow
90°  Yellow-green
120° Green
150° Blue-green
180° Cyan
210° Blue-cyan
240° Blue
270° Violet
300° Magenta
330° Rose
360° Red (same as 0°)
```

### Harmony rules

| Harmony | Formula | Character |
|---------|---------|-----------|
| **Monochromatic** | Same hue, vary lightness/saturation | Cohesive, calm, can feel flat |
| **Analogous** | 3 hues within 30-60° of each other | Natural, comfortable, low tension |
| **Complementary** | Hues 180° apart | High contrast, energetic, can vibrate |
| **Split-complementary** | Base + two hues 150° from base | Contrast without vibration |
| **Triadic** | 3 hues 120° apart | Vivid, balanced, complex |
| **Tetradic / Square** | 4 hues 90° apart | Rich palette, hard to balance |

### When to use each

```
SaaS / productivity tool   → Monochromatic (calm) + semantic accent colors
Marketing / landing page   → Split-complementary (energetic but controlled)
Brand identity             → Analogous (memorable cohesion) + 1 complementary accent
Data visualization         → Triadic or tetradic (maximum differentiation)
Emergency / health UI      → Complementary avoided — red+green is color-blind problematic
```

### The "60-30-10" distribution rule

```
60% — Dominant color (usually neutral)
30% — Secondary color (brand or supporting)
10% — Accent color (CTA, highlights, alerts)
```

Never flip this ratio. More than 10% accent creates visual noise.

---

## Color Psychology by Industry

Colors carry cultural weight. Use this as a starting point — always validate with your target audience.

| Color | Positive associations | Negative associations | Industry fit |
|-------|----------------------|----------------------|-------------|
| **Blue** | Trust, calm, competence | Cold, corporate, distance | Finance, healthcare, SaaS, B2B |
| **Green** | Growth, nature, success | Envy, naive | Fintech, sustainability, health |
| **Orange** | Energy, warmth, approachable | Cheap, aggressive | Consumer apps, food, e-commerce |
| **Red** | Urgency, passion, strength | Danger, debt, aggression | Sales CTAs, alerts, food |
| **Purple** | Luxury, creativity, wisdom | Pretentious, distant | Beauty, premium, creative tools |
| **Yellow** | Optimism, attention, warmth | Caution, cheap | Children, food, attention-seeking |
| **Black** | Sophistication, power, premium | Cold, inaccessible | Luxury, fashion, premium tech |
| **White** | Clean, minimal, honest | Empty, clinical | Healthcare, minimal design, Apple-influenced |

### Anti-patterns

- **Blue for everything** — overused in tech; differentiate deliberately
- **Green = only money** — also nature, health, sustainability; pick correctly
- **Red for brand color** — avoid if the product handles errors/alerts (brand red vs. error red conflict)

---

## Dark Mode Color Strategy

Dark mode is not `filter: invert(1)`. It requires a separate color system.

### The perceptual lightness problem

HSL lightness is not perceptual. A yellow at L50 looks much brighter than a blue at L50.

Use **OKLCH** (perceptually uniform) for dark mode tokens:

```css
/* Light mode */
:root {
  --surface-default:  oklch(98% 0.005 260);   /* near-white, slightly cool */
  --surface-raised:   oklch(96% 0.005 260);
  --surface-overlay:  oklch(93% 0.005 260);
  --text-primary:     oklch(18% 0.010 260);   /* near-black */
  --text-secondary:   oklch(42% 0.010 260);
  --text-disabled:    oklch(65% 0.005 260);
}

/* Dark mode */
[data-theme="dark"] {
  --surface-default:  oklch(14% 0.010 260);   /* NOT black — dark indigo-tinted */
  --surface-raised:   oklch(18% 0.010 260);   /* slightly lighter = "raised" */
  --surface-overlay:  oklch(22% 0.010 260);
  --text-primary:     oklch(92% 0.005 260);   /* NOT white — slightly warm */
  --text-secondary:   oklch(65% 0.005 260);
  --text-disabled:    oklch(40% 0.005 260);
}
```

### Dark mode: what changes vs. what stays

| Element | Light → Dark strategy |
|---------|----------------------|
| **Surfaces** | Light grey → Dark grey (not black) |
| **Text** | Dark grey → Light grey (not white) |
| **Brand/accent color** | Often stays same hue, reduce saturation slightly |
| **Semantic colors** | Success/warning/error lighten 15-20% (need contrast on dark bg) |
| **Shadows** | Reduce opacity or replace with elevation via color (lighter surface = higher elevation) |
| **Borders** | Often removed on dark (use surface color contrast instead) |

### Elevation in dark mode

```
Light mode: elevation = shadow depth
Dark mode:  elevation = surface lightness (higher = lighter)

--surface-level-0: oklch(14% 0.010 260)   /* base */
--surface-level-1: oklch(18% 0.010 260)   /* cards */
--surface-level-2: oklch(22% 0.010 260)   /* floating panels */
--surface-level-3: oklch(26% 0.010 260)   /* modals */
--surface-level-4: oklch(30% 0.010 260)   /* tooltips */
```

### Common dark mode mistakes

```
WRONG: background: #000000  →  Harsh, unnatural
RIGHT: background: ~#0f1117  →  Slightly off-black

WRONG: color: #ffffff        →  Harsh against dark bg
RIGHT: color: #e8eaf0        →  Warm off-white

WRONG: Same saturation as light mode  →  Neon, glaring
RIGHT: Desaturate brand color 10-15% in dark mode
```

---

## Simultaneous Contrast

Colors look different depending on what surrounds them. This affects UI decisions.

### The phenomenon

The same grey looks lighter on dark background and darker on light background:
```
[light grey on black] looks almost white
[light grey on white] looks almost mid-grey
```

### Practical impact

- A button color that looks neutral on white may look aggressive on dark surfaces
- Never finalize color decisions in isolation — always test against actual backgrounds
- Brand colors need separate light/dark mode values, not just inherited contrast

### Chromatic adaptation

The eye adapts to the ambient light color. In dark mode, slightly warm neutrals (hue ~250-280) feel neutral. Pure grey (hue 0) looks cold and clinical in dark mode.

---

## Color Blindness Design

~8% of males have color vision deficiency. Do not rely on color alone.

### Types and prevalence

| Type | Description | Prevalence (males) |
|------|-------------|-------------------|
| Deuteranopia | Cannot distinguish red/green | 5% |
| Protanopia | Red appears dark/black | 2.5% |
| Tritanopia | Cannot distinguish blue/yellow | 0.003% |
| Achromatopsia | No color perception | 0.003% |

### Design rules

1. **Never use red+green as the only distinguisher** (success vs. error)
   ```
   WRONG: green check vs. red X — looks identical to deuteranopes
   RIGHT: green check vs. red X + different shapes + label text
   ```

2. **Add a secondary cue**: icon, pattern, label, or position

3. **Test with simulation tools**:
   - Figma: Accessibility plugin → Color Blind mode
   - Browser: Chrome DevTools → Rendering → Emulate vision deficiency
   - Stark (Figma plugin)

4. **Use colorblind-safe palettes for data visualization**:
   ```
   Okabe-Ito palette (colorblind safe):
   #E69F00  Orange
   #56B4E9  Sky Blue
   #009E73  Bluish Green
   #F0E442  Yellow
   #0072B2  Blue
   #D55E00  Vermillion
   #CC79A7  Reddish Purple
   #000000  Black
   ```

---

## Color Space Decisions

### HSL vs. HSLuv vs. OKLCH

| Space | Pros | Cons | Use for |
|-------|------|------|---------|
| **HSL** | Simple, widely understood | Not perceptually uniform | Quick palette building, compatibility |
| **HSLuv** | Perceptually uniform lightness | Less browser support | Design tools, color scales |
| **OKLCH** | Best perceptual uniformity, CSS native | Learning curve | Production design tokens (modern browsers) |
| **sRGB (Hex)** | Universal compatibility | No meaningful mental model | Final output only |

### OKLCH in CSS

```css
/* Format: oklch(lightness% chroma hue) */
oklch(75% 0.15 160)   /* green-ish */
oklch(55% 0.25 30)    /* warm orange */
oklch(40% 0.18 270)   /* violet */

/* Compared to HSL, OKLCH ensures:
   oklch(75% 0.15 160) and oklch(75% 0.15 30)
   have the same PERCEIVED lightness — HSL does not guarantee this */
```

### When to use each in practice

```
Token definition:   OKLCH (perceptual precision)
Figma work:         HSL (tool compatibility)
Code output:        oklch() with fallback hex
Tailwind config:    oklch() via CSS custom properties
```

---

## Checklist

- [ ] Color harmony rule chosen and justified (not just "looks nice")
- [ ] 60-30-10 distribution applied (dominant, secondary, accent)
- [ ] Brand color hue checked against industry psychology
- [ ] Brand color doesn't conflict with semantic colors (error red, success green)
- [ ] Dark mode uses separate color system — not CSS `invert` or simple negation
- [ ] Dark mode surfaces are dark grey, not black; text is off-white, not white
- [ ] Elevation in dark mode uses surface lightness, not shadow only
- [ ] Simultaneous contrast tested: colors checked on both light and dark backgrounds
- [ ] No red+green-only differentiation — secondary cue (icon, label, shape) added
- [ ] Data visualization palette is colorblind-safe
- [ ] Colorblind simulation run in Figma or DevTools
- [ ] OKLCH used for token definitions where precision matters
