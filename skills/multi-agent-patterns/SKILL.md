---
name: multi-agent-patterns
description: "Multi-Agent Systems: orchestration vs choreography, tool routing, state management, agent handoffs, parallelization (fan-out/fan-in), error handling in multi-agent workflows, Claude SDK patterns (Agent/Tool/Handoff), and observability with OpenTelemetry."
---

# Multi-Agent Patterns

Patterns for building reliable, scalable multi-agent systems with Claude.

## When to Activate

- Designing a system where multiple Claude agents collaborate
- Implementing task decomposition with parallel sub-agents
- Routing tasks between specialized agents (router/dispatcher patterns)
- Managing state across agent invocations
- Building reliable agent-to-agent handoffs
- Adding observability (tracing, latency) across agent boundaries

---

## Orchestration vs. Choreography

```
Orchestration (Central Control)          Choreography (Decentralized Events)
─────────────────────────────────        ─────────────────────────────────────
        Orchestrator                      Agent A ──event──▶ Agent B
       /     |     \                      Agent B ──event──▶ Agent C
   Agent A  Agent B  Agent C             (no central coordinator)

WHEN: Clear workflow, sequential steps   WHEN: Loose coupling, event-driven, scaling
      easy to debug and reason about            independent microservices
```

**Choose Orchestration when:**
- Workflow steps are known in advance
- You need a single audit trail
- Failure handling requires central coordination
- Order of execution matters

**Choose Choreography when:**
- Services must remain independent
- New consumers can subscribe without modifying producers
- Eventual consistency is acceptable
- Scale requires horizontal distribution

---

## Tool Routing

The orchestrator decides which agent/tool handles a task.

### Intent Classification Router

```typescript
// Claude as router — classify then dispatch
const AGENT_REGISTRY = {
  'code-review': codeReviewAgent,
  'security-scan': securityAgent,
  'test-generation': tddAgent,
  'documentation': docAgent,
};

async function route(task: string, context: string): Promise<AgentResult> {
  const classification = await claude.messages.create({
    model: 'claude-haiku-latest',  // Haiku for lightweight routing
    system: `Classify the task into one of: ${Object.keys(AGENT_REGISTRY).join(', ')}.
             Reply with ONLY the category name.`,
    messages: [{ role: 'user', content: task }],
    max_tokens: 10,
  });

  const category = classification.content[0].text.trim();
  const agent = AGENT_REGISTRY[category];

  if (!agent) throw new Error(`No agent for category: ${category}`);
  return agent.run(task, context);
}
```

### Capability Registry

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

## State Management

Where does state live between agent calls?

### In-Memory (Short-Lived Workflows)

```typescript
interface WorkflowState {
  taskId: string;
  input: string;
  steps: StepResult[];
  metadata: Record<string, unknown>;
}

class WorkflowContext {
  private state: WorkflowState;

  constructor(taskId: string, input: string) {
    this.state = { taskId, input, steps: [], metadata: {} };
  }

  addStep(name: string, result: unknown): void {
    this.state.steps.push({ name, result, timestamp: Date.now() });
  }

  getLastResult(): unknown {
    return this.state.steps.at(-1)?.result;
  }

  toHandoffSummary(): string {
    // Compress context for sub-agent handoffs
    return `Task: ${this.state.input}\n` +
      `Completed: ${this.state.steps.map(s => s.name).join(', ')}\n` +
      `Last result: ${JSON.stringify(this.getLastResult())}`;
  }
}
```

### External Store (Durable State)

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

## Handoff Patterns

### Full Context Handoff

Pass the complete conversation history to the next agent — use when the sub-agent needs full context.

```typescript
async function handoffWithFullContext(
  conversation: Message[],
  nextAgentSystem: string
): Promise<string> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-latest',
    system: nextAgentSystem,
    messages: conversation,  // Full history passed through
    max_tokens: 4096,
  });
  return response.content[0].text;
}
```

### Summary Handoff

Compress context before handoff — use for long workflows or to save tokens.

```typescript
async function summarizeForHandoff(
  context: WorkflowContext,
  maxTokens = 500
): Promise<string> {
  const summary = await claude.messages.create({
    model: 'claude-haiku-latest',  // Haiku for cheap summarization
    system: 'Summarize the key findings and decisions. Be concise.',
    messages: [{
      role: 'user',
      content: `Summarize this workflow progress for handoff to next agent:\n${context.toHandoffSummary()}`,
    }],
    max_tokens: maxTokens,
  });
  return summary.content[0].text;
}
```

### Task Decomposition Handoff

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

## Parallelization (Fan-Out / Fan-In)

```typescript
async function parallelReview(codeFiles: string[]): Promise<ReviewResult[]> {
  // Fan-out: launch all reviews concurrently
  const reviewPromises = codeFiles.map(file =>
    reviewAgent.run(file).catch(err => ({
      file,
      error: err.message,
      issues: [],
    }))
  );

  // Fan-in: collect results
  const results = await Promise.allSettled(reviewPromises);

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return { file: codeFiles[i], error: result.reason.message, issues: [] };
  });
}

// Controlled parallelism (avoid rate limits)
async function parallelWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency = 5
): Promise<T[]> {
  const results: T[] = [];
  const chunks = [];

  for (let i = 0; i < tasks.length; i += concurrency) {
    chunks.push(tasks.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(t => t()));
    results.push(...chunkResults);
  }

  return results;
}
```

---

## Error Handling in Multi-Agent Systems

### Retry with Fallback Agent

```typescript
async function runWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await primary();
    } catch (err) {
      if (attempt === maxRetries) {
        console.warn(`Primary agent failed after ${maxRetries} retries, using fallback`);
        return fallback();
      }
      await backoff(attempt);
    }
  }
  throw new Error('Unreachable');
}

// Partial results: continue with what succeeded
async function collectPartialResults<T>(
  tasks: Promise<T>[],
  minRequired: number
): Promise<T[]> {
  const results = await Promise.allSettled(tasks);
  const successes = results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);

  if (successes.length < minRequired) {
    throw new Error(`Only ${successes.length}/${tasks.length} tasks succeeded (need ${minRequired})`);
  }
  return successes;
}
```

---

## Claude Agent SDK Patterns

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Tool-based agent routing via tool_use
async function orchestratorLoop(goal: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: goal }
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-latest',
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      tools: AVAILABLE_TOOLS,
      messages,
      max_tokens: 4096,
    });

    if (response.stop_reason === 'end_turn') {
      return response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
          .map(async (toolUse) => ({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: await executeTool(toolUse.name, toolUse.input),
          }))
      );

      messages.push({ role: 'user', content: toolResults });
    }
  }
}
```

---

## Observability

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('multi-agent-system');

async function tracedAgentCall<T>(
  agentName: string,
  task: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(`agent.${agentName}`, async (span) => {
    span.setAttributes({
      'agent.name': agentName,
      'agent.task.length': task.length,
      'agent.task.preview': task.slice(0, 100),
    });

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}

// Log key agent metrics
function logAgentCall(event: {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolCalls: number;
  success: boolean;
}): void {
  console.log(JSON.stringify({
    type: 'agent_call',
    ...event,
    timestamp: new Date().toISOString(),
  }));
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

## Reference

- `agent-reliability` — retry strategies, circuit breakers, timeout hierarchies, cost control
- `autonomous-loops` — long-running agent loop patterns
- `observability` — OpenTelemetry setup for production tracing
