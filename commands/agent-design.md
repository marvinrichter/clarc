---
description: Guided workshop for designing a multi-agent system — task decomposition, agent roles, orchestration pattern, pseudocode, and failure handling strategy
---

# Agent Design Command

Design a multi-agent system for: $ARGUMENTS

## When to Use This vs /orchestrator-design

| | `/agent-design` | `/orchestrator-design` |
|---|---|---|
| **Style** | Interactive workshop — multi-step, guided | Direct delegation — one-shot output |
| **User involvement** | High — validates decomposition, refines pattern | Low — goal in, design document out |
| **Output** | Design reviewed interactively in conversation | Saved to `docs/architecture/<name>-orchestration.md` |
| **Use when** | Requirements are fuzzy or first-time design | Requirements are clear, want artifact fast |

## Your Task

Guide the user through a structured multi-agent system design workshop. Delegate deep architectural work to the `orchestrator-designer` agent, then validate and refine the output interactively.

## Step 1 — Capture Requirements

Ask the user (or infer from $ARGUMENTS):

1. **Goal** — What is the end-to-end workflow? What goes in, what comes out?
2. **Constraints**
   - Latency budget (real-time vs. batch)
   - Cost sensitivity (how many agent calls per workflow run?)
   - Reliability requirements (can it fail and retry, or must it be near-perfect?)
3. **External dependencies** — APIs, databases, file systems, human approvals?
4. **Failure tolerance** — Is partial output acceptable? Or must it be all-or-nothing?

## Step 2 — Delegate to Orchestrator Designer

Invoke the `orchestrator-designer` agent with the full requirements:

```
[Invoke orchestrator-designer agent with]:
Goal: [user's goal]
Constraints: [latency, cost, reliability]
External dependencies: [list]
Failure tolerance: [all-or-nothing / partial OK / degrade gracefully]
```

The agent will produce:
- Task decomposition + dependency graph
- Agent role definitions with model tier recommendations
- Orchestration pattern selection (orchestration vs. choreography vs. mixed)
- Failure mode analysis per agent
- Implementation pseudocode
- Cost estimate

## Step 3 — Validate with User

Review the orchestrator-designer output and confirm:

- [ ] **Task decomposition** — Does the breakdown match the user's mental model?
- [ ] **Model tiers** — Are expensive models (Opus) used only where deep reasoning is needed?
- [ ] **Parallelization** — Are independent tasks actually run in parallel?
- [ ] **Timeout hierarchy** — Tool < Agent < Workflow (never inverted)?
- [ ] **Idempotency** — Are all agent calls safe to retry?
- [ ] **State management** — Is the state strategy appropriate for the durability needed?

Highlight any concerns. Ask user to confirm or adjust.

## Step 4 — Refine Orchestration Pattern

Based on user feedback, clarify the chosen pattern:

**If Orchestration:**
```typescript
// Show the orchestrator loop skeleton
async function orchestrate(goal: string): Promise<Result> {
  const messages = [{ role: 'user', content: goal }];

  while (true) {
    const response = await claude.messages.create({
      model: 'claude-sonnet-latest',
      tools: AGENT_TOOLS,  // Sub-agents registered as tools
      messages,
    });

    if (response.stop_reason === 'end_turn') return parseResult(response);

    // Execute tool calls (sub-agent calls)
    const results = await executeTools(response.content);
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: results });
  }
}
```

**If Choreography:**
```
Event: [trigger event]
  → Handler A: [action + emits event B]
  → Handler B: [action + emits event C]
  → Handler C: [final action]

Compensation:
  On event B-failed: [compensation for A's action]
```

## Step 5 — Error Handling + Testing Strategy

Define:

**For each agent:**
- Primary failure → [Retry / Fallback / Compensate]
- Retry strategy → [max attempts, backoff, idempotency key]
- Fallback → [simpler agent / cached result / graceful degrade]

**Testing plan:**
- Unit: mock sub-agents, test orchestrator routing logic
- Integration: real agents with test inputs, verify output schema
- Chaos: inject failures in each sub-agent, verify recovery

## Step 6 — Output Design Document

Produce a concise design document:

```markdown
## Multi-Agent System: [Name]

**Goal:** [one sentence]
**Pattern:** [Orchestration / Choreography / Mixed]
**Model budget:** [Haiku N calls + Sonnet N calls + Opus N calls per run]

### Architecture
[ASCII dependency graph]

### Agents
| Agent | Model | Responsibility | Timeout |
|-------|-------|----------------|---------|
...

### Orchestrator Pseudocode
[Key code skeleton]

### Failure Strategy
[Per-agent table]

### State
[In-memory / Redis / DynamoDB — what and why]

### Next Steps
1. [ ] Implement agent tools as TypeScript functions
2. [ ] Set up retry + circuit breaker wrapper
3. [ ] Add OpenTelemetry tracing at agent boundaries
4. [ ] Write mock-agent unit tests for orchestrator
5. [ ] Set up token budget monitoring
```

## Reference Skills

- `multi-agent-patterns` — orchestration vs. choreography, handoffs, parallelization
- `agent-reliability` — retry, timeouts, circuit breaker, cost control
- `observability` — tracing across agent boundaries
