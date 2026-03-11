---
description: Scala code review for functional idioms, Cats Effect/ZIO patterns, ADT correctness, and null safety. Invokes the scala-reviewer agent.
---

# Scala Code Review

This command invokes the **scala-reviewer** agent for Scala-specific code review.

## What This Command Does

1. **Identify Scala Changes**: Find modified `.scala` and `.sc` files via `git diff`
2. **Effect System Review**: Cats Effect / ZIO resource safety, fiber leaks, bracket usage
3. **ADT Correctness**: Sealed trait exhaustiveness, pattern match coverage
4. **Null Safety**: `Option` misuse, `null` references, unsafe `get` calls
5. **Scala 3 Migration**: Deprecated Scala 2 patterns, new Scala 3 idioms
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying Scala code
- Before committing functional Scala changes
- Reviewing Cats Effect or ZIO-based code
- Checking migration from Scala 2 to Scala 3

## Review Categories

### CRITICAL (Must Fix)
- Resource leaks (missing `Resource.use` or `bracket`)
- Unsafe `Option.get`, `Try.get` calls
- Fiber leaks (fire-and-forget without supervision)
- `null` references in Scala code

### HIGH (Should Fix)
- Non-exhaustive pattern matches on sealed traits
- Blocking I/O inside effect context without `blocking`
- Implicit ambiguity causing silent typeclass resolution errors
- Missing error channel in ZIO type signature

### MEDIUM (Consider)
- `Future` instead of IO-based effect system in new code
- Scala 2 syntax that Scala 3 can express more clearly
- Unused implicits or given instances

## When to Use This vs /code-review

| | `/scala-review` | `/code-review` |
|---|---|---|
| **Use when** | Scala project with Cats Effect or ZIO | Multi-language project or unsure |
| **Reviewer** | scala-reviewer (specialist) | code-reviewer → routes to scala-reviewer automatically |
| **Output** | Scala-specific: ADTs, effect systems, null safety | Combined report across all changed languages |

Both invoke the same specialist. Use `/code-review` when changes span multiple languages.

## After This

- `/tdd` — add tests if coverage gaps were flagged
- `/commit-push-pr` — commit and open PR after CRITICAL/HIGH are resolved

## Related

- Agent: `agents/scala-reviewer.md`
- Skills: `skills/scala-patterns/`, `skills/scala-testing/`
