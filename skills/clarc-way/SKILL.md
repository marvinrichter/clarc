---
name: clarc-way
description: "The clarc Way — opinionated end-to-end software development methodology. 8-stage pipeline from idea to shipped code: /idea → /evaluate → /explore → /prd → /plan → /tdd → /code-review → commit. Activate when a user asks how to structure their workflow, which commands to use, or when to use clarc."
---

# The clarc Way

An opinionated, end-to-end methodology for professional software development with Claude Code.
Not a tool collection — a structured process from raw idea to shipped code.

## When to Activate

- User asks "where do I start?" or "what should I do first?"
- User is unsure which commands or agents to use
- User wants to understand the recommended workflow
- Starting a new feature, fixing a bug, or refactoring
- Onboarding a developer who is new to clarc and needs a guided tour of the full pipeline from idea to merged PR
- Deciding which phases to skip for a well-defined ticket versus an exploratory feature with unclear scope
- Explaining why quality gates (TDD, code review, security scan) are mandatory steps rather than optional add-ons
- Comparing the clarc way to another AI-assisted development framework like SPARC or a custom workflow

---

## The Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE CLARC WAY                                 │
│                                                                 │
│  Phase 0: Discovery (new features only)                         │
│  ─────────────────────────────────────                          │
│  /idea → /evaluate → /explore → /prd                           │
│                                                                 │
│  Phase 1: Planning                                              │
│  ─────────────────────────────────────                          │
│  /plan → architecture + task breakdown                          │
│                                                                 │
│  Phase 2: Implementation                                        │
│  ─────────────────────────────────────                          │
│  /tdd → RED (write failing test)                                │
│       → GREEN (minimal implementation)                          │
│       → IMPROVE (refactor)                                      │
│                                                                 │
│  Phase 3: Quality                                               │
│  ─────────────────────────────────────                          │
│  /code-review → fix CRITICAL + HIGH                             │
│  /security    → (when auth/APIs involved)                       │
│                                                                 │
│  Phase 4: Ship                                                  │
│  ─────────────────────────────────────                          │
│  git commit (conventional format)                               │
│  + push + PR via commit-commands skills                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skip Matrix

Not every phase is required for every task. Use this table to decide:

| Task Type | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|-----------|---------|---------|---------|---------|---------|
| New feature (unknown value) | ✅ | ✅ | ✅ | ✅ | ✅ |
| New feature (clear spec) | ⏭ | ✅ | ✅ | ✅ | ✅ |
| Bug fix | ⏭ | ⏭ | ✅ | ✅ | ✅ |
| Refactor | ⏭ | ✅ | ✅ | ✅ | ✅ |
| Chore / dependency update | ⏭ | ⏭ | ⏭ | ⏭ | ✅ |
| Documentation only | ⏭ | ⏭ | ⏭ | ⏭ | ✅ |

---

## Phase 0: Discovery

> Run only for new features whose value or approach is not yet clear.

```
/idea <description>
```
Structures the raw idea: problem statement, target user, success metric.
Output: `docs/ideas/YYYY-MM-DD-<name>.md`

```
/evaluate <name>
```
Go / No-Go / Modify recommendation. Uses the `product-evaluator` agent.
**Stop here if No-Go.** Do not proceed to implementation.
Output: `docs/evals/YYYY-MM-DD-<name>-eval.md`

```
/explore <name>
```
Generates 2–4 solution options with trade-off analysis and Architecture Decision Record.
Output: `docs/decisions/<name>-adr.md`

```
/prd <name>
```
Full Product Requirements Document synthesizing idea + eval + ADR.
Output: `docs/specs/<name>-prd.md`

---

## Phase 1: Planning

```
/plan <what to build>
```

Invokes the `planner` agent:
1. Restates requirements in unambiguous terms
2. Breaks work into phases with specific, actionable steps
3. Identifies dependencies and risks
4. **Waits for explicit confirmation before any code is written**

---

## Phase 2: Implementation (TDD)

