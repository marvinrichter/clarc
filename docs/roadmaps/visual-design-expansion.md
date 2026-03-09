# Visual Design Expansion Roadmap

**Status:** ✅ Completed
**Date:** 2026-03-09
**Motivation:** Visual design was heavily underrepresented in clarc — existing coverage was technically-biased (tokens, CSS, Storybook) with no skills for core design disciplines like color theory, iconography, illustration, marketing assets, or AI-assisted design.

---

## Gap Analysis

### Before this roadmap

| Category | Skills | Commands | Agents |
|----------|--------|----------|--------|
| Brand & Identity | `visual-identity`, `typography-design` | `/brand-identity` | — |
| Design System | `design-system`, `figma-to-code`, `css-architecture` | `/storybook-audit` | — |
| Visual Testing | `visual-testing` | `/visual-test`, `/chart-review` | — |
| Accessibility | `accessibility`, `accessibility-patterns` | `/a11y-audit` | — |
| Motion | `motion-animation` | — | — |
| UX Patterns | `ux-micro-patterns`, `dashboard-design`, `data-visualization` | — | — |
| Presentations | `presentation-design` | `/slide-deck`, `/talk-outline` | `presentation-designer`, `talk-coach` |
| Reviews | — | `/design-critique` | `design-critic` |

**Missing entirely:** Icon systems, color theory, illustration, design ops, marketing design, wireframing, AI-assisted design.

### After this roadmap

All gaps filled. See complete inventory below.

---

## Delivered: New Skills (7)

| Skill | Description | File |
|-------|-------------|------|
| `icon-system` | SVG icon libraries, tokens, SVGO, sprite sheets, accessibility, naming | [skills/icon-system/SKILL.md](../../skills/icon-system/SKILL.md) |
| `color-theory` | Harmony rules, color psychology, dark mode strategy (perceptual), colorblind patterns, OKLCH | [skills/color-theory/SKILL.md](../../skills/color-theory/SKILL.md) |
| `illustration-style` | Style brief writing, SVG techniques, character sheets, AI-assisted illustration, post-processing | [skills/illustration-style/SKILL.md](../../skills/illustration-style/SKILL.md) |
| `design-ops` | Figma organization, token sync pipeline, handoff workflow, design QA, component audit, governance | [skills/design-ops/SKILL.md](../../skills/design-ops/SKILL.md) |
| `marketing-design` | OG image code, social card specs, HTML email templates, Outlook compat, social media dimensions, print PDF | [skills/marketing-design/SKILL.md](../../skills/marketing-design/SKILL.md) |
| `wireframing` | Fidelity levels, ASCII wireframes, user flow diagrams, IA mapping, annotation standards, handoff | [skills/wireframing/SKILL.md](../../skills/wireframing/SKILL.md) |
| `generative-ai-design` | Midjourney/DALL-E/Flux prompting, style consistency, post-processing, legal/licensing | [skills/generative-ai-design/SKILL.md](../../skills/generative-ai-design/SKILL.md) |

## Delivered: New Agent (1)

| Agent | Description | File |
|-------|-------------|------|
| `design-system-reviewer` | Comprehensive design system audit — token structure, dark mode, icon system, accessibility, design-code consistency, component completeness. Produces scored report with prioritized findings. | [agents/design-system-reviewer.md](../../agents/design-system-reviewer.md) |

## Delivered: New Commands (3)

| Command | Description | File |
|---------|-------------|------|
| `/icon-system` | Library recommendation, token definitions, component template, naming convention, accessibility rules, audit mode | [commands/icon-system.md](../../commands/icon-system.md) |
| `/wireframe` | ASCII wireframes, user flow diagrams, IA maps, structural audits | [commands/wireframe.md](../../commands/wireframe.md) |
| `/dark-mode-audit` | Color strategy audit, elevation system, contrast analysis, common mistakes scan, token naming review | [commands/dark-mode-audit.md](../../commands/dark-mode-audit.md) |

---

## Complete Visual Design Coverage (Post-Roadmap)

### Skills

| Skill | Category |
|-------|----------|
| `visual-identity` | Brand |
| `typography-design` | Brand |
| `color-theory` | Brand *(new)* |
| `illustration-style` | Brand *(new)* |
| `icon-system` | Brand *(new)* |
| `design-system` | Design System |
| `figma-to-code` | Design System |
| `css-architecture` | Design System |
| `design-ops` | Design System *(new)* |
| `wireframing` | UX Process *(new)* |
| `ux-micro-patterns` | UX Patterns |
| `dashboard-design` | UX Patterns |
| `motion-animation` | UX Patterns |
| `data-visualization` | Data |
| `accessibility` | Accessibility |
| `accessibility-patterns` | Accessibility |
| `marketing-design` | Marketing *(new)* |
| `generative-ai-design` | AI Tools *(new)* |
| `visual-testing` | QA |
| `presentation-design` | Presentations |
| `liquid-glass-design` | Platform (iOS) |

### Commands

| Command | Category |
|---------|----------|
| `/brand-identity` | Brand |
| `/icon-system` | Brand *(new)* |
| `/design-critique` | Review |
| `/dark-mode-audit` | Review *(new)* |
| `/wireframe` | UX Process *(new)* |
| `/a11y-audit` | Accessibility |
| `/chart-review` | Data |
| `/visual-test` | QA |
| `/storybook-audit` | QA |
| `/slide-deck` | Presentations |
| `/talk-outline` | Presentations |
| `/frontend-arch-review` | Architecture |

### Agents

| Agent | Role |
|-------|------|
| `design-critic` | Visual design review (screenshots, wireframes, code) |
| `design-system-reviewer` | Full design system audit — tokens, dark mode, icons, a11y, consistency *(new)* |
| `presentation-designer` | Slide deck creation and structure |
| `talk-coach` | Talk and presentation review |

---

## Prioritization Rationale

| Priority | Item | Reason |
|----------|------|--------|
| P1 | `icon-system` | Every UI project needs icons; high-frequency gap |
| P1 | `color-theory` | Foundation for all color decisions; existing `visual-identity` was shallow |
| P1 | `dark-mode-audit` | Dark mode is now a baseline expectation; common implementation errors |
| P2 | `design-ops` | Directly bridges design ↔ engineering workflow |
| P2 | `wireframing` | Needed before writing any UI code; especially valuable for developers |
| P2 | `illustration-style` | Fills gap in brand assets workflow |
| P3 | `marketing-design` | Covers OG images and email — developer-facing |
| P3 | `generative-ai-design` | Growing need; AI tools becoming standard in design workflow |

---

## What Was Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Print design (detailed) | Too niche for most clarc users; basics covered in `marketing-design` |
| User research / usability testing | Separate discipline; out of scope for design visual skill set |
| Video / motion graphics | Highly specialized; not a clarc target use case |
| 3D design (Blender, Cinema 4D) | Too far from code-adjacent design workflow |
| Logo creation itself | AI cannot reliably create logos; brief-writing in `visual-identity` is the right scope |

---

## Future Opportunities

If visual design coverage is expanded further:

- `user-research` — usability testing, heatmaps, interview synthesis
- `design-tokens-advanced` — DTCG format, multi-brand token theming, dark + high-contrast + compact modes
- `email-design-advanced` — MJML, React Email, transactional email design systems
- `video-design` — short-form social video, motion templates
