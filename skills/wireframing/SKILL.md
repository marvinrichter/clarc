---
name: wireframing
description: "Wireframing and prototyping workflow: fidelity levels (lo-fi sketch → mid-fi wireframe → hi-fi prototype), tool selection (Figma, Excalidraw, Balsamiq), user flow diagrams, wireframe annotation standards, information architecture (IA) mapping, and the handoff from wireframe to visual design. For developers who need to communicate UI structure before writing code."
---

# Wireframing Skill

## When to Activate

- Planning a new feature before writing any UI code
- Communicating UI structure to a designer or stakeholder
- Mapping the user flow for a multi-step feature
- Reviewing whether a layout decision makes sense before investing in it
- Converting requirements into a visual structure

---

## Fidelity Levels

Choose the right fidelity for the stage of work.

| Level | What it is | When to use | Tool |
|-------|-----------|------------|------|
| **Lo-fi sketch** | Boxes, lines, labels — no styling | Early ideation, quick exploration | Paper, Excalidraw, ASCII |
| **Mid-fi wireframe** | Grayscale, content placeholders, real layout | UX review, stakeholder alignment | Figma (wireframe kit), Balsamiq |
| **Hi-fi wireframe** | Near-final layout, real content, no color | Pre-handoff to visual design | Figma |
| **Interactive prototype** | Clickable flows, transitions | User testing, investor demos | Figma prototyping |

**Rule:** Start at the lowest fidelity that answers the current question. Only increase fidelity when you've validated the structure.

---

## ASCII / Text Wireframing

For quick communication in chat, tickets, or documentation — no tool required.

### Common notation

```
┌─────────────────────────────┐   Box / container
│                             │
└─────────────────────────────┘

[Button Label]                     CTA button
[ Input placeholder         ]      Text input
[x] Checkbox   (o) Radio           Form controls

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   Divider / separator

▓▓▓▓▓▓▓▓▓▓▓▓▓             Image placeholder
░░░░░░░░░░░░░             Skeleton/loading state

≡  Hamburger menu    ✕  Close    ⌕  Search    ←  Back
```

### Example: Settings page layout

```
┌─────────────────────────────────────────────┐
│  ← Settings                                 │
├──────────────┬──────────────────────────────┤
│              │  Account                     │
│  Account     │  ─────────────────────────── │
│  Billing     │  Name        [ John Doe    ] │
│  Security    │  Email       [ john@...   ] │
│  Notifications│                             │
│  API Keys    │  [  Save Changes  ]         │
│              │                             │
└──────────────┴──────────────────────────────┘
```

---

## User Flow Diagrams

Map the user journey before designing screens.

### Notation

```
[Page/Screen]   — a UI state
<Decision>      — a branch point (yes/no, logged in/out)
(Action)        — user action
→               — flow direction
↵               — loop back

Error states    — document alongside happy path, not as afterthought
Empty states    — what does the screen look like with no data?
Loading states  — what shows during async operations?
```

### Example: Onboarding flow

```
(User clicks "Sign Up")
         ↓
[Sign Up Form]
         ↓
<Email already exists?>
   Yes ↓                    No ↓
[Error: "Email taken"]   (Submit form)
[Login link shown]              ↓
                         [Email Verification]
                                ↓
                         <Verified within 24h?>
                            No ↓             Yes ↓
                         [Resend email]   [Create Profile]
                                                ↓
                                          [Dashboard — empty state]
```

### Flow documentation format

```markdown
## Flow: [Feature Name]

**Entry point:** [Where does this start?]
**Exit points:** [Where can this end?]
**Preconditions:** [What must be true before this flow starts?]

### Happy path
1. User [action]
2. System [response]
3. User [action]
4. System [response]

### Error paths
- E1: [Condition] → [What the system shows]
- E2: [Condition] → [What the system shows]

### Edge cases
- [Edge case and how it's handled]
```

---

## Information Architecture

IA defines how content is organized and labeled — before layout decisions.

### Card sorting output format

