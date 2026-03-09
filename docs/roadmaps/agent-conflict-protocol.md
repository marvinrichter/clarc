# Agent Conflict Protocol Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** When multiple agents give conflicting advice (e.g., `security-reviewer` says "add input validation", `code-simplifier` says "remove the validation block"), there is no formal tiebreaker protocol. `rules/common/agents.md` states "Security > quality > style" but this is only documented, not mechanically enforced.

---

## Problem Statement

Conflict scenarios that currently have no resolution protocol:

| Conflict | Agents | Gap |
|----------|--------|-----|
| "Add null checks" vs "Simplify conditional logic" | security-reviewer vs code-simplifier | No tiebreaker |
| "Extract to separate service" vs "Keep it simple, no abstraction" | architect vs code-simplifier | No tiebreaker |
| "Add retry logic" vs "Fail fast, don't retry" | resilience-reviewer vs code-reviewer | Context-dependent |
| "Use async/await" vs "Avoid async in this context" | typescript-reviewer vs performance-analyst | No common framework |
| "Write the test first" vs "Just fix the bug" | tdd-guide vs build-error-resolver | Urgency vs methodology |

### Symptoms

- Users receive contradictory advice from two agents in the same session and must choose without guidance
- The `/orchestrate` command synthesizes results but has no documented conflict escalation protocol
- Sequential agent invocations can silently undo each other's changes
- No audit trail of which agent recommended what

---

## Gap Analysis

| Need | Current State | Desired State |
|------|--------------|---------------|
| Priority hierarchy | Documented in text | Machine-readable, agent-aware |
| Conflict detection | None | Explicit signal when agents disagree |
| Resolution protocol | None | Context-aware rules for each conflict class |
| Audit trail | None | Session log of agent recommendations |
| Escalation path | None | "Agents disagree — here's the tiebreaker" |

---

## Proposed Deliverables

### Priority Hierarchy Document (1)

`docs/agent-priority-hierarchy.md` — formal, machine-readable priority ordering:

```
Priority 1 (CRITICAL — never override):
  security-reviewer, devsecops-reviewer, supply-chain-auditor

Priority 2 (HIGH — override only with explicit justification):
  architect, data-architect, contract-reviewer

Priority 3 (MEDIUM — balanced judgment):
  code-reviewer, typescript-reviewer, go-reviewer, python-reviewer, ...

Priority 4 (ADVISORY — easily overridden):
  code-simplifier, refactor-cleaner, performance-analyst

Priority 5 (CONTEXTUAL — depends on task phase):
  tdd-guide, build-error-resolver, e2e-runner
```

### Conflict Classes (5 defined)

| Class | Example | Resolution Rule |
|-------|---------|-----------------|
| `security-vs-simplicity` | Add validation vs remove it | Security always wins |
| `architecture-vs-pragmatism` | Extract service vs keep inline | Context: greenfield=arch, legacy=pragmatic |
| `methodology-vs-urgency` | TDD first vs fix now | Urgency wins for production bugs, methodology wins otherwise |
| `performance-vs-correctness` | Cache aggressively vs always recompute | Correctness wins unless perf SLO is breached |
| `style-vs-consistency` | Rename for clarity vs match existing | Consistency wins in existing codebase, style wins in new code |

### Skill (1)

| Skill | Description |
|-------|-------------|
| `agent-conflict-resolution` | Decision framework for resolving agent conflicts — priority hierarchy, conflict classes, escalation protocol, real-world examples |

### Command Enhancement (1)

| Command | Change |
|---------|--------|
| `/orchestrate` | Add conflict detection step: when synthesizing results, flag explicit contradictions and apply hierarchy rules. Output a "Conflicts Resolved" section. |

### Agent Enhancement (1)

| Agent | Change |
|-------|--------|
| `orchestrator` | Add formal conflict resolution step to instructions: detect contradictions, apply priority hierarchy from `docs/agent-priority-hierarchy.md`, output resolution rationale |

---

## Conflict Detection Heuristics

Agents signal conflicts explicitly with structured output:

```
## Recommendation
action: REMOVE
target: src/api/user.ts:45-52
rationale: Redundant null check after TypeScript strict mode guarantees non-null

## Conflicts With
If security-reviewer recommended keeping this block, DEFER to security-reviewer.
Conflict class: security-vs-simplicity → Security priority wins.
```

The `/orchestrate` command collects these signals and applies the hierarchy.

---

## Implementation Phases

### Phase 1 — Priority Hierarchy Document
- Write `docs/agent-priority-hierarchy.md`
- Define 5 priority levels with agent assignments
- Define 5 conflict classes with resolution rules
- Reference in `rules/common/agents.md`

### Phase 2 — Skill
- Write `skills/agent-conflict-resolution/SKILL.md`
- Include real-world examples for each conflict class
- Include decision tree diagram (ASCII)

### Phase 3 — Orchestrator Agent Update
- Update `agents/orchestrator.md` instructions
- Add conflict detection step to synthesis phase
- Reference priority hierarchy document

### Phase 4 — Structured Conflict Signals
- Update 5 key reviewer agents to emit structured conflict signals when relevant
- Agents: `code-simplifier`, `security-reviewer`, `architect`, `tdd-guide`, `performance-analyst`
- Signal format: `## Conflicts With` section at end of recommendations

---

## Priority Override Protocol

When a lower-priority agent's recommendation seems better in context:

```
1. User invokes: /override <agent-recommendation> --reason "justification"
2. clarc logs the override with timestamp and reason
3. Override is recorded in session context
4. Higher-priority agent is notified (if still in session)
```

This creates an audit trail without blocking the user.

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Automatic change reversion | Too destructive; only flag conflicts, never auto-revert |
| LLM-based conflict detection | Rule-based detection sufficient; avoids latency |
| Cross-session conflict tracking | Adds complexity without clear benefit |

---

## Success Criteria

- [ ] `docs/agent-priority-hierarchy.md` defines 5 priority levels and 5 conflict classes
- [ ] `orchestrator` agent detects and resolves at least 3 conflict scenarios correctly
- [ ] `skills/agent-conflict-resolution/SKILL.md` is complete
- [ ] 5 key agents emit structured conflict signals
- [ ] Priority hierarchy is tested with synthetic conflicting agent outputs
