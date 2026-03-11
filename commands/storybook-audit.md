---
description: Audit an existing Storybook setup — story coverage, CSF version, accessibility, interaction tests, documentation quality, Chromatic integration, and prioritized improvement plan
---

# Storybook Audit Command

Audit the Storybook setup for: $ARGUMENTS

## Your Task

Systematically assess an existing Storybook installation across 6 dimensions and produce a prioritized improvement plan.

## Step 1 — Inventory

```bash
# Count components and stories
echo "=== Component count ==="
find src/ -name "*.tsx" -not -name "*.stories.*" -not -name "*.test.*" | wc -l

echo "=== Story files ==="
find src/ -name "*.stories.*" | wc -l

echo "=== Components without stories ==="
comm -23 \
  <(find src/ -name "*.tsx" -not -name "*.stories.*" -not -name "*.test.*" | sed 's/\.tsx$//' | sort) \
  <(find src/ -name "*.stories.*" | sed 's/\.stories\.*$//' | sort)

# Check Storybook version
cat package.json | grep '"storybook\|@storybook'

# Check addons installed
cat .storybook/main.ts | grep "addons"
```

## Step 2 — CSF Version Check

```bash
# CSF2 patterns (old — should migrate to CSF3)
grep -rn "^export const .* = (args) =>\|^export const .* = () =>" src/ --include="*.stories.*"
grep -rn "\.args = {" src/ --include="*.stories.*"
grep -rn "\.story = {" src/ --include="*.stories.*"

# CSF3 patterns (good)
grep -rn "satisfies Meta\|StoryObj<" src/ --include="*.stories.*"
```

Categorize:
- Pure CSF2 → migration recommended
- Mixed CSF2/CSF3 → finish migration
- Pure CSF3 → good

## Step 3 — Accessibility Audit

```bash
# Is addon-a11y installed?
cat package.json | grep "addon-a11y"
cat .storybook/main.ts | grep "addon-a11y"

# Are a11y checks disabled globally? (bad practice)
grep -rn "a11y.*disable" .storybook/ src/ --include="*.ts" --include="*.tsx"

# Stories with a11y disabled (may be valid, may not be)
grep -rn "disable: true" src/ --include="*.stories.*" -B2 | grep "a11y"
```

Check:
- [ ] `@storybook/addon-a11y` installed
- [ ] a11y not globally disabled
- [ ] a11y disabled per-story has documented reason

## Step 4 — Interaction Tests

```bash
# Stories with play functions
grep -rn "play:" src/ --include="*.stories.*" | wc -l

# Stories importing from @storybook/test
grep -rn "@storybook/test" src/ --include="*.stories.*" | wc -l

# Complex components without play functions (should have them)
# Look for: forms, modals, multi-step workflows, dropdowns
grep -rn "Form\|Modal\|Wizard\|Dropdown\|Select\|Tab" src/ --include="*.stories.*" | grep -v "play:"
```

Assess:
- What % of interactive components have `play` functions?
- What critical user flows are untested?

## Step 5 — Documentation Quality

```bash
# Stories with autodocs tag
grep -rn "autodocs" src/ --include="*.stories.*" | wc -l

# ArgTypes definitions (are props documented?)
grep -rn "argTypes:" src/ --include="*.stories.*" | wc -l

# Components with no docs at all
find src/ -name "*.stories.*" | xargs grep -L "autodocs\|argTypes\|description"

# Docs page descriptions
grep -rn "description:" src/ --include="*.stories.*" | head -5
```

## Step 6 — Chromatic Integration

```bash
# Is Chromatic installed?
cat package.json | grep "chromatic"
ls .github/workflows/ | grep -i chromatic

# Is auto-accept configured on main?
cat .github/workflows/*.yml | grep "autoAcceptChanges"

# Are only-changed optimizations used?
cat .github/workflows/*.yml | grep "onlyChanged"
```

## Step 7 — Generate Audit Report

```markdown
## Storybook Audit Report

**Date:** [today]
**Storybook Version:** [version]

---

### 1. Story Coverage

| Metric | Count | Target |
|--------|-------|--------|
| Total components | [N] | — |
| Components with stories | [N] | ≥ 80% |
| Story coverage | [N]% | ≥ 80% |

**Missing stories (high priority — frequently used components):**
- [list top 5 most-used components without stories]

---

### 2. CSF Version

**Status:** [Pure CSF2 / Mixed / Pure CSF3]

[If CSF2 present]:
**Migration needed:** [N] files
Top priority files to migrate:
1. [file] — [N] stories

---

### 3. Accessibility

**Status:** [🟢 Good / 🟡 Partial / 🔴 Missing]

- `@storybook/addon-a11y`: [installed / not installed]
- Global a11y: [enabled / disabled — needs enabling]
- Per-story a11y disabled: [N] stories
  - [N] with documented reason (OK)
  - [N] without reason (investigate)

**Issues found:**
- [list any a11y violations found in stories]

---

### 4. Interaction Tests

**Status:** [🟢 Good / 🟡 Partial / 🔴 Missing]

| Metric | Count |
|--------|-------|
| Stories with `play` functions | [N] |
| Interactive components total | [N] |
| Coverage | [N]% |

**Critical missing interaction tests:**
1. `[Component]` — [reason it needs tests]
2. ...

---

### 5. Documentation Quality

**Status:** [🟢 Good / 🟡 Partial / 🔴 Missing]

- autodocs enabled: [N] components
- ArgTypes defined: [N] components
- Component descriptions: [N]

**Most-used components missing docs:**
1. [Component]
2. ...

---

### 6. Chromatic Integration

**Status:** [🟢 Configured / 🟡 Partial / 🔴 Missing]

- Chromatic installed: [yes/no]
- CI workflow: [exists/missing]
- `onlyChanged`: [configured/not configured]
- `autoAcceptChanges` on main: [configured/not configured]

---

### Prioritized Improvement Plan

| Priority | Action | Effort | Impact |
|---------|--------|--------|--------|
| P0 | Install `addon-a11y` | 30 min | High — catches regressions |
| P0 | Add stories for [top components] | 2h | High — coverage |
| P1 | Migrate CSF2 → CSF3 ([N] files) | 4h | Medium — type safety |
| P1 | Add `play` functions to [forms/modals] | 4h | High — catch regressions |
| P2 | Enable `autodocs` for all components | 1h | Medium — documentation |
| P2 | Set up Chromatic CI | 1h | High — visual regression |
| P3 | Add ArgTypes to [undocumented] | 2h | Low — docs quality |

**Quick wins (< 1 hour):**
1. [Specific, immediately actionable item]
2. [Specific, immediately actionable item]
```

## Reference Skills

- `storybook-patterns` — CSF3, play functions, addons, Chromatic
- `visual-testing` — Chromatic, Playwright visual regression, baselines
- `accessibility` — WCAG guidelines checked by addon-a11y

> **Scope note**: This command covers Storybook stories only. For a full design system audit (CSS tokens, dark mode, icon system, accessibility, design-code consistency), use `/design-system-review` instead.

## After This

- `/design-system-review` — full design system audit (tokens, dark mode, icons, a11y)
- `/code-review` — review component implementation after story coverage gaps are fixed
