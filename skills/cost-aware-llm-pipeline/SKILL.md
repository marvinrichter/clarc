---
name: cost-aware-llm-pipeline
description: Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching.
---

# Cost-Aware LLM Pipeline

Patterns for controlling LLM API costs while maintaining quality. Combines model routing, budget tracking, retry logic, and prompt caching into a composable pipeline.

## When to Activate

- Building applications that call LLM APIs (Claude, GPT, etc.)
- Processing batches of items with varying complexity
- Need to stay within a budget for API spend
- Optimizing cost without sacrificing quality on complex tasks
- Designing a multi-model pipeline where simple classification tasks should use Haiku and complex reasoning tasks should escalate to Sonnet or Opus automatically
- Adding a hard budget cap to a batch processing job so it fails fast rather than silently overspending when processing hundreds or thousands of files
- Implementing prompt caching for a system prompt that is longer than 1024 tokens and is repeated on every API call in a high-volume pipeline
- Auditing an existing LLM integration that currently uses the most expensive model for all requests regardless of task complexity

## Core Concepts

### 1. Model Routing by Task Complexity

Automatically select cheaper models for simple tasks, reserving expensive models for complex ones.

```python
MODEL_SONNET = "claude-sonnet-latest"   # Balanced tier — check anthropic.com/api for current ID
MODEL_HAIKU = "claude-haiku-latest"    # Fast/lightweight tier — check anthropic.com/api for current ID

_SONNET_TEXT_THRESHOLD = 10_000  # chars
_SONNET_ITEM_THRESHOLD = 30     # items

def select_model(
    text_length: int,
    item_count: int,
    force_model: str | None = None,
) -> str:
    """Select model based on task complexity."""
    if force_model is not None:
        return force_model
    if text_length >= _SONNET_TEXT_THRESHOLD or item_count >= _SONNET_ITEM_THRESHOLD:
        return MODEL_SONNET  # Complex task
    return MODEL_HAIKU  # Simple task (3-4x cheaper)
```

### 2. Immutable Cost Tracking

Track cumulative spend with frozen dataclasses. Each API call returns a new tracker — never mutates state.

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CostRecord:
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float

@dataclass(frozen=True, slots=True)
class CostTracker:
    budget_limit: float = 1.00
    records: tuple[CostRecord, ...] = ()

    def add(self, record: CostRecord) -> "CostTracker":
        """Return new tracker with added record (never mutates self)."""
        return CostTracker(
            budget_limit=self.budget_limit,
            records=(*self.records, record),
        )

    @property
    def total_cost(self) -> float:
        return sum(r.cost_usd for r in self.records)

    @property
    def over_budget(self) -> bool:
        return self.total_cost > self.budget_limit
```

### 3. Narrow Retry Logic

Retry only on transient errors. Fail fast on authentication or bad request errors.

```python
from anthropic import (
    APIConnectionError,
    InternalServerError,
    RateLimitError,
)

_RETRYABLE_ERRORS = (APIConnectionError, RateLimitError, InternalServerError)
_MAX_RETRIES = 3

def call_with_retry(func, *, max_retries: int = _MAX_RETRIES):
    """Retry only on transient errors, fail fast on others."""
    for attempt in range(max_retries):
        try:
            return func()
        except _RETRYABLE_ERRORS:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
    # AuthenticationError, BadRequestError etc. → raise immediately
```

### 4. Prompt Caching

Cache long system prompts to avoid resending them on every request.

**Requirements:**
- Minimum cacheable block: **1024 tokens** (~750 words)
- Cache TTL: **5 minutes** (ephemeral) — reset on each cache hit
- Savings: **90% discount** on cached input tokens (pay only 10%)
- Latency savings: 2–5× faster responses on cache hits

**What to cache:**
- System prompts (instructions, rules, persona)
- Tool definitions / schemas
- Large static context (codebase summaries, documentation)
- Few-shot examples that repeat across requests

**What NOT to cache:**
- The variable user input (changes each request)
- Session-specific context that changes frequently

```python
# Python SDK — mark stable sections with cache_control
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": system_prompt,           # stable — cache this
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": few_shot_examples,       # stable — cache this too
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": user_input,              # variable — do NOT cache
            },
        ],
    }
]

