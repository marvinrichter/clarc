---
description: "Show the learned instinct overlay for a specific agent, or list all overlays with instinct counts."
---

# /agent-instincts

Display the current instinct overlays that extend agent instructions.
Overlays live in `~/.clarc/agent-instincts/` and are injected into
Claude's context at every session start.

## Usage

```
/agent-instincts                      # List all agents with overlays
/agent-instincts typescript-reviewer  # Show overlay for a specific agent
/agent-instincts tdd-guide
```

## What It Does

### List all overlays

```bash
node scripts/agent-evolution.js show
```

Output:
```
Agent instinct overlays (3):

  typescript-reviewer            4 instincts
  code-reviewer                  2 instincts
  tdd-guide                      1 instinct

Directory: ~/.clarc/agent-instincts/
Use: agent-evolution show <agent-name> for details.
```

### Show a specific agent overlay

```bash
node scripts/agent-evolution.js show <agent-name>
```

Output:
```
Overlay for typescript-reviewer:

## Learned Instincts (auto-generated — do not edit manually)
<!-- Last updated: 2026-03-10 by /agent-evolution -->

- Always flag direct DOM manipulation in React code (confidence: 0.85, learned: 2026-02-15)
- Check for missing useCallback on event handlers passed to memoized children (confidence: 0.78, learned: 2026-02-20)
- Require error boundaries in React component trees (confidence: 0.81, learned: 2026-03-01)
```

## When to Use

- Before running `/agent-evolution` — check what is already promoted
- After a session that corrected an agent — verify the correction was captured
- Debugging: agent behaving unexpectedly — check if a bad instinct was promoted

## Related

- Command: `/agent-evolution` — promote instincts to agent overlays
- Skill: `agent-evolution-patterns` — full workflow guide
- Skill: `continuous-learning-v2` — how instincts are captured
