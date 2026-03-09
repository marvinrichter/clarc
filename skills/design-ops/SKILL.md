---
name: design-ops
description: "Design Operations: Figma file organization standards, design-to-dev handoff workflow, design QA checklist, design token sync pipeline (Figma Variables → Style Dictionary → CSS/Tailwind), design system versioning and governance, component audit methodology, and design-dev collaboration patterns. Bridges the gap between design tools and production code."
---

# Design Ops Skill

## When to Activate

- Figma files are chaotic (no naming convention, no organization)
- Handoff from design to engineering is slow or error-prone
- Design tokens are maintained manually in two places (Figma + code)
- Multiple designers working on the same component inconsistently
- Need to establish a design system governance process
- Auditing whether UI matches the design spec

---

## Figma File Organization

### File structure standard

```
Organization structure:
└── [Team] Workspace
    ├── 🎨 Brand & Foundations
    │   ├── Color Styles
    │   ├── Typography Styles
    │   ├── Spacing & Grid
    │   └── Icons
    ├── 🧩 Component Library
    │   ├── Primitives (Button, Input, Badge…)
    │   ├── Composites (SearchBar, UserCard…)
    │   └── Patterns (DataTable, PageHeader…)
    ├── 📱 [Product] Designs
    │   ├── [Feature] — Active
    │   ├── [Feature] — Review
    │   └── Archive
    └── 🔬 Exploration / Scratch
        └── (personal workspace, not canonical)
```

### Page naming within a file

```
Pages:
├── Cover          — Thumbnail, last updated date, status
├── 🎯 [Feature] v2  — Current working design (version in name)
├── 🔍 Specs        — Redline specs, measurements, behavior notes
├── ↩️ Archive       — Previous versions (do not delete — reference history)
└── 🧪 Exploration  — Experiments (not for handoff)
```

### Layer naming convention

```
Rules:
- Use descriptive names, not "Frame 12" or "Group"
- Format: [component] / [variant] / [state]
- Examples:
    Button / Primary / Default
    Button / Primary / Hover
    Card / Compact / With Image
    Navigation / Mobile / Open

Sections:
- Group related layers in frames with clear names
- Capitalize section names: "Hero Section", "Feature Grid"

Icons:
- Name: icon / [name]   (e.g., icon / arrow-right)
```

---

## Design Token Sync Pipeline

Tokens defined in Figma should not be manually re-typed in code.

### Tool chain

```
Figma Variables → Tokens Studio plugin → tokens.json → Style Dictionary → CSS/JS/Tailwind
```

### Step 1: Figma Variables setup

Organize Figma Variables into collections:
```
Collections:
├── Primitives   — raw values (color, spacing, radius)
├── Semantic     — named by purpose (color-brand-primary, spacing-component)
└── Component    — component-specific (button-padding, card-radius)
```

### Step 2: Tokens Studio export (`tokens.json`)

```json
{
  "color": {
    "brand": {
      "primary": { "value": "oklch(55% 0.20 270)", "type": "color" },
      "muted":   { "value": "oklch(80% 0.08 270)", "type": "color" }
    },
    "semantic": {
      "success": { "value": "oklch(60% 0.18 142)", "type": "color" },
      "error":   { "value": "oklch(55% 0.22 15)",  "type": "color" }
    }
  },
  "spacing": {
    "xs": { "value": "4",  "type": "spacing" },
    "sm": { "value": "8",  "type": "spacing" },
    "md": { "value": "16", "type": "spacing" },
    "lg": { "value": "24", "type": "spacing" },
    "xl": { "value": "40", "type": "spacing" }
  }
}
```

### Step 3: Style Dictionary config (`sd.config.js`)

```js
module.exports = {
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'clarc',
      buildPath: 'src/styles/tokens/',
      files: [{ destination: 'tokens.css', format: 'css/variables' }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'src/tokens/',
      files: [{ destination: 'tokens.js', format: 'javascript/es6' }],
    },
    tailwind: {
      transformGroup: 'js',
      buildPath: 'src/tokens/',
      files: [{ destination: 'tailwind-tokens.js', format: 'javascript/es6' }],
    },
  },
};
```

### Step 4: CI automation

```yaml
# .github/workflows/sync-tokens.yml
name: Sync Design Tokens
on:
  push:
    paths: ['tokens.json']
jobs:
  build-tokens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx style-dictionary build
      - run: |
          git config user.email "bot@example.com"
          git config user.name "Token Bot"
          git add src/styles/tokens/ src/tokens/
          git diff --staged --quiet || git commit -m "chore: sync design tokens from Figma"
          git push
```

---

## Handoff Workflow

### Design → Engineering handoff checklist

Before marking a design as "Ready for Dev":

**Completeness**
- [ ] All states designed: default, hover, focus, active, disabled, loading, error, empty
- [ ] All breakpoints designed: mobile (375px), tablet (768px), desktop (1280px)
- [ ] Edge cases designed: long text overflow, no data state, max items state

