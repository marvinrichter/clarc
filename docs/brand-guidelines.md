# clarc Brand Guidelines

> Version 1.0 — Design tokens: [`docs/brand/tokens.css`](./brand/tokens.css) · [`docs/brand/tokens.json`](./brand/tokens.json)

---

## Brand Foundation

### What clarc is

clarc is a **workflow OS for Claude Code**. It turns a coding assistant into a structured engineering system — 61 agents, 247 skills, 172 commands, wired together with hooks and a continuous learning flywheel.

It is not a plugin. It is not a wrapper. It is the operating system layer that Claude Code was always missing.

### Brand positioning

| Axis | Position |
|---|---|
| Generic AI tool ←→ Opinionated system | Opinionated system |
| Consumer ←→ Expert | Expert |
| Flashy ←→ Invisible infrastructure | Invisible infrastructure |
| Aspirational ←→ Functional | Functional |

### Personality

**Precise · Structural · Inevitable**

- **Precise** — every word earns its place. Every number is exact. Vagueness is a bug.
- **Structural** — the brand feels like a well-engineered system, not a product. Grids. Hierarchy. Consistency.
- **Inevitable** — once you've seen it, working without it seems absurd. No hype needed.

---

## 1. Name & Wordmark

### Name

- Always lowercase: **clarc** — never "Clarc", never "CLARC"
- Treated like a Unix command name: precise, short, unadorned
- The name contains "arc" — architecture, arc of a workflow, the bend of a plan becoming reality

### Wordmark

The wordmark is the name itself set in **Space Grotesk Medium**, tracked at `−0.02em`.

```
clarc
```

- No icon required for v1 — the name is the mark
- Minimum size: 12px (digital), 6mm (print)
- Clear space: at least 1× the cap-height on all sides

### Logo Brief (for future execution)

When a standalone mark is needed, derive it from the letterform:
- A minimal geometric "arc" — the stroke of the lowercase `c` completed into a precise open circle
- Single weight stroke, no fill
- Should read at 16×16px without ambiguity
- No gradients, no shadows, no 3D effects

---

## 2. Color System

**System name: Blueprint**

The aesthetic of architectural drawings, technical schematics, and terminal UIs. Mostly neutral with surgical, high-contrast color use. Color is information — never decoration.

### Primary — Blueprint Blue

The core brand hue. Sits at **216°** on the color wheel — a cool, authoritative blue. Deliberately distinct from Claude/Anthropic's warm purple (~265°).

```css
--color-primary-500: hsl(216, 80%, 40%);   /* ≈ #1455b8 — main brand color */
--color-primary-600: hsl(216, 80%, 30%);   /* ≈ #0f4089 — accessible text variant */
```

| Token | Value | Use |
|---|---|---|
| `--color-primary-50` | `hsl(216, 80%, 96%)` | Tinted backgrounds, hover states |
| `--color-primary-100` | `hsl(216, 80%, 91%)` | Active backgrounds, selected states |
| `--color-primary-300` | `hsl(216, 80%, 66%)` | Dark-mode interactive elements |
| `--color-primary-500` | `hsl(216, 80%, 40%)` | **Primary action, links, brand moments** |
| `--color-primary-600` | `hsl(216, 80%, 30%)` | Text on light backgrounds (AAA) |
| `--color-primary-900` | `hsl(216, 80%, 08%)` | Deep brand dark |

**WCAG contrast:**
- `primary-500` on white: ~6.3:1 ✓ AA
- `primary-600` on white: ~8.9:1 ✓ AAA
- white on `primary-500`: ~6.3:1 ✓ AA

### Accent — Phosphor

The secondary hue. **162°** — a deep teal-green. References terminal phosphor, Unix heritage. Used sparingly for highlights, status indicators, and active states.

```css
--color-accent-500: hsl(162, 60%, 38%);   /* ≈ #178f68 — icons, borders, highlights */
--color-accent-600: hsl(162, 65%, 28%);   /* ≈ #0e6a4d — accessible text (AA) */
```

