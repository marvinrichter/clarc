---
description: Design a multi-agent orchestration system for a complex task. Delegates to the orchestrator-designer agent to decompose the goal into agent roles, select a coordination pattern, and produce an implementation plan with pseudocode.
---

# Orchestrate Design

Design a multi-agent system for a complex goal.

## Instructions

### 1. Parse the Goal

Parse `$ARGUMENTS` as the task or system goal to orchestrate.

If `$ARGUMENTS` is empty, ask: "What complex task or workflow would you like to design a multi-agent system for?"

### 2. Delegate to orchestrator-designer

Use the **orchestrator-designer** agent.

Pass:
- The goal or task description from `$ARGUMENTS`
- Any context about agents already available in `~/.claude/agents/`
- Constraints the user mentioned (cost, latency, isolation requirements)

The agent will produce:
- **Task decomposition** — subtasks and their dependencies
- **Agent role definitions** — what each agent is responsible for
- **Orchestration pattern** — Fan-Out, Split-Role, Explorer+Validator, Worktree Isolation, or Sequential Pipeline
- **Failure mode analysis** — what can go wrong and mitigations
- **Implementation plan with pseudocode**

### 3. Save the Design

Save the agent's output to `docs/architecture/<goal-name>-orchestration.md`.

Create the directory if it doesn't exist.

### 4. Summarize

After saving, output:

```
Orchestration design saved: docs/architecture/<name>-orchestration.md

Pattern selected: <pattern>
Agent count: <N>

<1-2 sentence rationale for pattern choice>

Next: implement agents in agents/ and wire them in commands/ or via /orchestrate.
```

## Arguments

`$ARGUMENTS` is the goal or task description. Examples:
- `nightly code review and changelog generation`
- `multi-language SDK generation from OpenAPI spec`
- `onboarding new engineers — repo tour, setup, first PR`

## When to Use This vs /agent-design

| | `/orchestrator-design` | `/agent-design` |
|---|---|---|
| **Style** | Direct delegation — one-shot output | Interactive workshop — guided, multi-step |
| **User involvement** | Low — goal in, design document out | High — validates decomposition, refines pattern |
| **Use when** | Requirements are clear, want artifact fast | Requirements are fuzzy or need interactive refinement |

## See Also

- `/agent-design` — interactive workshop for designing multi-agent systems
- `/orchestrate` — run an orchestration workflow (uses the orchestrator agent)
- `/plan` — single-agent implementation planning

## After This

- `/orchestrate` — implement the designed orchestration workflow
- `/tdd` — add orchestration tests
