---
name: multi-agent-patterns-advanced
description: "Advanced multi-agent patterns — capability registry, durable state (Redis/DynamoDB), task decomposition, testing multi-agent systems, pattern quick-selection guide, failure handling, cost management, and worktree isolation. Extends multi-agent-patterns."
---

# Multi-Agent Patterns — Advanced

> See the core `multi-agent-patterns` skill for basics: orchestration vs choreography, intent classification routing, in-memory state, handoffs, fan-out/fan-in, Claude SDK loop, and observability.

## When to Activate

- Building a capability registry for dynamic agent dispatch
- Implementing durable cross-agent state (Redis, DynamoDB event log)
- Decomposing complex goals into parallel and sequential sub-tasks
- Writing deterministic tests for multi-agent workflows
- Selecting the right pattern from the quick-selection guide
- Managing failure modes across agent boundaries
- Controlling token cost in large multi-agent systems
- Isolating parallel file-editing agents with git worktrees

---

## Advanced Tool Routing: Capability Registry

```typescript
interface AgentCapability {
  id: string;
  description: string;
  inputSchema: z.ZodSchema;
  agent: (input: unknown) => Promise<AgentResult>;
}

const capabilities: AgentCapability[] = [
  {
    id: 'analyze_code',
    description: 'Review code for bugs, style, and security issues',
    inputSchema: z.object({ code: z.string(), language: z.string() }),
    agent: codeReviewAgent,
  },
  {
    id: 'generate_tests',
    description: 'Generate unit tests for a function or class',
    inputSchema: z.object({ code: z.string(), framework: z.string() }),
    agent: tddAgent,
  },
];

// Pass registry to orchestrator as tools
const tools = capabilities.map(cap => ({
  name: cap.id,
  description: cap.description,
  input_schema: zodToJsonSchema(cap.inputSchema),
}));
```

---

## Durable State

### External Store (Redis)

```typescript
// Redis for durable cross-agent state
import { createClient } from 'redis';

const redis = createClient();

async function saveAgentState(workflowId: string, state: WorkflowState): Promise<void> {
  await redis.setEx(
    `workflow:${workflowId}`,
    3600,  // 1 hour TTL
    JSON.stringify(state)
  );
}

async function loadAgentState(workflowId: string): Promise<WorkflowState | null> {
  const raw = await redis.get(`workflow:${workflowId}`);
  return raw ? JSON.parse(raw) : null;
}
```

### Event Log (Append-Only, Auditable)

```typescript
// DynamoDB event log for full audit trail
async function appendEvent(workflowId: string, event: WorkflowEvent): Promise<void> {
  await dynamodb.put({
    TableName: 'workflow-events',
    Item: {
      workflowId,
      timestamp: Date.now(),
      sequenceNumber: await getNextSequence(workflowId),
      event,
    },
  });
}

// Reconstruct state by replaying events
async function replayWorkflow(workflowId: string): Promise<WorkflowState> {
  const events = await queryAllEvents(workflowId);
  return events.reduce(applyEvent, initialState());
}
```

---

## Task Decomposition Handoff

```typescript
interface SubTask {
  id: string;
  description: string;
  dependsOn: string[];  // IDs of tasks that must complete first
  agent: string;
}

async function decomposeTasks(goal: string): Promise<SubTask[]> {
  const response = await claude.messages.create({
    model: 'claude-opus-latest',  // Opus for complex planning
    system: 'Decompose the goal into parallel and sequential sub-tasks. Output JSON.',
    messages: [{ role: 'user', content: goal }],
    max_tokens: 2048,
  });
  return JSON.parse(response.content[0].text);
}
```

---

## Testing Multi-Agent Systems

```typescript
// Mock sub-agents for deterministic tests
class MockAgent {
  constructor(private responses: Map<string, string>) {}

  async run(input: string): Promise<string> {
    const key = [...this.responses.keys()].find(k => input.includes(k));
    if (!key) throw new Error(`No mock response for input: ${input}`);
    return this.responses.get(key)!;
  }
}

describe('Orchestrator', () => {
  it('routes code review tasks to code-review agent', async () => {
    const mockCodeReviewer = new MockAgent(new Map([
      ['review this function', '{ "issues": [] }'],
    ]));

    const orchestrator = new Orchestrator({
      agents: { 'code-review': mockCodeReviewer },
    });

    const result = await orchestrator.run('Please review this function: ...');
    expect(result).toContain('issues');
  });

  it('handles partial failures gracefully', async () => {
    const failingAgent = { run: () => Promise.reject(new Error('timeout')) };
    const fallbackAgent = new MockAgent(new Map([['', 'fallback result']]));

    const result = await runWithFallback(
      () => failingAgent.run(),
      () => fallbackAgent.run(''),
      1
    );
    expect(result).toBe('fallback result');
  });
});
```

---

## Worktree Isolation

When multiple agents edit files in parallel, use git worktrees to prevent conflicts:

```bash
# Create isolated worktrees for parallel agents
git worktree add ../feature-agent-1 -b agent/feature-1
git worktree add ../feature-agent-2 -b agent/feature-2

# Each agent works in its own directory — no conflicts
# After completion, merge results back
git merge agent/feature-1
git merge agent/feature-2

# Clean up
git worktree remove ../feature-agent-1
git worktree remove ../feature-agent-2
```

**When to use:** Any orchestration pattern where 2+ agents modify files concurrently (parallel feature development, multi-file refactors).

---

## Pattern Quick-Selection & Token Budget

| Task Type | Pattern | Agents | Context per agent |
|-----------|---------|--------|-------------------|
| Multi-file review | Fan-Out → Fan-In | 3–10 | Minimal (target-specific) |
| Architecture decision | Split-Role | 2–4 | Full task context |
| Unknown codebase research | Explorer + Validator | 2 | Explorer: broad; Validator: targeted |
| Parallel feature development | Worktree Isolation | 2–5 | Feature-specific only |
| Full feature TDD cycle | Sequential Pipeline | 3–7 | Output of previous stage |
| Security + quality + tests | Parallel Fan-Out | 3 | Specialist context only |

---

## Failure Handling & Result Synthesis

| Scenario | Action |
|----------|--------|
| Agent timeout | Retry with reduced scope; split task into smaller chunks |
| Conflicting results | Pass both to a tiebreaker agent; apply: security > quality > style |
| Partial failures | Complete successful agents; re-run failed with error context |
| Context overflow | Summarize intermediate results before passing to next stage |

---

## Cost Management

- Use **Haiku** for routing, summarization, and classification (high-frequency, low-complexity)
- Use **Sonnet** for main agent work (default)
- Use **Opus** only for planning and architectural decisions
- Pass minimal context per agent — compress handoffs with Summary Handoff pattern
- Set `max_tokens` budgets per agent tier to cap runaway costs
- Use `parallelWithConcurrencyLimit` (default: 5) to avoid rate-limit overages

> For the base patterns (orchestrator loop, fan-out, error handling, observability) see `multi-agent-patterns`.
