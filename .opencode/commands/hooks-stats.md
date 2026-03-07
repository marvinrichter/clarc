---
description: Show hook invocation statistics, performance metrics, and error rates from the hook log.
---

# Hooks Stats

Display a summary of hook performance from `~/.claude/hooks.log`.

## Usage

```
/hooks-stats
/hooks-stats --days 7
/hooks-stats --errors
```

## What It Shows

- Invocation count per hook
- Average and P95 duration (ms)
- Error rate per hook
- Slowest recent invocations

## Implementation

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks-summary.js"
```

With options:

```bash
# Last N days (default: 1)
node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks-summary.js" --days 7

# Show only hooks with errors
node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks-summary.js" --errors

# Show most recent invocations
node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks-summary.js" --recent
```

Or use the npm scripts:

```bash
npm run hooks:summary
npm run hooks:errors
```

## Output Format

```
Hook Performance Summary (last 1 day)
──────────────────────────────────────────────────
hook                        calls  avg ms  p95 ms  errors
post-edit-format-dispatch      42    45ms   210ms    0%
post-edit-typecheck             8   890ms  2100ms    0%
session-start                   1    23ms    23ms    0%
```

Hooks exceeding 3000ms are flagged with a ⚠ warning.
