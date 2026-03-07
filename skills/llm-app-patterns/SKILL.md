---
name: llm-app-patterns
description: "LLM application architecture: orchestration patterns, fallback chains, streaming responses, human-in-the-loop, guardrails, latency optimization, and observability. For teams building production AI features beyond simple single-shot API calls."
---

# LLM App Patterns Skill

## When to Activate

- Building multi-step LLM pipelines (chaining calls, conditional routing)
- Adding AI features to an existing application
- Reliability or cost concerns (retries, fallbacks, caching)
- Implementing streaming responses to the client
- Adding guardrails (input validation, output filtering, content policy)
- Designing human-in-the-loop review flows
- Debugging latency spikes or unexpected LLM errors in production

---

## Orchestration Patterns

### Sequential chain

Each step's output becomes the next step's input.

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function classifyThenRespond(userMessage: string): Promise<string> {
  // Step 1 — classify intent (fast model)
  const classifyResponse = await client.messages.create({
    model: 'claude-haiku-latest',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Classify intent as one of: question|complaint|request|other.\nMessage: ${userMessage}\nIntent:`,
    }],
  });
  const intent = classifyResponse.content[0].text.trim();

  // Step 2 — generate response using intent as context (balanced model)
  const replyResponse = await client.messages.create({
    model: 'claude-sonnet-latest',
    max_tokens: 512,
    system: `You handle customer ${intent}s for an e-commerce platform.`,
    messages: [{ role: 'user', content: userMessage }],
  });

  return replyResponse.content[0].text;
}
```

### Parallel fan-out / fan-in

Invoke multiple LLM calls concurrently, then merge results.

```typescript
async function parallelReview(code: string): Promise<ReviewResult> {
  const [security, quality, performance] = await Promise.all([
    reviewSecurity(code),
    reviewQuality(code),
    reviewPerformance(code),
  ]);

  return mergeReviews({ security, quality, performance });
}
```

### Conditional routing

Route to different prompts/models based on classification.

```typescript
const routes: Record<string, (msg: string) => Promise<string>> = {
  question:   (msg) => answerQuestion(msg),
  complaint:  (msg) => escalateComplaint(msg),
  request:    (msg) => handleRequest(msg),
  other:      (msg) => genericResponse(msg),
};

async function route(message: string): Promise<string> {
  const intent = await classify(message);
  const handler = routes[intent] ?? routes['other'];
  return handler(message);
}
```

### Retry with exponential backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      // Only retry on rate limits (429) or server errors (5xx)
      const status = (error as { status?: number }).status;
      if (status && status < 429) throw error;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('unreachable');
}

// Usage
const result = await withRetry(() => client.messages.create({ ... }));
```

---

## Fallback Chains

Degrade gracefully when the primary model or approach fails.

```typescript
type ModelTier = 'opus' | 'sonnet' | 'haiku';

const MODEL_FALLBACK: Record<ModelTier, string> = {
  opus:   'claude-opus-latest',
  sonnet: 'claude-sonnet-latest',
  haiku:  'claude-haiku-latest',
};

async function withModelFallback(
  params: Anthropic.MessageCreateParams,
  tiers: ModelTier[] = ['sonnet', 'haiku'],
): Promise<Anthropic.Message> {
  for (const tier of tiers) {
    try {
      return await client.messages.create({ ...params, model: MODEL_FALLBACK[tier] });
    } catch (error) {
      const status = (error as { status?: number }).status;
      // Fallback on rate limit or server error, not on auth or validation errors
      if (status && (status === 400 || status === 401)) throw error;
      if (tier === tiers[tiers.length - 1]) throw error;
      console.warn(`Model ${tier} failed, falling back…`);
    }
  }
  throw new Error('All model tiers failed');
}

// Cache fallback — return last successful response
const responseCache = new Map<string, string>();

async function withCacheFallback(prompt: string): Promise<string> {
  try {
    const response = await callLLM(prompt);
    responseCache.set(prompt, response);
    return response;
  } catch {
    const cached = responseCache.get(prompt);
    if (cached) return cached;
    return 'Service temporarily unavailable. Please try again later.'; // static fallback
  }
}
```

---

## Streaming

Stream tokens to the client to reduce perceived latency.

### Server-Sent Events (Node.js / Express)

```typescript
import express from 'express';

const app = express();

app.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await client.messages.create({
    model: 'claude-sonnet-latest',
    max_tokens: 1024,
    stream: true,
    messages: [{ role: 'user', content: req.query.prompt as string }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

### Abort handling

```typescript
const controller = new AbortController();

// Cancel stream if client disconnects
req.on('close', () => controller.abort());

const stream = await client.messages.create(
  { model: 'claude-sonnet-latest', max_tokens: 1024, stream: true, messages: [...] },
  { signal: controller.signal },
);
```

### Partial JSON parsing (for structured streaming output)

```typescript
import { createParser } from 'eventsource-parser';

let buffer = '';

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    buffer += chunk.delta.text;

    // Try to parse partial JSON as soon as closing brace appears
    if (buffer.includes('}')) {
      try {
        const partial = JSON.parse(buffer);
        onPartialResult(partial);
      } catch {
        // Not yet complete JSON — keep buffering
      }
    }
  }
}
```

---

## Human-in-the-Loop

### When to pause for human review

- Confidence score below threshold
- High-stakes actions (send email, delete data, charge payment)
- Content policy flags
- Ambiguous intent classification

### Approval queue pattern

```typescript
interface PendingAction {
  id: string;
  userId: string;
  action: string;
  payload: unknown;
  llmReasoning: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

async function requestApproval(action: string, payload: unknown, reasoning: string): Promise<void> {
  const pending: PendingAction = {
    id: crypto.randomUUID(),
    userId: currentUserId(),
    action,
    payload,
    llmReasoning: reasoning,
    createdAt: new Date(),
    status: 'pending',
  };

  await db.insert(pendingActions).values(pending);

  // Notify human reviewer (Slack, email, dashboard)
  await notify.reviewRequired(pending);
}

// Resume endpoint (called by human reviewer)
app.post('/approve/:id', async (req, res) => {
  const pending = await db.findPendingAction(req.params.id);
  await db.updatePendingAction(req.params.id, { status: 'approved' });
  await executeAction(pending.action, pending.payload);
  res.json({ ok: true });
});
```

### Async resume with webhook

Design stateful pipelines that can pause and resume:

```typescript
// Pipeline step: pause if low confidence
if (confidence < 0.8) {
  await savePipelineState({ stepId: 'classify', state, sessionId });
  await requestApproval(action, payload, reasoning);
  return; // Pause — resume via webhook
}

// Resume webhook
app.post('/webhook/approve', async (req, res) => {
  const { sessionId } = req.body;
  const state = await loadPipelineState(sessionId);
  await continuePipeline(state);
  res.json({ ok: true });
});
```

---

## Guardrails

### Input validation (before LLM call)

```typescript
function validateInput(input: string): { valid: boolean; reason?: string } {
  if (input.length > 10_000) return { valid: false, reason: 'Input too long (max 10,000 chars)' };
  if (containsPII(input)) return { valid: false, reason: 'Input contains personal data' };
  if (containsPromptInjection(input)) return { valid: false, reason: 'Suspicious input pattern' };
  return { valid: true };
}

function containsPromptInjection(input: string): boolean {
  const patterns = [
    /ignore previous instructions/i,
    /you are now/i,
    /system prompt/i,
    /\[INST\]/i,
  ];
  return patterns.some(p => p.test(input));
}
```

### Output validation (after LLM call)

```typescript
function validateOutput(output: string, schema: JSONSchema): ValidationResult {
  // 1. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return { valid: false, reason: 'Output is not valid JSON' };
  }

  // 2. Schema validation
  const result = ajv.validate(schema, parsed);
  if (!result) return { valid: false, reason: ajv.errorsText() };

  // 3. Business rule validation
  if (!isBusinessRuleCompliant(parsed)) return { valid: false, reason: 'Business rule violation' };

  return { valid: true, parsed };
}
```

### Content filter integration

```typescript
import Anthropic from '@anthropic-ai/sdk';

// Claude's built-in safety measures handle most cases
// For additional content filtering, check stop_reason
const response = await client.messages.create({ ... });

if (response.stop_reason === 'end_turn') {
  // Normal completion
} else if (response.stop_reason === 'max_tokens') {
  // Truncated — may need to continue
} else {
  // Unexpected stop — log and inspect
  console.warn('Unexpected stop_reason:', response.stop_reason);
}
```

---

## Latency Optimization

### Prompt caching (Anthropic `cache_control`)

Dramatically reduce latency and cost for repeated long system prompts.

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-latest',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: veryLongSystemPrompt,           // cached after first call
      cache_control: { type: 'ephemeral' }, // TTL: 5 minutes
    },
  ],
  messages: [{ role: 'user', content: userMessage }],
});

// Check cache hit in response
console.log(response.usage.cache_read_input_tokens);   // tokens served from cache
console.log(response.usage.cache_creation_input_tokens); // tokens written to cache
```

### Parallel calls

Fan out independent LLM calls rather than awaiting sequentially.

```typescript
// Bad — sequential (slow)
const a = await callLLM(promptA);
const b = await callLLM(promptB);

// Good — parallel
const [a, b] = await Promise.all([callLLM(promptA), callLLM(promptB)]);
```

### Model selection by task complexity

| Task | Model tier |
|------|-----------|
| Classification, extraction, simple Q&A | Haiku (fast, cheap) |
| Code generation, summarization, analysis | Sonnet (balanced) |
| Complex reasoning, architecture decisions | Opus (most capable) |

### Streaming vs. batch

- **Streaming**: Always use for user-facing interactive UIs — reduces perceived latency
- **Batch**: Use for background jobs, bulk processing, and eval runs

---

## Observability

Log these fields for every LLM call:

```typescript
interface LLMCallLog {
  traceId: string;          // Correlate across a multi-step pipeline
  model: string;
  promptVersion: string;    // e.g., "v2"
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  latencyMs: number;
  costUsd: number;          // Estimate based on token counts
  stopReason: string;
  error?: string;
}

async function tracedLLMCall(params: Anthropic.MessageCreateParams): Promise<Anthropic.Message> {
  const start = Date.now();
  const traceId = currentTraceId();

  try {
    const response = await client.messages.create(params);
    const latencyMs = Date.now() - start;

    await log.info('llm_call', {
      traceId,
      model: params.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      latencyMs,
      costUsd: estimateCost(params.model, response.usage),
      stopReason: response.stop_reason,
    });

    return response;
  } catch (error) {
    await log.error('llm_call_failed', { traceId, error: String(error), latencyMs: Date.now() - start });
    throw error;
  }
}
```

### Key metrics to monitor

| Metric | Alert threshold |
|--------|----------------|
| `llm_latency_p99` | > 10s |
| `llm_error_rate` | > 1% |
| `llm_cost_daily_usd` | > budget |
| `guardrail_block_rate` | > 5% (may indicate prompt injection attempts) |
| `cache_hit_rate` | < 50% (indicates inefficient prompt structure) |

---

## Checklist

- [ ] Retry with exponential backoff on 429 / 5xx
- [ ] Model fallback chain configured
- [ ] Static fallback response for total outage
- [ ] Streaming used for all user-facing responses
- [ ] Prompt caching enabled for long/stable system prompts
- [ ] Input validated before LLM call (length, PII, injection patterns)
- [ ] Output validated against schema after LLM call
- [ ] Human approval queue for high-stakes actions
- [ ] Every LLM call logs traceId, tokens, latency, cost
- [ ] Alerts on error rate, latency P99, and daily cost
- [ ] `max_tokens` set on every call
