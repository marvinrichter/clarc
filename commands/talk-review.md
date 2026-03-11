---
description: Talk and presentation feedback — evaluates structure, timing plausibility, audience fit, narrative flow, clarity, and opening/closing strength. Invokes the talk-coach agent.
---

# Talk Review

Get structured, actionable feedback on your talk outline, script, or slide deck before presenting.

## Usage

```
/talk-review                        — full review across all 6 dimensions
/talk-review structure              — narrative arc and section flow only
/talk-review timing                 — timing plausibility per section
/talk-review audience               — audience fit and assumed knowledge level
/talk-review opening                — opening hook and closing call-to-action only
```

Pass `$ARGUMENTS` as the focus area. Without arguments, all 6 dimensions are reviewed.

Provide the talk content as:
- A file path to your outline, script, or slide deck
- A paste of the outline in the chat

## What This Command Does

1. **Structure Review** — Does the talk have a clear problem → solution → takeaway arc? Are sections balanced?
2. **Timing Plausibility** — Does the slide count / content density match the allotted time?
3. **Audience Fit** — Is the assumed knowledge level correct? Are jargon terms explained?
4. **Narrative Flow** — Are transitions between sections smooth? Does each section connect to the thesis?
5. **Opening Strength** — Does the opening create a hook? Does it establish why the audience should care?
6. **Closing Strength** — Does the closing land on a memorable takeaway? Is there a clear call-to-action?

## When to Use

- After drafting a CFP / conference abstract
- After building a first-draft slide deck
- Before a dry run with a team
- After a dry run to incorporate timing feedback

## Output Format

```
[CRITICAL] Issue that will lose the audience
Impact: Why this hurts the talk
Fix: Concrete change to make

[HIGH] Issue that reduces clarity or persuasiveness
Impact: ...
Fix: ...

[MEDIUM] Polish opportunity
Impact: ...
Fix: ...
```

## Scope vs Related Commands

| Need | Command |
|------|---------|
| Write the CFP abstract | `/cfp` |
| Create the slide deck from outline | `/slide-deck` |
| Design the slide visuals | `/design-critique` |
| This command: feedback on existing talk | `/talk-review` |

## After This

- `/slide-deck` — rebuild slides incorporating the structural feedback
- `/cfp` — if the talk was accepted and the abstract needs updating to match revised talk structure
