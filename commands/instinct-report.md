---
name: instinct-report
description: Ranked list of instincts by confidence with trend indicators (↑↓→) and decay candidates
command: true
---

# Instinct Report Command

Shows a ranked view of all instincts for the current project, sorted by confidence.
Highlights top performers and flags low-confidence candidates for removal.

## Usage

```
/instinct-report               # Current project + global instincts
/instinct-report --global      # Global instincts only
/instinct-report --all         # All instincts across all projects
```

## Implementation

Run the instinct CLI to load instincts, then render the report:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" status --json
```

Then parse the JSON output and render the ranked report in the format below.

Or load instincts directly from `~/.claude/homunculus/` using the YAML-like format.

## Preconditions

Before running, verify:
- `~/.claude/homunculus/` exists — if not, instruct user to run `install.sh --enable-learning`
- At least one instinct exists — if none, suggest running sessions with `/learn-eval` first
- `outcomes.jsonl` may not exist (new install) — trend indicators will show `→` for all instincts in that case

## Execution

1. Detect the current project context (same as `/instinct-status`)
2. Load all instincts (project + global) with their full schema fields
3. Calculate trend indicators using the outcome history:
   - Load the last N entries from `~/.claude/homunculus/outcomes.jsonl` for each instinct
   - 3-session rolling average of confidence delta:
     - `↑` if avg delta > +0.03 over last 3 outcomes
     - `↓` if avg delta < -0.03 over last 3 outcomes
     - `→` otherwise (stable)
4. Render ranked output (see format below)
5. Show removal candidates if any

## Output Format

```
============================================================
  INSTINCT REPORT — 14 total (project: my-app + 4 global)
  Updated: 2026-03-09
============================================================

TOP CONFIDENCE (10 highest)
  #1  ████████████  89%  ↑  validate-user-input     [global]  security
  #2  ███████████░  85%  →  test-first-workflow     [project] testing     +8/-1/2
  #3  ███████████░  84%  ↑  grep-before-edit        [project] workflow    +6/-0/1
  #4  ██████████░░  82%  →  immutable-state         [project] patterns    +5/-0/0
  #5  █████████░░░  78%  ↓  async-over-sync         [project] patterns    +2/-3/1
  ...

LOW CONFIDENCE — candidates for removal (confidence ≤ 20% or unused > 90 days)
  ○  lint-before-commit   15%  ↓  [project] unused 112 days — consider removing
  ○  manual-testing-ok    18%  ↓  [project] unused 95 days  — consider removing

DECAY STATUS
  Instincts unused 30+ days:  3
  Instincts unused 90+ days:  2 (flagged)
  Archived this week:         0

Run /instinct-outcome <id> good|bad|neutral to record outcomes.
Run /evolve to cluster high-confidence instincts into skills/commands.
```

## Trend Calculation

For each instinct, look up its entries in `~/.claude/homunculus/outcomes.jsonl`:

```js
// Filter last 3 outcomes for this instinct
const recent = allOutcomes
  .filter(o => o.instinct_id === id)
  .slice(-3);

const avgDelta = recent.length === 0 ? 0
  : recent.reduce((sum, o) => sum + (o.confidence_after - o.confidence_before), 0) / recent.length;

const trend = avgDelta > 0.03 ? '↑' : avgDelta < -0.03 ? '↓' : '→';
```

## Confidence Bar Rendering

Use block characters to render a 12-cell bar:
- Filled cells: `Math.round(confidence * 12)`
- Use `█` for filled, `░` for empty

## Output Interpretation

- **TOP CONFIDENCE list**: high-confidence instincts are actively shaping Claude's behavior — review for accuracy
- **Trend ↑**: instinct is gaining evidence recently — consider `/instinct-promote` if confidence ≥ 80% and usage ≥ 5
- **Trend ↓**: instinct is losing reliability — record outcomes with `/instinct-outcome` or let it decay naturally
- **LOW CONFIDENCE / DECAY**: flagged instincts are candidates for removal — run `/instinct-outcome <id> bad` or archive manually
- **After review**: run `/evolve` to cluster high-confidence instincts into reusable skills or commands

## Notes

- Outcome counts format: `+good/-bad/neutral`
- Instincts below 20% confidence should be surfaced for manual review
- Never auto-delete — only surface for user decision
- Link to `/instinct-outcome` for recording new outcomes

## After This

- `/evolve` — trigger instinct evolution from high-confidence patterns
- `/instinct-promote` — promote the highest-rated instincts
