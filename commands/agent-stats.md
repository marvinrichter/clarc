---
description: Show agent usage statistics — top agents, heatmap, outcome ratio
---

# Agent Stats

Show agent effectiveness metrics from `~/.clarc/agent-log.jsonl`.

## Usage

`/agent-stats [--days N] [--heatmap] [--outcome] [--recent] [--export <file>]`

## Arguments

$ARGUMENTS:
- *(no args)* — top agents ranked by invocation count (last 30 days)
- `--days N` — look back N days (default: 30)
- `--heatmap` — usage heatmap by hour of day
- `--outcome` — success/failure ratio per agent (worst performers first)
- `--recent` — last 20 invocations with timestamps
- `--export <file>` — export filtered log as JSON

## How It Works

Run the analytics CLI:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/agent-analytics.js $ARGUMENTS
```

If the log file doesn't exist yet, remind the user that agent tracking starts
automatically once an Agent tool call is made.

## Output Examples

### Top agents (default)
```
Agent usage — last 30 day(s) — 142 invocations

  Agent                 Count   Success    Avg(ms)  Bar
  ─────────────────────  ─────   ───────    ───────  ─────────
  code-reviewer             42      95%       3200  ████████████████████
  planner                   28      96%       8100  █████████████
  tdd-guide                 19      89%       5400  █████████
  security-reviewer         12      92%       2800  ██████
```

### Heatmap
Shows peak usage hours to understand when agents are most active.

### Outcome ratio
Sorted by success rate ascending — quickly spots unreliable agents.

---

**Related:** `/hooks-stats` for hook-level metrics, `/sessions` for session history.
