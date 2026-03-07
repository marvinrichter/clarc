---
description: Develop a visual brand identity for a product — generates color palette (with WCAG validation), typeface pairings, brand voice, mood board direction, and a starter Brand Guidelines structure.
---

# Brand Identity

Develop a visual brand identity package for a product.

## Usage

```
/brand-identity "Clarc — workflow OS for Claude Code"
/brand-identity --name "Clarc" --audience "engineers" --personality "precise, minimal, powerful"
```

## Input

Collect the following before generating (ask if not provided in `$ARGUMENTS`):

1. **Product name** (required)
2. **One-sentence product description** (required)
3. **Target audience** (role, technical level, industry)
4. **Three personality words** that should describe the brand feeling (e.g., "precise, warm, direct")
5. **Three competitor or reference products** (for differentiation)
6. **Primary use context** — web app / mobile app / both / marketing site

## Output

Generate five sections:

---

### 1. Color Palette

Apply `visual-identity` skill: 4-layer palette with WCAG validation.

**Primary color** — derive from the personality words and differentiation:
- Provide: Hex, HSL, RGB
- Contrast check: ratio against white AND neutral-900 — must pass WCAG AA (4.5:1 for text)

**Secondary color(s)** (1-2):
- Provide: Hex, HSL
- Must harmonize (analogous, complementary, or triadic relationship to primary)

**Semantic colors** (success, warning, error, info):
- Standard values adjusted if primary color conflicts

**Neutral scale** (8 steps):
- Derived from primary hue with low saturation

Provide as CSS custom properties:

```css
:root {
  --color-primary-500: hsl(...);
  --color-primary-100: hsl(...);   /* light variant */
  --color-primary-900: hsl(...);   /* dark variant */
  /* ... */
}
```

---

### 2. Typography

Apply `typography-design` skill: pairing that matches the brand personality.

Provide:
- **Display font**: name, Google Fonts link, CSS `font-family`
- **Body font**: name, Google Fonts link, CSS `font-family`
- **Reasoning**: one sentence on why this pairing fits the personality words
- **Type scale** (5 levels minimum): size in rem + line-height

```css
:root {
  --font-display: '...', system-ui, sans-serif;
  --font-body: '...', system-ui, sans-serif;
  --text-4xl: 3.052rem; /* 48.83px */
  /* ... */
}
```

---

### 3. Brand Voice

Apply `visual-identity` skill brand voice section.

- **3-word personality** (confirm or refine from input)
- **Tonality scale**: rate 1-5 on Formal↔Casual, Serious↔Playful, Technical↔Accessible
- **Do list** (5 words or patterns to use)
- **Don't list** (5 words or patterns to avoid)
- **One before/after copy example**

---

### 4. Mood Board Direction

5 text descriptions (no images) of the visual aesthetic. Each is 1-3 sentences.

Apply `visual-identity` skill mood board structure:
1. Environment / setting
2. Color feeling
3. Texture / material
4. People (if any) or product-focused aesthetic
5. Typography / UI feel

---

### 5. Brand Guidelines Skeleton

Create `docs/brand-guidelines.md` as a structured skeleton with headers and placeholder notes. Include:

- Logo (placeholder — link to brief section)
- Color (all tokens from section 1 embedded)
- Typography (scale from section 2 embedded)
- Voice (from section 3 embedded)
- Imagery direction (from section 4)
- Prohibited uses (5 common violations to avoid)

## Reference Skills

- `visual-identity` — palette construction, WCAG validation, logo brief, mood board
- `typography-design` — typeface selection, pairing rules, modular scale
