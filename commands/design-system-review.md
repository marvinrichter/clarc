---
description: Full design system audit — CSS tokens, dark mode, icon system, accessibility, and design-code consistency. Invokes the design-system-reviewer agent.
---

# Design System Review

This command invokes the **design-system-reviewer** agent for a comprehensive design system audit.

## What This Command Does

1. **Token Audit** — Review CSS/design tokens (color, spacing, typography scale, border radii)
2. **Dark Mode Check** — Verify dark mode implementation: no hardcoded colors, correct token usage, contrast compliance
3. **Icon System Review** — Icon format, sizing, accessibility labels, naming conventions
4. **Accessibility Compliance** — WCAG 2.1 AA contrast ratios, focus indicators, motion reduction
5. **Design-Code Consistency** — Validate that Figma/design tokens match implemented code tokens
6. **Component Completeness** — Identify missing or inconsistent component variants

## When to Use

- Before a major UI release to catch design system regressions
- After migrating to a new design token system
- When onboarding a new designer and auditing existing consistency
- When dark mode coverage is incomplete or broken

## Usage

```
/design-system-review                  — full audit
/design-system-review tokens           — token structure only
/design-system-review dark-mode        — dark mode only
/design-system-review a11y             — accessibility only
```

For a narrower Storybook-only audit, use `/storybook-audit` instead.

## Review Dimensions

### CRITICAL
- Missing tokens for core semantics (primary, error, success, warning)
- WCAG AA contrast violations on interactive elements
- Hardcoded hex values bypassing the token system

### HIGH
- Dark mode tokens missing for components added since the last audit
- Focus ring removed or invisible
- Icon viewBox inconsistencies breaking scalability

### MEDIUM
- Inconsistent spacing increments (non-4px or non-8px grid)
- Token naming divergence between design file and code

## Related

- Agent: `agents/design-system-reviewer.md`
- Narrower scope: `/storybook-audit` (component stories only)
- Icon system creation: `/icon-system`
- Dark mode audit only: `/dark-mode-audit`

## After This

- `/dark-mode-audit` — deep-dive dark mode if tokens pass but implementation fails
- `/a11y-audit` — full accessibility audit if contrast issues are found
- `/code-review` — review token implementation in component files
- `/tdd` — add visual regression tests for critical design system states
