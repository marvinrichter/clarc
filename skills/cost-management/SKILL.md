---
name: cost-management
description: Claude API cost awareness — token estimation, cost drivers, and efficiency strategies for Claude Code sessions
---

# Cost Management — Claude API Token Awareness

## When to Activate

- User asks about Claude API costs or token usage
- Session shows unexpectedly high tool call volume
- Setting up a new project where cost matters
- Planning long autonomous sessions or overnight pipelines
- Choosing between Haiku, Sonnet, and Opus for a specific task or agent role
- Debugging why a particular workflow consumed more tokens than expected
- Designing a multi-agent pipeline where per-call cost adds up quickly

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
Context accumulates. A 4-hour session without `/compact` may carry 200k+ tokens
of prior context into every new tool call. (`/compact` is a built-in Claude Code command, not a clarc command.)

### 5. Wide glob patterns
`Glob **/*` on a large repo returns thousands of paths — all as input tokens.

## Efficiency Strategies

### Grep before Read

Instead of loading an entire file, locate the relevant lines first:

```
// EXPENSIVE — loads all 500 lines into context:
Read { file_path: "src/api/users.ts" }

// CHEAP — finds the line number first, then reads only 30 lines:
Grep { pattern: "getUserById", path: "src/api/", output_mode: "content", -n: true }
// → src/api/users.ts:47:export async function getUserById(id: string) {

Read { file_path: "src/api/users.ts", offset: 47, limit: 30 }
```

On a 500-line file this saves ~470 lines of input tokens per lookup. Across a 50-file session the savings compound to tens of thousands of tokens.

### Delegate to Haiku for simple tasks
Haiku is ~8× cheaper than Sonnet. Use it for:
- Summarization
- Simple transformations
- Extracting structured data from text
- Writing boilerplate

### Use /compact proactively
Run `/compact` (built-in Claude Code command) when context > 60% full. The summary costs ~$0.01 and saves
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
# View recent cost log entries
tail -5 ~/.clarc/cost-log.jsonl | jq .

# Run /session-cost command for a formatted summary
/session-cost
```

**Example `~/.clarc/cost-log.jsonl` entries:**
```jsonl
{"date":"2026-03-12","session_id":"ses_abc123","model":"claude-sonnet-4-6","tool_calls":{"Read":14,"Grep":8,"Edit":6,"Bash":4,"Agent":1},"est_input_tokens":42000,"est_output_tokens":8500,"est_cost_usd":0.25,"duration_min":22}
{"date":"2026-03-12","session_id":"ses_def456","model":"claude-sonnet-4-6","tool_calls":{"Read":31,"Grep":5,"Edit":12,"Bash":9,"Agent":3},"est_input_tokens":98000,"est_output_tokens":21000,"est_cost_usd":0.61,"duration_min":51}
{"date":"2026-03-11","session_id":"ses_ghi789","model":"claude-opus-4-6","tool_calls":{"Read":8,"Grep":3,"Edit":2,"Bash":2,"Agent":0},"est_input_tokens":18000,"est_output_tokens":4200,"est_cost_usd":0.59,"duration_min":14}
```

Key fields: `tool_calls` shows which tools drove cost; `est_cost_usd` is the session estimate; `Agent` calls are the most expensive per-call (each spawns a new context window).

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
