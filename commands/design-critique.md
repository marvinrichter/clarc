---
description: Get structured design critique for a visual design — from a screenshot path, URL description, or code. Invokes the design-critic agent.
---

# Design Critique

Get a structured critique of a visual design.

## Usage

```
/design-critique screenshots/dashboard.png
/design-critique "the checkout flow on /checkout — 3-step wizard"
/design-critique src/components/HeroSection.tsx
```

## What This Command Does

1. Reads the design from `$ARGUMENTS`:
   - **Image file path** — reads the screenshot visually
   - **URL or page description** — reviews based on the description
   - **Code file** — reads HTML/CSS/TSX and reasons about the visual output

2. Collects context (ask if not provided):
   - What is this screen / component?
   - Does it belong to an existing brand system?
   - Any specific problem the user suspects?

3. Invokes the **design-critic agent** with the design + context

4. Outputs critique on six dimensions:
   - Composition & layout (grid, alignment, whitespace, focal point)
   - Visual hierarchy (primary element, hierarchy levels, competing elements)
   - Typography (pairing, line-height, size range, tracking)
   - Color (WCAG contrast, palette size, color-blind risk, semantic consistency)
   - Brand coherence (consistency with design system, icon style, copy tone)
   - Accessibility (touch targets, focus indicators, color-only encoding)

5. Ends with a **priority list** of top issues with specific fix suggestions

## Reference Skills

- `layout-composition` — grid, Gestalt, whitespace, focal point
- `typography-design` — typeface pairing, scale, spacing
- `visual-identity` — color palette, WCAG contrast, brand voice
- `creative-direction` — icon consistency, motion, cross-touchpoint coherence

## After This

- `/wireframe` — revise the wireframe based on critique feedback
- `/brand-identity` — develop brand guidelines if visual identity gaps found
