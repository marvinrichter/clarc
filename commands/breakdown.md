---
description: Break down a feature, epic, or initiative into sprint-ready tasks. Produces user stories, acceptance criteria, story point estimates, and a prioritized task list ready to paste into Jira, Linear, or GitHub Issues.
---

# Breakdown — Feature to Sprint Tasks

Break down: $ARGUMENTS

---

## Step 1 — Clarify scope

From $ARGUMENTS, identify:
- **What** is being built (user-facing feature or technical work?)
- **Who** is the user (persona, role)?
- **Why** does it matter (business value, pain point solved)?
- **What is out of scope** (explicitly name 2-3 things not included)?

If scope is unclear, ask before proceeding.

## Step 2 — Write the epic

```
As a [persona],
I want [capability],
So that [outcome/value].

Acceptance criteria (epic-level):
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
```

## Step 3 — Identify task types

Categorize work into:
- **Frontend** — UI components, pages, interactions
- **Backend** — API endpoints, business logic, data models
- **Infrastructure** — deployment, configuration, migrations
- **Testing** — unit, integration, E2E tests
- **Design** — wireframes, specs (if needed)
- **Documentation** — internal docs, changelog

## Step 4 — Write user stories

For each meaningful unit of deliverable value, write a story:

```
[SHORT TITLE] (N points)

As a [user type],
I want [specific action or capability],
So that [specific outcome].

Acceptance criteria:
- [ ] [Specific, testable criterion]
- [ ] [Edge case handled]
- [ ] [Error state handled]

Technical notes:
- [Implementation hint, API endpoint, component name]
```

Story point guidelines:
- **1 pt** — trivial change, < 2 hours
- **2 pt** — small, well-understood, < half day
- **3 pt** — medium complexity, 1 day
- **5 pt** — complex or cross-cutting, 2-3 days
- **8 pt** — large, should be broken down further
- **13+ pt** — must split into smaller stories

## Step 5 — Sequence and prioritize

Order stories by:
1. **Blockers first** — infrastructure, migrations, foundational APIs
2. **Happy path** — core user journey (minimum lovable product)
3. **Error states** — validation, edge cases, empty states
4. **Polish** — loading states, animations, accessibility
5. **Nice-to-have** — additional features, optimizations

## Step 6 — Output

Produce the sprint task list:

```markdown
## Epic: [Title]

**Persona**: [User type]
**Goal**: [One sentence]
**Out of scope**: [2-3 items]
**Total estimate**: [N points]

---

### Sprint Tasks (prioritized)

#### P0 — Blockers
- [ ] [TASK-001] [Title] (N pts) — [one-line description]

#### P1 — Core flow
- [ ] [TASK-002] [Title] (N pts)
- [ ] [TASK-003] [Title] (N pts)

#### P2 — Error handling
- [ ] [TASK-004] [Title] (N pts)

#### P3 — Polish
- [ ] [TASK-005] [Title] (N pts)

---

### Dependencies
- [Task X] must complete before [Task Y]
- External: [any external dependency]

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] PR reviewed and merged
- [ ] Deployed to staging and smoke tested
- [ ] Product/design sign-off
```

## After This

- `/tdd` — implement the broken-down tasks with TDD
- `/plan` — create a full implementation plan from the breakdown
