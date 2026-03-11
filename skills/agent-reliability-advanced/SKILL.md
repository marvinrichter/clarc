---
name: agent-reliability-advanced
description: Agent reliability anti-patterns — retrying non-retryable errors, fixed sleep vs exponential backoff with jitter, single timeout for all call stack levels, aggressive circuit breaker thresholds, using Opus for every call regardless of complexity.
---

# Agent Reliability — Anti-Patterns

This skill extends `agent-reliability` with common mistakes and how to fix them. Load `agent-reliability` first.

## When to Activate

- Retry logic catches authentication or validation errors (not just transient ones)
- All agent calls use the same fixed sleep delay on failure
- A single global timeout governs tool calls, agent calls, and entire workflows
- Circuit breaker opens after every single failure
- Every agent call uses the most expensive model regardless of task complexity

---

## Anti-Patterns

### Retrying Non-Retryable Errors (Auth, Validation)

**Wrong:**

```typescript
async function callAgent(fn: () => Promise<string>): Promise<string> {
  for (let i = 0; i < 3; i++) {
    try { return await fn() }
    catch { await sleep(1000) }  // retries authentication errors — wastes 3 seconds
  }
  throw new Error('failed')
}
```

**Correct:**

```typescript
function isRetryable(err: Error): boolean {
  if (err.message.includes('rate_limit_error')) return true
  if (err.message.includes('overloaded_error')) return true
  // authentication_error, invalid_request_error — do NOT retry
  return false
}

async function callAgent(fn: () => Promise<string>): Promise<string> {
  return withRetry(fn, { retryableErrors: isRetryable })
}
```

**Why:** Retrying authentication or validation errors wastes time, inflates cost, and can trigger account lockouts — only transient infrastructure errors warrant retry.

---

### Fixed Sleep Instead of Exponential Backoff with Jitter

**Wrong:**

```typescript
for (let i = 0; i < 3; i++) {
  try { return await agentCall() }
  catch { await sleep(5000) }  // fixed delay — thundering herd when many clients retry at once
}
```

**Correct:**

```typescript
const exponential = initialDelayMs * Math.pow(backoffFactor, attempt - 1)
const capped = Math.min(exponential, maxDelayMs)
const delay = Math.random() * capped  // full jitter — spreads retry load
await sleep(delay)
```

**Why:** Fixed retry intervals cause synchronized retry storms when many clients fail simultaneously; jitter spreads the load and reduces API overload cascades.

---

### Using the Same Timeout for All Levels of the Call Stack

**Wrong:**

```typescript
const TIMEOUT_MS = 30000

const result = await Promise.race([
  runWorkflow(goal),       // whole workflow — 30s is far too short
  sleep(TIMEOUT_MS).then(() => { throw new Error('timeout') }),
])
```

**Correct:**

```typescript
// Nested timeouts — each level has its own proportional budget
const toolResult = await callToolWithTimeout(tool, 15_000)   // tool: 15s
const agentResult = await runAgentWithTimeout(agent, 60_000) // agent: 60s
const workflowResult = await runAgentWithTimeout(           // workflow: 10min
  () => runWorkflow(goal), 10 * 60 * 1000
)
```

**Why:** A single shared timeout either aborts long workflows prematurely or lets runaway tool calls consume the entire budget — layered timeouts bound each level independently.

---

### Opening a Circuit Breaker Too Aggressively (Low Threshold)

**Wrong:**

```typescript
const breaker = new CircuitBreaker(1, 60_000)  // opens after a single failure
// One transient error now blocks all subsequent calls for 60 seconds
```

**Correct:**

```typescript
const breaker = new CircuitBreaker(5, 60_000)  // opens after 5 consecutive failures
// Transient errors are retried; the circuit opens only on sustained failure
```

**Why:** A threshold of 1 treats every transient error as a sustained outage, causing unnecessary downtime; calibrate the threshold to distinguish spikes from real failures.

---

### Using Opus for Every Agent Call Regardless of Complexity

**Wrong:**

```typescript
async function classifyTaskComplexity(task: string): Promise<TaskComplexity> {
  const response = await client.messages.create({
    model: 'claude-opus-latest',  // ~15x cost of Haiku for a three-word answer
    system: 'Reply with "simple", "medium", or "complex".',
    messages: [{ role: 'user', content: task }],
    max_tokens: 10,
  })
  return response.content[0].text.trim() as TaskComplexity
}
```

**Correct:**

```typescript
async function classifyTaskComplexity(task: string): Promise<TaskComplexity> {
  const response = await client.messages.create({
    model: 'claude-haiku-latest',  // lightweight model for lightweight classification
    system: 'Reply with exactly "simple", "medium", or "complex".',
    messages: [{ role: 'user', content: task }],
    max_tokens: 10,
  })
  return response.content[0].text.trim() as TaskComplexity
}
```

**Why:** Model selection should match task complexity — using Opus for trivial routing wastes budget that should be reserved for tasks requiring deep reasoning.

## Reference

- `agent-reliability` — retry with exponential backoff, timeout hierarchies, fallback chains, circuit breaker, cost control, observability
- `multi-agent-patterns` — orchestration, routing, parallelization, handoffs
