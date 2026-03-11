---
description: "Interactive onboarding for new clarc users. Guides through the first 5 minutes: explains the most important workflows, recommends which commands to start with, and gives a practical tour with concrete examples."
---

# Quickstart

Welcome to clarc! This command guides you through your first 5 minutes.

## What This Command Does

1. **Identifies what you want to do** — choose from common starting points
2. **Shows the right workflow** — exact commands, in order
3. **Explains the methodology** — why clarc works the way it does
4. **Gets you moving** — concrete next step, not a documentation dump

---

## How It Works

When you run `/quickstart`, clarc asks:

> What do you want to do today?
>
> **A)** Write code / build a feature
> **B)** Fix a bug
> **C)** Review existing code
> **D)** Validate a new idea before building it
> **E)** Understand clarc (show me what's available)

Then it shows the exact sequence of commands for your choice.

---

## Path A — Build a feature

```
1. /plan          → create implementation plan, wait for your approval
2. /tdd           → write tests first, then implement
3. /code-review   → catch issues before commit
4. git commit + push + PR → ship
```

If you're unsure the feature is worth building first: `/idea` → `/evaluate`.

---

## Path B — Fix a bug

```
1. /tdd           → write a failing test that reproduces the bug
                    (run it — confirm it fails)
                    → fix the code until the test passes
2. /code-review   → review before committing
3. git commit     → conventional commit message (ask Claude to draft it)
```

The failing test is not optional. It proves the bug exists and proves your fix works.

---

## Path C — Review code

```
/code-review      → routes to the right language specialist automatically
```

For security-sensitive changes (auth, APIs, user input):
```
/security-review  → OWASP Top 10, secrets, injection, SSRF
```

---

## Path D — Validate an idea

```
1. /idea          → structure the raw idea
2. /evaluate      → Go / No-Go / Modify recommendation
   → Stop if No-Go. Build something else.
   → Continue if Go:
3. /explore       → 2–4 solution options with trade-off analysis
4. /prd           → Product Requirements Document
5. /plan          → implementation breakdown
```

---

## Path E — Understand clarc

**The 10 most-used commands:**

| Command | What it does |
|---------|-------------|
| `/plan` | Plan before coding — breaks down the work, waits for your OK |
| `/tdd` | Enforce test-first — no implementation before a failing test |
| `/code-review` | Automatic language-specific code review |
| `/security-review` | Security scan — OWASP, secrets, injection |
| `/verify` | Full quality loop — build + type-check + lint + test |
| `/idea` | Capture a product idea |
| `/evaluate` | Go/No-Go product evaluation |
| `/breakdown` | Break a feature into sprint-ready user stories |
| `/sessions` | Browse session history and snapshots |
| `/instinct-status` | See what clarc has learned from your sessions |

**The most-used agents (invoked automatically):**

| Agent | When it activates |
|-------|------------------|
| `planner` | You run `/plan` or start a complex feature |
| `tdd-guide` | You run `/tdd` |
| `code-reviewer` | After writing or modifying any code |
| `security-reviewer` | Code touches auth, input, APIs, secrets |
| `build-error-resolver` | The build fails |

**The full methodology:** `/clarc-way` — interactive guide that recommends the right workflow for any task.

---

## Verify your installation

```bash
npx github:marvinrichter/clarc doctor
# or: /doctor
```

---

## Learn more

- `/clarc-way` — interactive workflow guide (the methodology behind clarc)
- `/find-skill` — search all 200+ skills by topic
- `/doctor` — health-check your clarc installation
- Skill: `clarc-way` — full methodology reference with skip matrix

## After This

- `/clarc-way` — interactive workflow guide for the next task
- `/tdd` — start your first feature with test-driven development