**Specs**
- [ ] Spacing values use design tokens (not ad hoc values)
- [ ] Colors reference design tokens (not hardcoded hex)
- [ ] Typography references text styles
- [ ] Interactive states have hover/focus/active specs
- [ ] Animation: timing, easing, duration specified for any transitions

**Assets**
- [ ] Icons are components from the icon library (not custom shapes)
- [ ] Images are placeholder-safe (design works without real images)
- [ ] SVG illustrations are exported and handed over

**Developer notes**
- [ ] Component behavior notes (which fields are editable, which are static)
- [ ] API data mapping noted where relevant
- [ ] Known constraints or implementation notes in comments

### Handoff format

Use Figma's Dev Mode or include a dedicated "Specs" page:

```
Specs page structure:
├── 1. Component overview (name, variants, states)
├── 2. Anatomy (labeled parts)
├── 3. Spacing diagram (padding, margin, gap values)
├── 4. Behavior (interaction specs, transitions)
├── 5. Accessibility notes (keyboard, ARIA, contrast)
└── 6. Do / Don't examples
```

---

## Design QA Process

After engineering implements a design, run a QA review.

### Visual QA checklist

```
Spacing:
- [ ] Padding matches spec (use browser DevTools ruler)
- [ ] Component gap matches spec
- [ ] Section margin matches spec

Typography:
- [ ] Font size matches (zoom browser to 100% before checking)
- [ ] Line height matches
- [ ] Font weight matches
- [ ] Letter spacing matches

Color:
- [ ] Background color matches
- [ ] Text color matches
- [ ] Border color and width match
- [ ] Interactive states (hover, focus) match

Layout:
- [ ] Breakpoint behavior matches (check 375, 768, 1280, 1440)
- [ ] Overflow behavior handled (test with long text)
- [ ] Empty state matches design

Animation:
- [ ] Transition timing matches
- [ ] Easing matches
```

### QA severity levels

```
P0 — Blocking: Wrong component rendered, broken layout, missing content
P1 — Major:    Color, spacing, or typography obviously wrong (>4px off)
P2 — Minor:    Subtle spacing (1-2px), minor color variance within WCAG
P3 — Polish:   Animation timing slightly off, micro-interaction missing
```

---

## Component Audit Methodology

Use when auditing an existing UI for design system compliance.

### Audit steps

1. **Inventory** — Capture all unique UI patterns (screenshot every component variant)
2. **Categorize** — Group by function (buttons, inputs, cards, navigation, etc.)
3. **Score each** — For each category:
   - Token compliance: are design tokens used? (0-5 scale)
   - Consistency: do all instances match? (0-5 scale)
   - Accessibility: does it meet WCAG AA? (pass/fail)
4. **Prioritize** — Fix by frequency of use × severity of deviation
5. **Document** — Create canonical versions of all components in Figma
6. **Deprecation plan** — Timeline and migration path for non-compliant variants

### Audit output format

```markdown
## Component Audit — [Date]

### Summary
- Components audited: N
- Token-compliant: N (X%)
- Consistent across uses: N (X%)
- WCAG passing: N (X%)

### Critical findings
| Component | Issue | Instances | Severity |
|-----------|-------|-----------|----------|
| Button | 3 different border-radius values | 47 | P1 |
| Input | Hardcoded color #3B82F6 (not token) | 23 | P1 |

### Recommended actions
1. [Action with owner and timeline]
```

---

## Design System Governance

### Contribution model

```
Tier 1 — Core team only
  Primitive components (Button, Input, Modal)
  Design tokens
  Typography system

Tier 2 — With core team review
  Composite components (SearchBar, DataTable)
  New icons
  Layout patterns

Tier 3 — Open contribution
  Page templates
  Experimental patterns
  Proof of concepts
```

### RFC process for component changes

```markdown
## RFC: [Component Change Title]

### Motivation
[Why this change is needed]

### Proposal
[What changes, before/after]

### Breaking changes
[List any breaking changes and migration path]

### Alternatives considered
[Other approaches evaluated]

### Open questions
[Unresolved decisions]
```

Review window: 5 business days. Merge requires sign-off from 1 designer + 1 engineer.

---

## Checklist

- [ ] Figma files organized with standard page structure
- [ ] Layer naming convention followed (component / variant / state)
- [ ] Figma Variables set up in three collections (Primitives, Semantic, Component)
- [ ] Token sync pipeline configured (Tokens Studio → Style Dictionary → CSS)
- [ ] Token CI automation in place (auto-commit on tokens.json change)
- [ ] Handoff checklist followed before marking designs as "Ready for Dev"
- [ ] Design QA performed after engineering implementation
- [ ] Component audit documented when starting a new design system initiative
- [ ] Contribution governance model defined (who can change what)
- [ ] RFC process for breaking component changes
