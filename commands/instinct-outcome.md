---
name: instinct-outcome
description: Record an outcome (good/bad/neutral) for a specific instinct to adjust its confidence score
command: true
---

# Instinct Outcome Command

Record an outcome for a specific instinct. This updates its confidence score and outcome counters.

## Usage

```
/instinct-outcome <id> <good|bad|neutral>
/instinct-outcome <id> good "reason why it worked"
/instinct-outcome <id> bad "reason it caused problems"
/instinct-outcome list
```

## Implementation

Run the outcome tracker script:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/instinct-outcome-tracker.js" <id> <outcome> [reason]
```

Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation):

```bash
node ~/.claude/scripts/instinct-outcome-tracker.js <id> <outcome> [reason]
```

To list available instinct IDs:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/instinct-outcome-tracker.js" --list
```

## Confidence Adjustments

| Outcome | Confidence change |
|---------|-----------------|
| `good`  | +0.05 (max 0.95) |
| `bad`   | -0.10 (min 0.10) |
| `neutral` | no change |

## Preconditions

Before running, verify:
- `~/.claude/homunculus/` exists — if not, instruct user to run `install.sh --enable-learning`
- The instinct ID is valid — run `list` subcommand if unsure of the ID
- Outcome is one of `good`, `bad`, or `neutral`

## Execution

1. Ask the user which instinct they want to record an outcome for (or use the `list` subcommand)
2. Validate the outcome is `good`, `bad`, or `neutral`
3. Run the tracker script with the instinct ID and outcome
4. Show the updated confidence score
5. Suggest running `/instinct-report` to see the updated ranking

## Example Output

```
Recorded good outcome for "test-first-workflow"
  Confidence: 0.70 ↑ 0.75
  Reason: TDD caught a regression before it hit staging
```

## Output Interpretation

- **Confidence increased**: instinct is gaining evidence — will appear higher in `/instinct-report`
- **Confidence decreased**: if drops below 20%, it will be flagged in `/instinct-report` for removal review
- **Run `/instinct-report` after recording**: to see the updated ranked list with trend indicators (↑↓→)
- **Pattern**: if the same instinct consistently gets `bad` outcomes, consider using `/evolve` to revise it

## Notes

- Outcomes are logged to `~/.claude/homunculus/outcomes.jsonl` for audit
- `last_used` is updated to today on every outcome recording
- `usage_count` increments on every outcome recording
- Use `/instinct-status` to see current confidence levels
- Use `/instinct-report` to see ranked list with trends
