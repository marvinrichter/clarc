---
description: "Review high-confidence instincts and promote them to agent-specific overlay files (~/.clarc/agent-instincts/). Closes the continuous-learning-v2 feedback loop by making agents smarter over time."
---

# /agent-evolution

Promote validated instincts from continuous-learning-v2 into agent instruction overlays.
Agents accumulate instincts session by session; this command writes them to
`~/.clarc/agent-instincts/<agent>.md` so Claude applies them on every future invocation.

## Usage

```
/agent-evolution              # Interactive: review + approve candidates
/agent-evolution --all        # Auto-approve all candidates above threshold
/agent-evolution --threshold 0.6  # Lower the confidence bar
/agent-evolution --dry-run    # Preview only — no files written
```

## What It Does

1. **List candidates** — calls `node scripts/agent-evolution.js list [--threshold]`
   and presents each high-confidence instinct with its proposed agent mapping

2. **User approves each** — for every candidate show:
   ```
   1. "Always flag direct DOM manipulation in React code"
      Confidence: 0.85 | Domain: typescript | Learned: 2026-02-15
      → Proposed for: typescript-reviewer, code-reviewer
      [A]pply / [S]kip / [E]dit before applying
   ```

3. **Write approved instincts** — for each `[A]pply`:
   ```bash
   node scripts/agent-evolution.js apply <agent-name> "<instinct text>" \
     --confidence <score> --learned <date>
   ```
   Repeat for every target agent in the proposed list.

4. **Confirm** — print summary of what was written:
   ```
   ✓ 3 instinct(s) applied to typescript-reviewer
   ✓ 2 instinct(s) applied to code-reviewer
   Overlays: ~/.clarc/agent-instincts/
   ```

## Interactive Approval Flow

For each candidate instinct:

- **A** (Apply) → write to all proposed agents as-is
- **S** (Skip) → do not write; instinct stays in the store for next review
- **E** (Edit) → ask user to type a revised instinct text, then apply the edited version

When `--all` is passed, all candidates are applied without prompting.
When `--dry-run` is passed, print what would be applied but write nothing.

## Threshold

Default confidence threshold: **0.75** (set in `scripts/agent-evolution.js`).
Instincts also need ≥ 5 recorded usages to qualify.

Adjust:
```
/agent-evolution --threshold 0.6   # Permissive — catch more candidates
/agent-evolution --threshold 0.9   # Strict — only near-certain patterns
```

## Rollback

If a promoted instinct makes an agent worse:

```
/instinct-outcome <id> bad --reason "Made typescript-reviewer too aggressive"
```

Then run `/agent-evolution` again — the now-low-confidence instinct will appear as
a removal candidate, and you can confirm its removal from the overlay.

Or remove directly:
```bash
node scripts/agent-evolution.js remove typescript-reviewer "Always flag direct DOM"
```

## Related

- Command: `/agent-instincts <name>` — show current overlay for a specific agent
- Skill: `agent-evolution-patterns` — full workflow guide
- Skill: `continuous-learning-v2` — instinct capture and management
- Command: `/instinct-outcome` — record whether an instinct worked or not
- Command: `/evolve` — cluster instincts into new skills/commands/agents
