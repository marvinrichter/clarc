---
name: agent-reliability
description: "Agent Reliability Patterns: retry with exponential backoff and jitter, timeout hierarchies (tool < agent < workflow), fallback chains, circuit breaker for agent calls, cost control (token budgets, model tiering), rate limiting, and observability (what to log per agent call)."
---

# Agent Reliability

Production patterns for reliable, cost-efficient agent systems.

## When to Activate

- Building agents that call external APIs or other agents
- Configuring retry logic and timeout hierarchies
- Implementing fallback chains when primary agents fail
- Controlling cost with token budgets and model tiering
- Adding circuit breakers to isolate failing agent dependencies
- Setting up structured logging for agent observability

---

## Retry with Exponential Backoff + Jitter

```typescript
interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryableErrors?: (err: Error) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffFactor = 2,
    retryableErrors = isRetryable,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      if (attempt === maxAttempts || !retryableErrors(lastError)) {
        throw lastError;
      }

      // Exponential backoff with full jitter
      const exponential = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const capped = Math.min(exponential, maxDelayMs);
      const delay = Math.random() * capped;  // Full jitter

      console.warn(`Agent attempt ${attempt}/${maxAttempts} failed, retrying in ${delay.toFixed(0)}ms`, {
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError!;
}

function isRetryable(err: Error): boolean {
  // Retry on transient errors only
  if (err.message.includes('rate_limit_error')) return true;
  if (err.message.includes('overloaded_error')) return true;
  if (err.message.includes('529')) return true;  // API overloaded
  if (err.message.includes('timeout')) return true;
  return false;
  // Do NOT retry: invalid_request_error, authentication_error, permission_error
}
```

### Idempotency Check Before Retry

```typescript
// Ensure retried operations don't duplicate side effects
async function idempotentAgentCall(
  idempotencyKey: string,
  fn: () => Promise<string>
): Promise<string> {
  // Check if this key was already processed
  const cached = await cache.get(idempotencyKey);
  if (cached) return cached;

  const result = await withRetry(fn);

  // Store result with TTL to prevent duplicate processing
  await cache.setEx(idempotencyKey, 3600, result);
  return result;
}
```

---

## Timeout Hierarchies

```
Tool call timeout  <  Agent timeout  <  Workflow timeout
    5–30 seconds       30–120 seconds    5–30 minutes
```

```typescript
// Tool-level timeout (fastest, innermost)
async function callToolWithTimeout<T>(
  tool: () => Promise<T>,
  timeoutMs = 15000
): Promise<T> {
  return Promise.race([
    tool(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Agent-level timeout (wraps the full agent conversation loop)
async function runAgentWithTimeout<T>(
  agent: () => Promise<T>,
  timeoutMs = 60000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await agent();
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Agent timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Workflow-level timeout (outermost, controls entire pipeline)
const WORKFLOW_TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes

async function runWorkflow(goal: string): Promise<WorkflowResult> {
  return runAgentWithTimeout(async () => {
    const planResult = await runAgentWithTimeout(planningAgent, 30000);
    const implementResult = await runAgentWithTimeout(implementationAgent, 120000);
    const reviewResult = await runAgentWithTimeout(reviewAgent, 60000);
    return { plan: planResult, implementation: implementResult, review: reviewResult };
  }, WORKFLOW_TIMEOUT_MS);
}
```

---

## Fallback Chains

```typescript
type AgentFn<T> = () => Promise<T>;

async function fallbackChain<T>(
  agents: AgentFn<T>[],
  context: string
): Promise<T> {
  const errors: Error[] = [];

  for (const [i, agent] of agents.entries()) {
    try {
      const result = await agent();
      if (i > 0) {
        console.warn(`Used fallback agent #${i} for: ${context}`);
      }
      return result;
    } catch (err) {
      errors.push(err as Error);
      console.warn(`Agent ${i} failed: ${(err as Error).message}`);
    }
  }

  throw new Error(
    `All agents failed for: ${context}\n` +
    errors.map((e, i) => `  [${i}]: ${e.message}`).join('\n')
  );
}

// Example: Opus → Sonnet → Haiku fallback
const analysisWithFallback = () => fallbackChain([
  () => runWithModel('claude-opus-latest', task),      // Best quality
  () => runWithModel('claude-sonnet-latest', task),    // Balanced
  () => runWithModel('claude-haiku-latest', task, { simplified: true }),  // Fast, cheap
], 'code-analysis');
```

---

## Circuit Breaker

Isolate a failing agent dependency so failures don't cascade.

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeMs = 60000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker: HALF_OPEN — probing recovery');
      } else {
        throw new Error('Circuit breaker OPEN — agent calls rejected');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log('Circuit breaker: CLOSED — agent recovered');
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker: OPEN after ${this.failures} failures`);
    }
  }

  getState(): CircuitState { return this.state; }
}

