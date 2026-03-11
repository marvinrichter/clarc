---
description: Create a wireframe or user flow for a feature — generates ASCII/text wireframes, user flow diagrams, IA structure, and annotated specs. Use before writing UI code to validate structure and communicate intent.
---

# Wireframe

Create a wireframe, user flow, or IA map for a feature or page.

## Usage

```
/wireframe "Settings page with account, billing, and security sections"
/wireframe --flow "User onboarding from signup to first project created"
/wireframe --ia   "E-commerce site with products, cart, checkout, account"
/wireframe --audit  # review existing UI for structural issues
```

## Steps

Use the `wireframing` skill throughout this command.

### 1. Determine output type from `$ARGUMENTS`

- `--flow` → User flow diagram (decision tree, paths, error states)
- `--ia` → Information architecture (navigation tree, content hierarchy)
- `--audit` → Structural audit of existing UI
- No flag → Full wireframe (layout + annotations)

### 2. Gather context (ask if not in `$ARGUMENTS`)

For all types:
- **Feature/page name** (required)
- **Primary user goal** (what is the user trying to accomplish?)
- **User type** (authenticated / anonymous / admin / etc.)

For wireframes specifically:
- **Key pages/screens** to wireframe (list them)
- **Device target**: desktop / mobile-first / both
- **Fidelity needed**: lo-fi (ASCII) / mid-fi (described) / both

### 3a. User flow (if `--flow`)

Produce a text user flow diagram:
- Entry points
- Happy path (step by step)
- At least 2 error paths
- Edge cases (empty state, loading, offline)
- Exit points

Format: ASCII arrow diagram, followed by structured markdown

### 3b. IA map (if `--ia`)

Produce a navigation tree:
- Top-level sections
- Second-level pages
- Third-level (if applicable)
- Note: max 7 items per level

Apply IA principles: mutual exclusivity, progressive disclosure, user mental model

### 3c. Wireframe (default)

For each screen/page, produce:

**ASCII wireframe** (lo-fi, using box notation):
```
┌─────────────────────────────────┐
│  [Header / Nav]                  │
├────────────┬────────────────────┤
│ [Sidebar]  │  [Main Content]    │
│            │                    │
└────────────┴────────────────────┘
```

**Annotations** (numbered callouts):
- Behavior notes for non-obvious interactions
- Loading/error/empty states
- Open questions marked with `?`

### 3d. Structural audit (if `--audit`)

Review the described or provided UI:
1. Does each screen have a clear primary action?
2. Are error/empty/loading states defined?
3. Is the navigation hierarchy consistent?
4. Are there too many items at any level (>7)?
5. Is information architecture user-model-based (not system-model)?

Output: finding list sorted by impact.

### 4. Handoff summary

End every output with a brief summary:
- What structure decisions are locked
- What still needs visual design decisions
- Open questions that need answers before proceeding

## Output format

- ASCII wireframes (copy-pasteable into Notion, Jira, GitHub)
- Text-based flow diagrams
- Markdown annotation blocks
- Handoff summary

All output should be directly usable in a PR description, issue, or design document — no tool installation required.

## After This

- `/design-critique` — get structured feedback on the wireframe
- `/slide-deck` — present wireframe in a stakeholder slide deck