# Verify caching worked — check response usage
response = client.messages.create(model=model, messages=messages, max_tokens=1024)
usage = response.usage
cache_read = getattr(usage, 'cache_read_input_tokens', 0)
cache_write = getattr(usage, 'cache_creation_input_tokens', 0)
print(f"Cache hit: {cache_read} tokens | Cache write: {cache_write} tokens")
```

```typescript
// TypeScript SDK — same pattern
const response = await client.messages.create({
  model,
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: userInput },  // variable — no cache
    ],
  }],
});

const { cache_read_input_tokens, cache_creation_input_tokens } = response.usage;
```

**Multi-turn conversations — cache the growing history:**

```python
# Cache all previous turns; only the latest user message is variable
def build_cached_conversation(history: list[dict], new_user_message: str) -> list[dict]:
    if not history:
        return [{"role": "user", "content": new_user_message}]

    # Mark last assistant message in history as cacheable
    cached_history = history[:-1] + [{
        **history[-1],
        "content": [
            {"type": "text", "text": history[-1]["content"],
             "cache_control": {"type": "ephemeral"}},
        ] if isinstance(history[-1]["content"], str) else history[-1]["content"],
    }]
    return cached_history + [{"role": "user", "content": new_user_message}]
```

**Expected savings for a 2000-token system prompt at 1000 requests/day:**

| Scenario | Daily input tokens | Daily cost (Sonnet) |
|---|---|---|
| No caching | 2,000,000 | $6.00 |
| With caching (90% hit rate) | 200,000 cache + 2M original writes | ~$0.90 |
| **Savings** | | **~$5.10/day** |

## Composition

Combine all four techniques in a single pipeline function:

```python
def process(text: str, config: Config, tracker: CostTracker) -> tuple[Result, CostTracker]:
    # 1. Route model
    model = select_model(len(text), estimated_items, config.force_model)

    # 2. Check budget
    if tracker.over_budget:
        raise BudgetExceededError(tracker.total_cost, tracker.budget_limit)

    # 3. Call with retry + caching
    response = call_with_retry(lambda: client.messages.create(
        model=model,
        messages=build_cached_messages(system_prompt, text),
    ))

    # 4. Track cost (immutable)
    record = CostRecord(model=model, input_tokens=..., output_tokens=..., cost_usd=...)
    tracker = tracker.add(record)

    return parse_result(response), tracker
```

## Pricing Reference (2025-2026)

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Relative Cost |
|-------|---------------------|----------------------|---------------|
| Claude Haiku (fast tier) | $0.80 | $4.00 | 1x |
| Claude Sonnet (balanced tier) | $3.00 | $15.00 | ~4x |
| Claude Opus (most capable tier) | $15.00 | $75.00 | ~19x |

## Best Practices

- **Start with the cheapest model** and only route to expensive models when complexity thresholds are met
- **Set explicit budget limits** before processing batches — fail early rather than overspend
- **Log model selection decisions** so you can tune thresholds based on real data
- **Use prompt caching** for system prompts over 1024 tokens — saves both cost and latency
- **Never retry on authentication or validation errors** — only transient failures (network, rate limit, server error)

## Anti-Patterns to Avoid

- Using the most expensive model for all requests regardless of complexity
- Retrying on all errors (wastes budget on permanent failures)
- Mutating cost tracking state (makes debugging and auditing difficult)
- Hardcoding model names throughout the codebase (use constants or config)
- Ignoring prompt caching for repetitive system prompts

## When to Use

- Any application calling Claude, OpenAI, or similar LLM APIs
- Batch processing pipelines where cost adds up quickly
- Multi-model architectures that need intelligent routing
- Production systems that need budget guardrails
