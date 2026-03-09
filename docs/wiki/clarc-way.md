# The clarc Way

The clarc Way is clarc's opinionated development methodology — a structured process from raw idea to shipped code. Every phase has dedicated commands and agents.

## The Pipeline

```
Phase 0: Discovery        /idea → /evaluate → /explore → /prd
Phase 1: Planning         /plan
Phase 2: Implementation   /tdd  (RED → GREEN → IMPROVE)
Phase 3: Quality          /code-review  +  /security
Phase 4: Ship             /commit-push-pr
```

## Skip Matrix

| Task | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|---------|
| New feature (unknown value) | ✅ | ✅ | ✅ | ✅ | ✅ |
| New feature (clear spec) | ⏭ | ✅ | ✅ | ✅ | ✅ |
| Bug fix | ⏭ | ⏭ | ✅ | ✅ | ✅ |
| Refactor | ⏭ | ✅ | ✅ | ✅ | ✅ |
| Chore / docs | ⏭ | ⏭ | ⏭ | ⏭ | ✅ |

## Phase 0: Discovery

Use this phase only when you're unsure whether an idea is worth building.

| Command | What it does |
|---------|-------------|
| `/idea` | Captures and structures the raw idea |
| `/evaluate` | Go / No-Go / Modify recommendation |
| `/explore` | 2–4 solution options with trade-off analysis + ADR |
| `/prd` | Full Product Requirements Document |

**Stop if `/evaluate` returns No-Go.** Do not build things that fail the evaluation.

## Phase 1: Planning

```
/plan <what to build>
```

The `planner` agent:
1. Restates requirements precisely
2. Breaks work into phases with actionable steps
3. Identifies risks and dependencies
4. **Waits for your explicit approval before any code is written**

## Phase 2: Implementation (TDD)

```
/tdd
```

Enforced sequence via `tdd-guide` agent:
1. Write a failing test (RED)
2. Run it — confirm it fails for the right reason
3. Write minimal code to pass (GREEN)
4. Run it — confirm it passes
5. Refactor while keeping tests green (IMPROVE)
6. Verify 80%+ coverage

Never write implementation before a failing test. A test that never failed proves nothing.

## Phase 3: Quality Gates

Both gates run after implementation, before commit.

```
/code-review     → language-specific review (TypeScript, Go, Python, etc.)
/security        → OWASP Top 10, secrets, injection, SSRF (when auth/APIs involved)
```

Fix all CRITICAL and HIGH findings before committing.

## Phase 4: Ship

```
/commit           → conventional commit message from staged changes
/commit-push-pr   → commit + push + open PR with test plan in one step
```

## Principles

- **Convention over Configuration** — clarc chooses the tools, you focus on the problem
- **Quality Gates are Mandatory** — TDD + Code Review + Security are the output, not checkboxes
- **Continuous Improvement** — session learnings become instincts (`/learn-eval`), then skills (`/evolve`)
- **Opinionated, not Dogmatic** — skip phases when genuinely not needed

## Interactive Guide

Run `/clarc-way` in Claude Code for an interactive walkthrough that recommends the right phase for your current task.
