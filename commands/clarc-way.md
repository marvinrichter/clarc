---
description: "Interactive guide to The clarc Way methodology. Identifies your task type, recommends the right pipeline stage, and shows which commands and agents to use — with concrete examples for your current language."
---

# The clarc Way

This command guides you through the clarc development methodology. It identifies where you are in the workflow and recommends exactly what to do next.

## What This Command Does

1. **Identifies your task type** — new idea, bug fix, feature, refactor, chore
2. **Recommends the right pipeline stage** — which phases to run, which to skip
3. **Shows the exact commands and agents** for your situation
4. **Links to relevant skills** for deeper reference

## How It Works

When you run `/clarc-way`, respond to:

> What are you working on?
> **A)** New idea (not sure if I should build it)
> **B)** New feature (I know what to build)
> **C)** Bug fix
> **D)** Refactor or cleanup
> **E)** Chore (deps, docs, config)
> **F)** Show me the full methodology

Based on your answer, clarc provides a tailored pipeline with the exact sequence of commands.

---

## The Full Pipeline (reference)

```
Phase 0: Discovery        /idea → /evaluate → /explore → /prd
Phase 1: Planning         /plan
Phase 2: Implementation   /tdd (RED → GREEN → IMPROVE)
Phase 3: Quality          /code-review  +  /security (when needed)
Phase 4: Ship             git commit (conventional format) + push + PR
```

## Skip Rules

| You're doing... | Start at |
|----------------|---------|
| Unsure if idea is worth building | Phase 0: `/idea` |
| Feature with clear spec | Phase 1: `/plan` |
| Bug fix | Phase 2: `/tdd` (failing test first) |
| Refactor | Phase 1: `/plan` then `/tdd` |
| Docs / chore | git commit directly |

## Example Interactions

```
User: /clarc-way
→ What are you working on?

User: C — bug fix
→ Start with /tdd
  Write a failing test that reproduces the bug first.
  Then fix the code until the test passes.
  Then run /code-review before committing.

  Commands in order:
  1. /tdd          — write failing test, then fix
  2. /code-review  — catch issues before commit
  3. git commit    — conventional commit message (ask Claude to draft it)
```

```
User: /clarc-way
→ What are you working on?

User: A — new idea
→ Start with /idea to capture and structure it.
  Then /evaluate for a Go/No-Go decision.
  Stop if No-Go. Proceed to /explore if Go.

  Commands in order:
  1. /idea         — structure the raw idea
  2. /evaluate     — Go/No-Go recommendation
  3. /explore      — solution options + ADR
  4. /prd          — Product Requirements Document
  5. /plan         — implementation breakdown
  6. /tdd          — test-first implementation
  7. /code-review  — quality gate
  8. git commit + push + PR — ship
```

## Related

- Skill: `clarc-way` — full methodology reference with skip matrix and principles
- Command: `/quickstart` — interactive onboarding for new clarc users
- Command: `/find-skill` — search all available skills by topic