Use `accent-500` or brighter for decorative/icon purposes. Use `accent-600+` only for text.

### Neutral Scale — Blueprint Gray

Neutrals carry a whisper of the primary hue (216°, 8–20% saturation). Cool, professional, unified. Nothing looks muddy or generic.

```css
--color-neutral-50:  hsl(216, 20%, 97%);   /* page background */
--color-neutral-100: hsl(216, 16%, 93%);   /* card surfaces */
--color-neutral-200: hsl(216, 14%, 85%);   /* borders, dividers */
--color-neutral-500: hsl(216, 9%,  42%);   /* secondary text */
--color-neutral-700: hsl(216, 10%, 20%);   /* primary text (dark UI) */
--color-neutral-900: hsl(216, 14%, 8%);    /* primary text (light UI) */
--color-neutral-950: hsl(216, 16%, 5%);    /* dark mode background */
```

### Semantic Colors

| Role | Token | Value |
|---|---|---|
| Success | `--color-success-500` | `hsl(142, 58%, 36%)` |
| Warning | `--color-warning-500` | `hsl(38, 90%, 44%)` |
| Error | `--color-error-500` | `hsl(4, 78%, 44%)` |
| Info | `--color-info-500` | Same as `primary-500` |

All semantic colors pass WCAG AA (4.5:1) on white.

### Dark Mode