```
/tdd
```

Enforces write-tests-first via the `tdd-guide` agent:

1. **RED** — write a failing test that captures the desired behavior
2. Run test → confirm it fails for the right reason
3. **GREEN** — write minimal code to make the test pass
4. Run test → confirm it passes
5. **IMPROVE** — refactor while keeping tests green
6. Verify coverage is 80%+

Never skip the failing test step. A test that never failed proves nothing.

---

## Phase 3: Quality Gates

These are not optional. They run after implementation, before commit.

```
/code-review
```
Routes to the right language specialist automatically (TypeScript, Go, Python, etc.).
Fix all CRITICAL and HIGH findings. Address MEDIUM where feasible.

```
/security
```
Run when the change touches: authentication, user input, API endpoints, secrets, database access.
Scans for OWASP Top 10, secrets, injection vectors, SSRF.

---

## Phase 4: Ship

Ask Claude to generate a conventional commit message from staged changes:
```
Format: <type>: <description>
Types: feat, fix, refactor, docs, test, chore, perf, ci
```

Use the `commit-commands:commit` skill for a git commit, or `commit-commands:commit-push-pr` to commit + push + open a PR in one step.

---

## Principles

**Convention over Configuration**
clarc selects the right tools. You focus on the problem.

**Quality Gates are Mandatory**
TDD + Code Review + Security are not checkboxes — they are the output.

**Continuous Improvement**
Session learnings become instincts via `/learn-eval`. Instincts become permanent skills via `/evolve`.

**Opinionated, not Dogmatic**
Phases can be skipped when genuinely not needed. The skip matrix above is the guide.

---

## Bug Fix Walkthrough

Bug fixes skip Phase 0 (no discovery needed) and Phase 1 (no upfront plan for a known defect). Start directly at Phase 2 with a failing test.

**Scenario:** `getUserById` returns `null` instead of throwing when the user does not exist.

```
# 1. Write the failing test first (RED)
/tdd
→ [tdd-guide] Write: test_getUserById_throws_when_user_not_found
→ Run: npm test -- --testNamePattern getUserById
→ Confirm: test FAILS (currently returns null, not throws)

# 2. Fix the implementation (GREEN)
→ Edit src/api/users.ts: throw NotFoundError when db returns null
→ Run: npm test -- --testNamePattern getUserById
→ Confirm: test PASSES

# 3. Quality gate before commit
/code-review
→ [typescript-reviewer] MEDIUM: missing error type export — fix it
→ Run: npm test (full suite, all green)

# 4. Commit
→ git commit -m "fix: throw NotFoundError when getUserById receives unknown id"
```

**What was skipped:** `/idea`, `/evaluate`, `/explore`, `/prd`, `/plan` — all unnecessary for a well-understood defect.
**What was not skipped:** `/tdd` (failing test first), `/code-review` (quality gate before commit).

---

## Comparison: clarc Way vs. SPARC

| Dimension | clarc Way | SPARC (ruflo) |
|-----------|-----------|---------------|
| Phases | 5 (Discovery → Ship) | 5 (Spec → Completion) |
| Tool integration | Every phase has dedicated commands + agents | Framework-level, less tooling |
| Quality gates | Mandatory (/code-review, /security) | Refinement phase |
| Learning loop | Instincts → Skills (automated) | Manual |
| Entry point | `/clarc-way` (interactive guide) | SPARC template |
| TDD enforcement | `/tdd` with agent enforcement | Part of refinement |

---

## Quick Reference

| Situation | Start here |
|-----------|-----------|
| "I have a new idea" | `/idea` |
| "Should I build this?" | `/evaluate` |
| "I know what to build, where do I start?" | `/plan` |
| "Fix this bug" | `/tdd` (write the failing test first) |
| "Review my code" | `/code-review` |
| "I'm done, ship it" | `commit-commands:commit-push-pr` |
| "What has clarc learned?" | `/instinct-status` |
| "Show me all commands" | `/find-skill` |
