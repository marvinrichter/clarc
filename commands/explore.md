---
description: Design solutions for a validated product idea — generates 2-4 concrete approaches with trade-off analysis and an Architecture Decision Record. Use after /evaluate returns Go. Delegates to the solution-designer agent.
---

# Explore

Generate solution options for a validated product idea and produce an Architecture Decision Record.

## Instructions

### 1. Find the Idea and Evaluation

Parse `$ARGUMENTS` as the idea name (kebab-case or partial match).

Search for:
- Idea document: `docs/ideas/*<name>*.md`
- Evaluation document: `docs/evals/*<name>*-eval.md`

If the evaluation is missing or shows No-Go:
- If missing: "No evaluation found. Run `/evaluate <name>` first."
- If No-Go: "The evaluation recommended No-Go. Are you sure you want to explore solutions? (yes/no)"

If `$ARGUMENTS` is empty:
- List evaluated ideas with Go or Modify status from `docs/evals/`
- Ask which one to explore

### 2. Load Project Context

Read the most relevant parts of the codebase to give the solution-designer agent full context:
- Project structure (top-level directories)
- Key config files (package.json, go.mod, pyproject.toml)
- Any existing code in the area most relevant to this feature (e.g., if the idea is about auth, read the auth module)

### 3. Delegate to solution-designer

Use the **solution-designer** agent to run the full solution exploration.

Pass the agent:
- Path to the idea document
- Path to the evaluation document
- Relevant codebase context (existing patterns, constraints, tech stack)
- Any constraint mentioned in the evaluation (e.g., "complexity must stay Low")

### 4. Save the ADR

The solution-designer will produce an ADR. Save it to:
`docs/decisions/YYYY-MM-DD-<feature-name>-adr.md`

Create the `docs/decisions/` directory if it doesn't exist.

### 5. Summarize and Suggest Next Step

After saving:

```
ADR complete: docs/decisions/<date>-<name>-adr.md

Decision: Option <X> — <Option Name>

<1-2 sentence summary of the chosen approach and key trade-off>

Next: /prd <name> — write the Product Requirements Document from this decision.
```

## Arguments

`$ARGUMENTS` is the idea name or partial name. Examples:
- `order-push-notifications`
- `push notifications`
- (empty — lists all evaluated ideas and asks)