```
Home
├── Dashboard
│   ├── Overview
│   └── Activity Feed
├── Projects
│   ├── All Projects
│   ├── [Project Name]
│   │   ├── Overview
│   │   ├── Members
│   │   ├── Settings
│   │   └── Billing
│   └── New Project
├── Settings
│   ├── Profile
│   ├── Security
│   ├── Notifications
│   └── API Keys
└── Help & Support
    ├── Documentation
    └── Contact
```

### IA principles

1. **Mutual exclusivity** — each item belongs in one place only
2. **Collective exhaustivity** — all content has a place
3. **User mental model** — organize by how users think, not how the system is built
4. **Progressive disclosure** — show the most common tasks first; hide advanced features
5. **Maximum 7 items** — in any navigation level (7±2 cognitive limit)

---

## Wireframe Annotation Standards

Annotations explain behavior that visual design cannot show.

### Annotation types

| Symbol | Meaning | Use for |
|--------|---------|---------|
| `[1]` | Numbered callout | Linking to spec note |
| `!` | Important note | Edge case, constraint |
| `?` | Open question | Unresolved decision |
| `→` | Links to | Screen reference |

### Annotation format

```markdown
**[1]** Search results
- Default: show last 5 searches when input is focused
- Typing: show live results after 300ms debounce
- Max results: 8 items
- Empty query: show "recent searches" section
- No results: show "No results for [query]" + suggestion

**[2]** Pagination
- Show when total items > 20
- Always show: first, last, and 2 pages around current
- Loading: skeleton rows, same count as previous page

**!** Error state
- API timeout (>5s): show "Something went wrong" with retry button
- Network offline: show banner, queue actions for retry
```

---

## Tool Selection Guide

### Excalidraw (excalidraw.com)

Best for: quick lo-fi, async async async collaboration, developer-friendly

```
Pros: Free, shareable URL, hand-drawn feel (reduces premature polish attachment)
     Works in VS Code, embedded in Notion/Linear
Cons: Not great for hi-fi, no component library out of the box
```

### Figma

Best for: mid-fi and hi-fi, full team collaboration, handoff to visual design

```
Pros: Industry standard, component libraries, Dev Mode handoff, prototyping
Cons: Overkill for lo-fi, learning curve
Setup: Install "Wireframe Kit" community file for grayscale wireframing
```

### Balsamiq

Best for: stakeholder-friendly lo-fi, non-technical clients

```
Pros: Intentionally rough look (signals "this is not final"), fast
Cons: Not free, limited for hi-fi
```

### ASCII/Markdown (in code, tickets, docs)

Best for: developer communication, PR descriptions, issue comments

```
Pros: No tool needed, version-controllable, always accessible
Cons: Limited fidelity
```

---

## Wireframe → Visual Design Handoff

When wireframe is approved, hand off to visual design (or proceed to hi-fi if self-directing).

### Handoff document

```markdown
## Wireframe Handoff: [Feature Name]

### What's been decided
- Layout structure (column count, section order)
- Navigation model (tabs / sidebar / breadcrumb)
- Primary user flow (happy path and key error paths)
- Content hierarchy (what's most important on each screen)

### What's NOT decided (for visual design)
- Colors, typography, spacing values
- Illustration or icon choices
- Micro-interactions and transitions
- Final copy (placeholder text only)

### Open questions (needs decision before visual design)
- [ ] [Open question 1]
- [ ] [Open question 2]

### Annotated wireframes: [Figma link or image]
### User flow diagram: [link or embedded above]
```

---

## Checklist

- [ ] Fidelity level chosen appropriate to the current question
- [ ] User flow diagram created before any screen wireframes
- [ ] All entry points documented
- [ ] Error states and empty states included (not just happy path)
- [ ] IA / navigation structure mapped before screen layouts
- [ ] Each screen has a clear primary action
- [ ] Annotations explain all non-obvious behavior
- [ ] Open questions documented as `?` annotations (not left implicit)
- [ ] Wireframe reviewed by at least one other person before starting visual design
- [ ] Handoff doc created listing what is / isn't decided
