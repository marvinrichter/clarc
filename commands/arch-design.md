---
description: Design system architecture for a new project or feature. Delegates to the architect agent to produce component boundaries, C4 diagrams, ADRs, and scalability decisions.
---

# Architecture Design

Design the system architecture for: $ARGUMENTS

## Usage

```
/arch-design <description>           — design architecture for a feature or system
/arch-design --adr <decision>        — document a specific architectural decision as an ADR
/arch-design --review                — review an existing architecture for gaps
```

## When to Use This vs /agent-design

| | `/arch-design` | `/agent-design` |
|---|---|---|
| **Use when** | Designing system boundaries, service topology, data flow | Designing a multi-agent AI system |
| **Delegate to** | `architect` agent | `orchestrator-designer` agent |
| **Output** | C4 diagrams, ADRs, component boundaries | Agent roles, orchestration patterns, pseudocode |

## Step 1 — Parse the Goal

Parse `$ARGUMENTS` for:
- The system, feature, or decision to design
- Any constraints (team size, latency, cost, existing infrastructure)
- Whether this is greenfield or an evolution of existing architecture

If empty, ask: "What system or feature do you need to design the architecture for?"

## Step 2 — Invoke architect

Use the **architect** agent with the full context.

The agent will produce:
- **Component boundaries** — what services/modules exist and their responsibilities
- **C4 diagrams** — context, container, and component views in PlantUML
- **Architecture Decision Records (ADRs)** — key decisions with rationale
- **Scalability and reliability analysis** — bottlenecks, SPOFs, trade-offs
- **Technology recommendations** — with justification

## Step 3 — Save the Design

Save the architect's output to the appropriate location:
- Architecture overview: `docs/architecture/arc42.md` (or update existing)
- ADRs: `docs/decisions/YYYY-MM-DD-<name>-adr.md`
- Diagrams: `docs/architecture/diagrams/<name>.puml`

## Step 4 — Validate and Next Steps

After the design is saved:
- Run `/arc42` to generate or update the full arc42 document
- Run `/system-review quick` to verify wiring references are valid
- Create an implementation plan with `/plan`

## After This

- `/plan` — break the architecture into an implementation task list
- `/arc42` — generate full arc42 architecture documentation
- `/agent-design` — if the system includes AI agent components
- `/code-review` — review any new files created during design
