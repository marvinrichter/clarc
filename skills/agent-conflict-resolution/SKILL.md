---
name: agent-conflict-resolution
description: Decision framework for resolving conflicts between clarc agents — priority hierarchy, conflict classes, escalation protocol, and real-world examples
skill_family: orchestration
related_agents:
  - orchestrator
  - security-reviewer
  - architect
  - tdd-guide
  - performance-analyst
---

## When to Activate

Use this skill when:
- Two or more agents give contradictory recommendations in the same session
- The `orchestrator` agent's synthesis phase encounters conflicting outputs
- A lower-priority agent's suggestion contradicts a higher-priority agent's finding
- You need to decide which agent's recommendation to apply when they disagree
- Sequential agent invocations appear to undo each other's changes

Do not use this skill for single-agent sessions with no conflict — standard agent instructions apply.

## Priority Hierarchy (Quick Reference)

```
P1 SECURITY (never override)
  └─ security-reviewer, devsecops-reviewer, supply-chain-auditor

P2 ARCHITECTURE (requires justification to override)
  └─ architect, data-architect, contract-reviewer

P3 CODE QUALITY (balanced, prefer more specific agent)
  └─ code-reviewer, typescript-reviewer, go-reviewer, python-reviewer, …

P4 ADVISORY (easily overridden by P1–P3)
  └─ code-simplifier, refactor-cleaner, performance-analyst

P5 CONTEXTUAL (task-phase dependent — see conflict class rules)
  └─ tdd-guide, build-error-resolver, e2e-runner
```

Full hierarchy with override rules: `docs/agent-priority-hierarchy.md`

## Five Conflict Classes — Decision Trees

### Class 1: `security-vs-simplicity`

```
                    [Conflict detected]
                           │
            ┌──────────────┴──────────────┐
            │                             │
   security-reviewer     code-simplifier / refactor-cleaner
   recommends keeping    recommends removing
            │
            └──────────► KEEP (P1 wins unconditionally)
                         No exception.
```

**Real-world example:**

```
security-reviewer: "Add input sanitization before passing to SQL query"
code-reviewer:     "This is handled by the ORM — the check is redundant"

Resolution: Keep the explicit sanitization. Defense in depth is correct even
when the ORM provides partial protection. Document why it's intentional.
```

---

### Class 2: `architecture-vs-pragmatism`

```
                    [Conflict detected]
                           │
              ┌────────────┴────────────┐
              │                         │
      architect says EXTRACT        code agent says KEEP INLINE
              │
         Is this greenfield?
              │
       ┌──────┴──────┐
       YES            NO
       │               │
   Architect wins   Is it a production incident?
                        │
                  ┌─────┴─────┐
                  YES          NO
                  │             │
              Pragmatic      Architect wins
              (extract later)  (document override)
```

**Real-world example:**

```
architect:          "Extract UserNotificationService into its own bounded context"
typescript-reviewer: "This is 40 lines — extracting adds unnecessary indirection"

Context: 2-year-old legacy codebase, urgent bugfix needed
Resolution: Pragmatic wins. Add ADR noting the extraction as tech debt.
```

---

### Class 3: `methodology-vs-urgency`

```
                    [Conflict detected]
                           │
            ┌──────────────┴──────────────┐
            │                             │
       tdd-guide says WRITE TEST FIRST    build-error-resolver says FIX NOW
            │
     Is production down or data loss?
            │
       ┌────┴────┐
       YES        NO
       │           │
   Fix first    tdd-guide wins
   Add tests    (tests first)
   after
```

**Real-world example:**

```
tdd-guide:           "Write failing test for the edge case first"
build-error-resolver: "The deploy pipeline is blocked — fix the null check now"

Situation: CI is broken, blocking the team
Resolution: Fix the null check immediately. Schedule test as follow-up commit.
```

---

### Class 4: `performance-vs-correctness`

