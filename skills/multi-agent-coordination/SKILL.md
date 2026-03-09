---
name: multi-agent-coordination
description: Native multi-agent coordination patterns — fan-out, split-role, explorer+validator, worktree isolation. Covers pattern selection, context hygiene, failure handling, and result synthesis.
version: 1.0.0
---

# Multi-Agent Coordination

Patterns for orchestrating multiple Claude agents on complex tasks. Use via `/orchestrate` or by invoking the `orchestrator` agent directly.

## When to Activate

- Task requires 3+ independent parallel workstreams
- User runs `/orchestrate <task>`
- Complex feature implementation spanning multiple domains
- Review task requiring multiple specialist perspectives
- Large refactor requiring parallel analysis and implementation

## Pattern Catalogue

### 1. Fan-Out / Fan-In

**When to use:** Identical task across multiple targets (files, services, modules).

```
Orchestrator
 ├─ Agent A: analyze module-1
 ├─ Agent B: analyze module-2
 └─ Agent C: analyze module-3
       ↓
  Synthesizer: merge results
```

**Implementation:**

```
Launch agents in parallel with Agent tool:
- Each agent gets: task description + its specific target
- Use isolation: "worktree" for write operations
- Collect all results before synthesis
- Synthesizer reads all outputs and produces unified report
```

**Context hygiene:** Each agent operates in isolation. Do NOT share context between fan-out agents — pass only what each agent needs.

---

### 2. Split-Role

**When to use:** Task benefits from multiple independent perspectives (code review, architecture decision, security analysis).

```
Orchestrator
 ├─ Agent A: Implementer (write code, optimize for speed)
 ├─ Agent B: Critic (find issues, edge cases, alternatives)
 └─ Agent C: Security reviewer (OWASP, injection, auth)
       ↓
  Final synthesis: reconcile perspectives
```

**Implementation:**

Each agent receives the same code/task but a different role prompt. Results are synthesized into a final recommendation that weighs all perspectives.

**Useful for:**
- Code review with contradictory feedback → reconcile
- Architecture decisions → Devil's advocate removes blind spots
- Security-critical features → independent security pass

---

### 3. Explorer + Validator

**When to use:** Unknown codebase, uncertain requirements, research tasks.

```
Phase 1 (Explorer):  Research → findings.md
Phase 2 (Validator): Verify findings → corrections.md
Phase 3 (Main):      Implement using verified findings
```

**Implementation:**

```
1. Explorer agent: reads codebase broadly, summarizes architecture
2. Validator agent: fact-checks specific claims from explorer
3. Main context: uses verified findings to implement
```

**Key rule:** Never trust explorer output directly — always validate with a second agent or manual check before implementing.

---

### 4. Worktree Isolation

**When to use:** Parallel implementation of independent features or fixes.

```
Main branch
 ├─ Worktree A (feature/auth-refactor) ← Agent A
 ├─ Worktree B (feature/api-routes)    ← Agent B
 └─ Worktree C (fix/database-query)    ← Agent C
       ↓
  Main context: review + merge diffs
```

**Implementation:**

Use `isolation: "worktree"` parameter in Agent tool calls. Each agent gets an isolated git worktree — changes don't interfere with each other or the main working tree.

**Cleanup:** Worktrees with no changes are cleaned up automatically. Worktrees with changes return a branch name for review.

---

### 5. Sequential Pipeline

**When to use:** Each phase depends on the output of the previous phase.

```
Phase 1: planner     → plan.md
Phase 2: tdd-guide   → tests (RED)
Phase 3: implementer → implementation (GREEN)
Phase 4: reviewer    → review report
Phase 5: security    → security clearance
```

**Key rule:** Each phase must complete before the next starts. Use agent outputs as inputs to the next phase by reading their result files.

---

## Pattern Auto-Selection

| Task Type | Recommended Pattern |
|-----------|-------------------|
| Multi-file review | Fan-Out → Fan-In |
| Architecture decision | Split-Role (3 roles) |
| Unknown codebase research | Explorer + Validator |
| Parallel feature development | Worktree Isolation |
| Full feature TDD cycle | Sequential Pipeline |
| Security + quality + tests | Parallel Fan-Out (3 specialist agents) |

## Failure Handling

- **Agent timeout:** Retry with reduced scope; split into smaller chunks if needed
- **Conflicting results:** Use a tiebreaker agent with both results as context
- **Partial failures:** Complete successful agents; re-run failed agents with error context
- **Context overflow:** Summarize intermediate results before passing to next phase

## Result Synthesis

When combining agent results:
1. Read all agent outputs
2. Identify agreements (high confidence)
3. Identify conflicts (need resolution)
4. Apply domain priority (security > quality > style)
5. Produce unified recommendation

## Token Budget Guidelines

| Pattern | Typical agent count | Context per agent |
|---------|-------------------|------------------|
| Fan-Out | 3-10 | Minimal (target-specific only) |
| Split-Role | 2-4 | Full task context |
| Explorer+Validator | 2 | Explorer: broad; Validator: targeted |
| Worktree | 2-5 | Feature-specific only |
| Pipeline | 3-7 | Output of previous stage |
