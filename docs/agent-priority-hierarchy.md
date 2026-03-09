# Agent Priority Hierarchy

Formal tiebreaker protocol when multiple agents give conflicting recommendations.
Referenced by the `orchestrator` agent and the `/orchestrate` command.

---

## Priority Levels

| Level | Priority | Agents | Override Rule |
|-------|----------|--------|---------------|
| P1 | **CRITICAL — never override** | `security-reviewer`, `devsecops-reviewer`, `supply-chain-auditor` | Security wins unconditionally |
| P2 | **HIGH — requires justification** | `architect`, `data-architect`, `contract-reviewer` | Override allowed with explicit written rationale |
| P3 | **MEDIUM — balanced judgment** | `code-reviewer`, `typescript-reviewer`, `go-reviewer`, `python-reviewer`, `java-reviewer`, `swift-reviewer`, `rust-reviewer`, `cpp-reviewer`, `ruby-reviewer`, `elixir-reviewer`, `database-reviewer` | Default synthesis: prefer the more specific agent |
| P4 | **ADVISORY — easily overridden** | `pr-review-toolkit:code-simplifier`, `refactor-cleaner`, `performance-analyst` | P3+ agent wins if they disagree |
| P5 | **CONTEXTUAL — task-phase dependent** | `tdd-guide`, `build-error-resolver`, `e2e-runner` | Context rule applies (see below) |

---

## Conflict Classes

Five recurring conflict patterns with deterministic resolution rules:

### 1. `security-vs-simplicity`

> "Add input validation here" vs "Remove this redundant check"

**Resolution:** Security (P1) wins unconditionally.

**Rationale:** One exploited vulnerability can cost users real losses. A few extra lines of defensive code is always cheaper than a breach.

**Examples:**
- `security-reviewer` says "add null check before DB query" → keep it, even if `code-simplifier` calls it redundant
- `security-reviewer` says "validate URL before fetch" → keep it, even if `performance-analyst` says the validation adds latency

---

### 2. `architecture-vs-pragmatism`

> "Extract this into a separate service" vs "Keep it simple, inline for now"

**Resolution:** Context-dependent.

| Context | Winner |
|---------|--------|
| Greenfield project, or feature crosses 2+ bounded contexts | `architect` (P2) wins |
| Legacy codebase, or urgent hotfix, or single bounded context | Pragmatism wins (override with justification) |
| Unclear context | Ask the user before proceeding |

**Conflict signal:** When `architect` recommends extraction and a code-level agent disagrees, the synthesizer must state the context rule applied.

---

### 3. `methodology-vs-urgency`

> "Write the test first" vs "Just fix the production bug now"

**Resolution:** Urgency wins for production incidents; methodology wins otherwise.

| Situation | Winner |
|-----------|--------|
| Production is down or data loss is occurring | `build-error-resolver` (P5 urgency mode) — fix first, add tests after |
| Non-urgent bug fix or new feature | `tdd-guide` (P5 methodology mode) — tests first |
| Ambiguous urgency | Treat as non-urgent (methodology wins by default) |

**Note:** Even in urgency mode, `tdd-guide` should add retroactive tests after the fix as a follow-up task.

---

### 4. `performance-vs-correctness`

> "Cache this result aggressively" vs "Always recompute to guarantee freshness"

**Resolution:** Correctness wins unless a measured performance SLO is actively breached.

| Situation | Winner |
|-----------|--------|
| No active SLO breach (p99 within targets) | Correctness / `code-reviewer` |
| Measured SLO breach with profiling evidence | `performance-analyst` recommendation accepted |
| Theoretical perf concern without measurement | Correctness wins |

**Key rule:** `performance-analyst` must provide concrete evidence (profiling output, flamegraph, or N+1 query count) — generic "this might be slow" concerns do not override correctness.

---

### 5. `style-vs-consistency`

> "Rename this for clarity" vs "Match the existing codebase naming"

**Resolution:** Consistency wins in existing codebase; style wins in net-new code.

| Situation | Winner |
|-----------|--------|
| Modifying existing code in an established codebase | Consistency — match the existing pattern |
| Writing net-new code with no existing convention | Style / clarity — use the better name |
| Both options are equally clear | Consistency wins (less diff noise) |

---

## Structured Conflict Signal Format

When an agent's recommendation conflicts with another agent, it MUST emit a `## Conflicts With` section:

```markdown
## Recommendation

action: REMOVE
target: src/api/user.ts:45-52
rationale: Redundant null check — TypeScript strict mode guarantees non-null here

## Conflicts With

If `security-reviewer` recommended keeping this block:
- Conflict class: `security-vs-simplicity`
- Resolution: DEFER to security-reviewer (P1 > P4)
- Do NOT apply this recommendation if security-reviewer is active
```

This signal is consumed by the `orchestrator` agent during synthesis.

---

## Priority Override Protocol

When a lower-priority recommendation is genuinely better in context:

1. The lower-priority agent states its recommendation and flags the potential conflict
2. The orchestrator surfaces the conflict explicitly in the `### Conflicts` section
3. The user or orchestrator applies the resolution rule and documents the rationale
4. The override is noted in the synthesis output (not silently applied)

**What is NOT allowed:**
- Silent override (applying a lower-priority recommendation without noting the conflict)
- Auto-reversion (an agent undoing another agent's changes without human confirmation)
- Blocking the user (conflicts must surface as guidance, not hard stops)

---

## Quick Reference

```
P1 SECURITY > P2 ARCHITECTURE > P3 CODE QUALITY > P4 ADVISORY > P5 CONTEXTUAL

Conflict class resolution:
  security-vs-simplicity     → P1 always wins
  architecture-vs-pragmatism → greenfield=P2, legacy=pragmatic
  methodology-vs-urgency     → production=urgency, normal=methodology
  performance-vs-correctness → needs evidence, else correctness wins
  style-vs-consistency       → new code=style, existing code=consistency
```

> See skill `agent-conflict-resolution` for decision trees, real-world examples, and escalation templates.