```
                    [Conflict detected]
                           │
         ┌─────────────────┴─────────────────┐
         │                                     │
  performance-analyst says CACHE         code-reviewer says ALWAYS RECOMPUTE
         │
  Is there profiling evidence?
         │
    ┌────┴────┐
    YES        NO
    │           │
  Apply cache  Correctness wins
  (document    (theoretical perf concern
   TTL/eviction)  not sufficient)
```

**Real-world example:**

```
performance-analyst: "Cache user permissions in Redis with 60s TTL"
security-reviewer:   "Stale permission cache is a security risk for deprovisioned users"

Here security-vs-performance overlaps with security-vs-simplicity:
Resolution: Security (P1) wins. Shorter TTL (5s) is acceptable compromise.
Document in ADR.
```

---

### Class 5: `style-vs-consistency`

```
                    [Conflict detected]
                           │
            ┌──────────────┴──────────────┐
            │                             │
  Agent A says RENAME (clarity)      Agent B says KEEP (consistency)
            │
    Is this existing code?
            │
       ┌────┴────┐
       YES        NO (net-new code)
       │           │
   Consistency   Style / clarity wins
   wins           (use the better name)
```

---

## Structured Conflict Signal

When emitting a recommendation that may conflict with another agent, append:

```markdown
## Conflicts With

If `[agent-name]` recommended [opposite action]:
- Conflict class: `[class-name]`
- Resolution rule: [which agent wins and why]
- Action: DEFER | PROCEED | ESCALATE TO USER
```

**Example:**

```markdown
## Recommendation

Remove the null guard at `src/api/users.ts:88`.
TypeScript strict mode guarantees `user` is non-null at this point.

## Conflicts With

If `security-reviewer` recommended keeping this guard:
- Conflict class: `security-vs-simplicity`
- Resolution rule: P1 security wins unconditionally
- Action: DEFER — do not apply this removal if security-reviewer is active
```

## Orchestrator Synthesis Protocol

When synthesizing results from multiple agents in the `### Conflicts` section:

1. **Identify conflicts** — compare recommendations across all agent outputs for same code locations
2. **Classify** — assign each conflict to one of the 5 classes
3. **Apply resolution rule** — state which agent wins and why
4. **Document overrides** — if lower-priority agent wins, note the justification
5. **Never silently resolve** — every conflict must appear in the `### Conflicts Resolved` section

**Output format:**

```markdown
### Conflicts Resolved

| Conflict | Agents | Class | Winner | Rationale |
|----------|--------|-------|--------|-----------|
| Remove null check at users.ts:88 | code-simplifier vs security-reviewer | security-vs-simplicity | security-reviewer | P1 wins unconditionally |
| Extract NotificationService | architect vs typescript-reviewer | architecture-vs-pragmatism | typescript-reviewer | Legacy codebase, pragmatic override |
```

## Anti-Patterns

**Do NOT:**

```
❌ Silently apply a lower-priority recommendation without noting the conflict
❌ Auto-revert another agent's changes without human confirmation
❌ Block the user — conflicts are guidance, not hard stops
❌ Accept "this might be slow" as evidence for performance-vs-correctness class
❌ Override security-reviewer even when the check appears redundant
```

**Do:**

```
✓ Surface every conflict explicitly in synthesis output
✓ Apply priority hierarchy deterministically
✓ Document context when using context-dependent rules (class 2, 3)
✓ Require profiling evidence before accepting performance override
✓ Treat P1 security recommendations as unconditional
```

## Code Examples

### Conflict-aware orchestration output

```markdown
## Results

### Agreements
- All agents: add retry logic with exponential backoff on network calls
- All agents: extract constants from magic numbers in processOrder()

### Conflicts Resolved

| Conflict | Agents | Class | Winner |
|----------|--------|-------|--------|
| Remove userId validation | code-simplifier vs security-reviewer | security-vs-simplicity | security-reviewer (P1) |
| Extract OrderProcessor service | architect vs code-reviewer | architecture-vs-pragmatism | code-reviewer — legacy codebase, pragmatic |

### Recommendations
1. Keep userId validation at orders.ts:42 (security requirement)
2. Keep OrderProcessor inline for now — create tech debt ticket for extraction
3. Add retry logic: agreed by all agents
```