// Usage
const codeReviewBreaker = new CircuitBreaker(5, 60_000);

async function safeCodeReview(code: string): Promise<string> {
  return codeReviewBreaker.call(() => codeReviewAgent.run(code));
}
```

---

## Observability — What to Log Per Agent Call

```typescript
interface AgentCallLog {
  // Identity
  traceId: string;
  spanId: string;
  agentName: string;
  model: string;

  // Input/Output summary (never log full content in production)
  inputTokens: number;
  outputTokens: number;
  inputPreview: string;  // First 100 chars only
  outputPreview: string;

  // Performance
  latencyMs: number;
  toolCallCount: number;
  retryCount: number;

  // Outcome
  success: boolean;
  errorType?: string;  // rate_limit | timeout | invalid | etc.
  stopReason: string;  // end_turn | tool_use | max_tokens | stop_sequence
}

function logAgentCall(log: AgentCallLog): void {
  // Structured JSON log for log aggregation tools
  console.log(JSON.stringify({
    type: 'agent_call',
    timestamp: new Date().toISOString(),
    ...log,
  }));

  // Emit metrics for dashboards
  metrics.histogram('agent.latency_ms', log.latencyMs, { agent: log.agentName });
  metrics.increment('agent.calls', { agent: log.agentName, success: String(log.success) });
  metrics.histogram('agent.tokens', log.inputTokens + log.outputTokens, { agent: log.agentName });
}
```

---

## Rate Limiting

> For general-purpose rate limiting patterns (sliding window, distributed rate limiting with Redis, per-user quotas) — see `resilience-patterns`. The token bucket below is specific to controlling Anthropic API call rates from agent code.

```typescript
// Token bucket rate limiter for API calls
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,        // Max burst
    private readonly refillRate: number,       // Tokens per ms
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(cost = 1): Promise<void> {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return;
    }

    // Wait for enough tokens
    const waitMs = (cost - this.tokens) / this.refillRate;
    await sleep(waitMs);
    this.tokens = 0;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// 10 requests/sec, burst up to 20
const rateLimiter = new TokenBucket(20, 10 / 1000);

async function rateLimitedAgentCall(fn: () => Promise<string>): Promise<string> {
  await rateLimiter.acquire();
  return fn();
}
```

---

## Cost Control

### Model Tiering Strategy

```typescript
type TaskComplexity = 'simple' | 'medium' | 'complex';

function selectModel(complexity: TaskComplexity): string {
  switch (complexity) {
    case 'simple':
      return 'claude-haiku-latest';  // ~3x cheaper, fast
    case 'medium':
      return 'claude-sonnet-latest';           // Default for coding
    case 'complex':
      return 'claude-opus-latest';             // Deep reasoning only
  }
}

// Classify complexity before selecting model
async function classifyTaskComplexity(task: string): Promise<TaskComplexity> {
  // Use cheap Haiku to decide if we need expensive Opus
  const response = await client.messages.create({
    model: 'claude-haiku-latest',
    system: 'Classify task complexity: reply with exactly "simple", "medium", or "complex".',
    messages: [{ role: 'user', content: task }],
    max_tokens: 10,
  });
  return response.content[0].text.trim() as TaskComplexity;
}
```

### Token Budget Enforcement

```typescript
interface TokenBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  warnAt: number;  // Fraction — e.g. 0.8 = warn at 80%
}

const AGENT_BUDGETS: Record<string, TokenBudget> = {
  'code-review': { maxInputTokens: 8000, maxOutputTokens: 2000, warnAt: 0.8 },
  'planning': { maxInputTokens: 4000, maxOutputTokens: 4000, warnAt: 0.8 },
  'summarization': { maxInputTokens: 16000, maxOutputTokens: 500, warnAt: 0.9 },
};

function enforceTokenBudget(
  agentName: string,
  inputTokens: number,
  maxOutputTokens: number
): number {
  const budget = AGENT_BUDGETS[agentName];
  if (!budget) return maxOutputTokens;

  if (inputTokens > budget.maxInputTokens) {
    throw new Error(`Input exceeds budget for ${agentName}: ${inputTokens} > ${budget.maxInputTokens}`);
  }
  if (inputTokens > budget.maxInputTokens * budget.warnAt) {
    console.warn(`Token budget warning for ${agentName}: ${inputTokens}/${budget.maxInputTokens} input tokens`);
  }

  return Math.min(maxOutputTokens, budget.maxOutputTokens);
}
```

---

For anti-patterns (retrying non-retryable errors, fixed sleep vs jitter, single timeout for all levels, circuit breaker threshold calibration, model over-selection), see skill `agent-reliability-advanced`.

## Reference

- `multi-agent-patterns` — orchestration, routing, parallelization, handoffs
- `observability` — OpenTelemetry, distributed tracing, production metrics
