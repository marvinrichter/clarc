---
name: cost-management
description: Claude API cost awareness — token estimation, cost drivers, and efficiency strategies for Claude Code sessions
tags: [cost, tokens, performance, claude-api]
---

# Cost Management — Claude API Token Awareness

## When to Activate

- User asks about Claude API costs or token usage
- Session shows unexpectedly high tool call volume
- Setting up a new project where cost matters
- Planning long autonomous sessions or overnight pipelines

## Why This Matters

Real-world data from Claude Code users:

- **Aider users**: "$35–40 in a few days" without noticing (Issue #605)
- **Cline users**: "$50/day without realizing" (Discussion #1727)
- **One intensive session**: 100–300k tokens = $0.30–$4.50 with Claude Sonnet

Token visibility is the #1 requested feature across all major AI coding tools.
clarc tracks this automatically via the `session-end` hook.

## Model Cost Reference (2026)

| Model | Input | Output |
|-------|-------|--------|
| Claude Haiku 4.5 | ~$0.25 / M tokens | ~$1.25 / M tokens |
| Claude Sonnet 4.6 | ~$3.00 / M tokens | ~$15.00 / M tokens |
| Claude Opus 4.6 | ~$15.00 / M tokens | ~$75.00 / M tokens |

> Prices subject to change. Always verify at [console.anthropic.com](https://console.anthropic.com).

**Rule of thumb**: Output tokens cost 5× more than input tokens. Minimize verbose output.

## Cost Drivers — What Makes Sessions Expensive

### 1. Reading large files completely
```
EXPENSIVE: Read entire 2000-line file to find one function
CHEAP:     Grep for the function, then Read only the relevant 20 lines
```

### 2. Agent cascades
Each agent call = new context window = new cost.
5 sequential agents on a large codebase can easily cost $1–2.

### 3. Images and screenshots in context
Vision inputs are input-token-heavy. One screenshot ≈ 1,000–5,000 tokens.

### 4. Long sessions without /compact
Context accumulates. A 4-hour session without /compact may carry 200k+ tokens
of prior context into every new tool call.

### 5. Wide glob patterns
`Glob **/*` on a large repo returns thousands of paths — all as input tokens.

## Efficiency Strategies

### Grep before Read
```javascript
// Instead of:
Read('src/api/users.ts')  // entire 500-line file

// Do:
Grep('getUserById', 'src/api/')  // find the function
Read('src/api/users.ts', offset=45, limit=30)  // read only those lines
```

### Delegate to Haiku for simple tasks
Haiku is ~8× cheaper than Sonnet. Use it for:
- Summarization
- Simple transformations
- Extracting structured data from text
- Writing boilerplate

### Use /compact proactively
Run `/compact` when context > 60% full. The summary costs ~$0.01 and saves
much more in subsequent calls.

### Scope control
Clear task boundaries prevent scope creep. "Fix the null check in getUserById"
is 10× cheaper than "review the whole auth module."

### Agent isolation
Agents protect the main context. A Haiku sub-agent doing file analysis
costs far less than loading all those files into the Sonnet main context.

## Cost Tracking in clarc

clarc automatically logs estimated session costs to `~/.clarc/cost-log.jsonl`.

```bash
# View cost log
cat ~/.clarc/cost-log.jsonl | tail -20

# Run /session-cost command for a formatted summary
/session-cost
```

**Important**: These are estimates based on tool-call count heuristics.
For exact costs, check [console.anthropic.com → Billing](https://console.anthropic.com).

## When to Use Which Model

| Task | Model | Why |
|------|-------|-----|
| Code review, TDD, standard dev | Sonnet | Best quality/cost ratio |
| Lightweight analysis, summaries | Haiku | ~8× cost savings |
| Architecture decisions, complex debugging | Opus | Deep reasoning needed |
| Worker agents in pipelines | Haiku | High volume, lower stakes |
| Orchestrator in multi-agent | Sonnet | Coordination complexity |

## Related

- `/session-cost` — view session cost summary
- `scripts/hooks/auto-checkpoint.js` — checkpoint before expensive operations
- `skills/cost-aware-llm-pipeline` — designing cost-efficient multi-agent pipelines
