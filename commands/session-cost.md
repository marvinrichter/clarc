---
description: Show estimated token usage and cost for recent clarc sessions
---

# /session-cost — Session Cost Summary

Displays estimated token usage and cost based on clarc's session tracking.

> **Note:** These are estimates based on tool-call count heuristics.
> For exact costs, visit [console.anthropic.com → Billing](https://console.anthropic.com).

## What It Shows

1. **Today's sessions** — tool calls, estimated tokens, estimated USD
2. **Last 7 days** — daily totals and top 3 projects by cost
3. **All-time total** — cumulative estimate since tracking began
4. **Efficiency tips** — personalized suggestions based on usage patterns

## Steps

1. Read `~/.clarc/cost-log.jsonl`
2. Group entries by date and project
3. Compute:
   - Today: sum of tool_calls, estimated_input_tokens, estimated_output_tokens, estimated_usd
   - Last 7 days: daily breakdown + top projects
   - All-time: running total
4. Show efficiency recommendations based on tool call volume:
   - > 100 tool calls/session → suggest `/compact` strategy
   - Heavy Read usage → suggest Grep-before-Read pattern
   - Multiple agent cascades → suggest Haiku delegation

## Output Format

```
📊 clarc Session Cost Estimate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Today (2026-03-08):
  Sessions:    3
  Tool calls:  87
  ~Tokens:     130k (Input: 105k | Output: 26k)
  ~Cost:       $0.71

Last 7 days:
  2026-03-08   $0.71  ████████
  2026-03-07   $1.24  ██████████████
  2026-03-06   $0.38  ████

Top projects (7d):
  my-app       $1.45
  clarc        $0.88

All-time estimate:  $8.30

ℹ️  Estimate only — exact costs at console.anthropic.com → Billing
💡 Tip: run /compact when context >60% full to reduce token costs
```

## Implementation

Parse `~/.clarc/cost-log.jsonl` and summarize with this logic:

```javascript
// Each line is a JSON object:
// { date, session_id, tool_calls, estimated_input_tokens,
//   estimated_output_tokens, estimated_usd, project, disclaimer }

const entries = fs.readFileSync(LOG_FILE, 'utf8')
  .split('\n').filter(Boolean)
  .map(l => JSON.parse(l));

const today = new Date().toISOString().slice(0, 10);
const todayEntries = entries.filter(e => e.date === today);
const totalUsd = todayEntries.reduce((s, e) => s + e.estimated_usd, 0);
```

## Edge Cases

- **No log file**: "No cost data yet. Cost tracking starts after your next session ends."
- **Empty log**: same as above
- **Corrupted lines**: skip silently, count skipped

## Related

- `skills/cost-management` — deep dive into cost drivers and efficiency strategies
- `commands/undo.md` — restore checkpoints without re-running expensive operations
- `~/.clarc/cost-log.jsonl` — raw cost data

## After This

- `/undo` — restore a checkpoint to avoid re-running expensive operations
- `/sessions` — manage sessions if costs indicate long-running sessions