Background: `neutral-950` (#0a0e15). The blueprint metaphor inverts — white lines on dark substrate, like a real architect's night drafting.

Primary shifts to `primary-300` for text. Borders lighten. Surfaces layer from 950 → 900 → 800.

### Prohibited Color Uses

1. **No gradients on the primary color** — flat fills only; gradients undermine the precision aesthetic
2. **No primary color on colored backgrounds** — only on neutral surfaces
3. **No semantic red for non-error states** — red means something is broken
4. **No more than 2 hues in a single component** — primary OR accent, not both
5. **No tinting photographs** — the brand is not a filter

---

## 3. Typography

### Typeface System

**Display / Heading: Space Grotesk**
- Google Fonts: `https://fonts.google.com/specimen/Space+Grotesk`
- Weights: Regular (400), Medium (500), Bold (700)
- Rationale: Geometric sans with slightly irregular details — it reads "engineered", not "corporate". The terminals have a quality of precision tooling. Unique enough to own.

**Body: Inter**
- Google Fonts: `https://fonts.google.com/specimen/Inter`
- Weights: Regular (400), Medium (500), Semibold (600)
- Rationale: The gold standard for technical documentation legibility. Engineers trust it because it works. Zero friction.

**Monospace: Geist Mono**
- Source: `https://vercel.com/font`
- Alternative: JetBrains Mono (Google Fonts)
- Use: all code blocks, CLI output, file paths, agent names, skill names, command names

**Why this pairing works:** Space Grotesk gives headings a designed quality without being decorative. Inter makes body copy invisible in the best way — you read the content, not the font. Geist Mono bridges the terminal heritage. All three share geometric roots.

### Type Scale

Major Third ratio (×1.25), root 16px.

| Token | Size | Pixels | Line Height | Use |
|---|---|---|---|---|
| `--text-xs`   | 0.64rem  | 10.24px | 1.5 | Metadata, badges, timestamps |
| `--text-sm`   | 0.8rem   | 12.80px | 1.5 | Captions, secondary labels |
| `--text-base` | 1rem     | 16.00px | 1.6 | Body text, descriptions |
| `--text-lg`   | 1.25rem  | 20.00px | 1.5 | Lead paragraphs, UI subheads |
| `--text-xl`   | 1.563rem | 25.00px | 1.4 | Section titles, card headings |
| `--text-2xl`  | 1.953rem | 31.25px | 1.3 | Page headings |
| `--text-3xl`  | 2.441rem | 39.06px | 1.2 | Major section headings |
| `--text-4xl`  | 3.052rem | 48.83px | 1.1 | Display headings |
| `--text-5xl`  | 3.815rem | 61.04px | 1.0 | Hero, one-liners |

```css
/* Example heading hierarchy */
h1 { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 700; letter-spacing: -0.02em; }
h2 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
h3 { font-family: var(--font-display); font-size: var(--text-xl);  font-weight: 600; }
p  { font-family: var(--font-body);    font-size: var(--text-base); line-height: 1.6; }
code, kbd, pre { font-family: var(--font-mono); font-size: 0.9em; }
```

### Text Treatments

**Stat blocks** (e.g., "61 agents"):
- Number: Space Grotesk Bold, `text-5xl`, `primary-500`, `tracking-tight`
- Label: Inter Regular, `text-sm`, `neutral-500`, `tracking-widest`, uppercase

**CLI output:**
- Font: Geist Mono, `text-sm`
- Background: `neutral-900` or `neutral-950`
- Text: `neutral-200` with `accent-300` for active output lines

**Labels / tags / badges:**
- Font: Inter Medium, `text-xs`, `tracking-wide`, uppercase
- Background: tinted with token color at 10% opacity
- Border: 1px solid at 30% opacity

---

## 4. Brand Voice

### Personality on a scale

| Axis | Score | Notes |
|---|---|---|
| Formal ↔ Casual | 3 / 5 | Approachable but not chatty — like a great technical README |
| Serious ↔ Playful | 2 / 5 | Serious — dry wit is allowed, jokes are not |
| Technical ↔ Accessible | 2 / 5 | Technical — the audience is expert engineers |
| Verbose ↔ Terse | 1 / 5 | Extremely terse — every word earns its place |

### Voice principles

**Do:**
- Use exact numbers: "247 skills" not "hundreds of skills"
- Active voice: "clarc routes the review to go-reviewer" not "the review is routed"
- System metaphors: "pipeline", "structured", "wired", "invoked", "resolved"
- Show output: "routes to specialist → returns unified result" — show the workflow
- Dry, precise, occasionally deadpan: "It's a workflow OS. You install it once."

**Don't:**
- Hype words: "revolutionary", "game-changing", "supercharge", "10x", "magic"
- AI-fluff: "empower", "leverage", "seamlessly", "harness the power of"
- Passive voice
- Vague quantifiers: "many", "lots of", "tons of"
- Questions that the user didn't ask: "Ever wonder what it would be like to..."

### Copy examples

**Before (wrong):**
> clarc empowers developers to seamlessly leverage AI-powered workflows and supercharge their productivity with intelligent agents that revolutionize how you write code.

**After (right):**
> clarc turns Claude Code into a structured engineering system.
> 61 agents. 247 skills. 172 commands. Wired together.
> Install once. Run forever.

---

**Tagline options:**

1. `The workflow OS for Claude Code.` — definitive, establishes the category
2. `Structure for Claude Code.` — minimal, precise
3. `Engineering, not just assistance.` — positions against pure assistants
4. `Every workflow. Already written.` — outcome-focused

Recommended: option 1. Own the category.

---

**Agent description format** (within product copy):
```
code-reviewer — routes to language specialists, synthesizes unified output
tdd-guide     — enforces write-tests-first, 80% coverage minimum
planner       — produces task breakdown, PRD, architecture in one pass
```

No verbs like "helps you", "allows you to", "makes it easy to" — just what it does.

---

## 5. Mood Board Direction

### 1. Environment / Setting

A precision engineering workspace at night. A clean desk with a terminal open, casting cool blue light. No clutter. Every object placed intentionally — a mechanical keyboard, a printed spec on graph paper, a coffee cup. Not aspirational, not stock-photo. The vibe of a senior engineer who has solved this problem before and is solving it again, faster.

### 2. Color Feeling

Mostly dark neutral with surgical blue-white light. Like a circuit board photographed under a cold lab light. The primary color appears at exactly the right moment — a single bright trace on a dark PCB. High contrast everywhere. Nothing is muted. When blue appears, it earns attention.

### 3. Texture / Material

No organic textures. No gradients. No blur. Hard geometric edges — like a technical drawing or a terminal UI screenshot. If there is texture, it is a grid: graph paper, dot matrix, or pixel-perfect 1px lines. The brand feels machined, not crafted. Aluminum, not wood.

### 4. Product Aesthetic

The product IS the hero. No lifestyle photography. No abstract 3D shapes. Show a terminal. Show structured output. Show agent routing. Show a code diff. The beauty is in the structure of the output itself — perfectly aligned, color-coded, information-dense. A well-formatted `clarc` response is more compelling than any illustration.

### 5. Typography / UI Feel

Monospace type for everything code-adjacent, geometric sans for everything structural. Text aligned to invisible grids. Every heading at the correct hierarchical weight — nothing bolded for decoration. Wide kerning on all-caps labels. Dense but not crowded. Like a beautifully typeset technical manual — the 1960s IBM reference book aesthetic, expressed in modern type.

---

## 6. Component Patterns

### Buttons

```
Primary:   bg primary-500  text white    border none        hover: primary-600
Secondary: bg transparent  text primary  border primary-200  hover: bg primary-50
Ghost:     bg transparent  text neutral  border none         hover: bg neutral-100
Danger:    bg error-500    text white    border none         hover: error-600
```

- Border radius: `radius-sm` (2px) — precise, not rounded
- Font: Inter Medium, `text-sm`, `tracking-normal`
- No uppercase on buttons — that's for labels

### Code blocks

```
background:  neutral-950
border:      1px solid neutral-800
border-left: 3px solid primary-500  (for highlighted/active)
font:        Geist Mono, text-sm
line-height: 1.5
padding:     space-4 space-6
```

Shell prompts: `neutral-500` text
Command text: `neutral-100`
Active output: `accent-300`
Error output: `error-500`

### Stat display

Used for agent/skill/command counts on marketing surfaces:

```
[number]   Space Grotesk Bold, text-5xl, primary-500, tracking-tight
[label]    Inter Regular, text-xs, neutral-500, tracking-widest, uppercase
```

### Cards / surfaces

```
background:  surface-raised
border:      1px solid border-default
border-radius: radius-lg (8px)
shadow:      shadow-sm
```

No hover lift effects. Hover = border-color shifts to `border-brand`.

---

## 7. Prohibited Uses

1. **No rounded wordmark** — `clarc` uses a tight, structured lockup. Never apply rounded/soft styling to the name itself.
2. **No gradients on primary brand color** — Blueprint is flat. Gradients are not precise.
3. **No lightmode-only designs** — every component must function in dark mode. The terminal is dark.
4. **No humanizing illustration** — no characters, mascots, or abstract "helpful AI" imagery. clarc is infrastructure.
5. **No color-on-color primary** — primary-500 on accent backgrounds, or vice versa. Contrast discipline is the brand.

---

## 8. Token Reference

Full token set: [`docs/brand/tokens.css`](./brand/tokens.css)
Machine-readable: [`docs/brand/tokens.json`](./brand/tokens.json)

### Quick reference — most-used tokens

```css
/* Colors */
var(--color-primary-500)    /* brand blue */
var(--color-accent-500)     /* phosphor green */
var(--color-neutral-900)    /* dark text / dark surfaces */
var(--color-neutral-50)     /* light background */

/* Semantic surfaces */
var(--surface-base)         /* page background */
var(--surface-raised)       /* card background */
var(--text-primary)         /* main text */
var(--text-secondary)       /* subdued text */
var(--border-default)       /* standard border */
var(--border-brand)         /* brand-highlighted border */

/* Typography */
var(--font-display)         /* Space Grotesk — headings */
var(--font-body)            /* Inter — body */
var(--font-mono)            /* Geist Mono — code */

/* Spacing (4px grid) */
var(--space-4)  /* 16px */
var(--space-8)  /* 32px */
var(--space-16) /* 64px */
```

---

## 9. Next Steps

- `/design-critique` — critique this brand identity for blind spots
- `/dark-mode-audit` — verify all token pairs meet contrast requirements
- `/visual-test` — add visual regression tests for token implementation
- `/icon-system` — generate an icon system aligned to this identity
