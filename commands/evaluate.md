---
description: Evaluate a product idea before committing to build it. Delegates to the product-evaluator agent to assess problem clarity, user fit, feasibility, alternatives, and opportunity cost. Produces a structured Go/No-Go recommendation.
---

# Evaluate

Evaluate a captured product idea and produce a Go / No-Go / Modify recommendation.

## Instructions

### 1. Find the Idea Document

Parse `$ARGUMENTS` as the idea name (kebab-case or partial match).

Search for the idea document:
- Check `docs/ideas/` for files matching the name
- If multiple matches, list them and ask which one
- If no match, ask: "No idea document found for '$ARGUMENTS'. Run `/idea <description>` first, or provide the path directly."

If `$ARGUMENTS` is empty:
- List all files in `docs/ideas/` sorted by date (newest first)
- Ask: "Which idea would you like to evaluate?"

### 2. Read the Idea Document

Read the found idea document fully. Note any gaps in:
- Problem clarity (is the problem concrete and specific?)
- User definition (is there a specific persona?)
- Success metrics (are there measurable outcomes?)

### 3. Delegate to product-evaluator

Use the **product-evaluator** agent to run the full evaluation.

Pass the agent:
- Path to the idea document
- Any gap notes you identified
- The project context (what kind of product is this? what's the tech stack? read README or key config files for context)

### 4. Save the Evaluation

The product-evaluator will produce a structured evaluation. Save it to:
`docs/evals/YYYY-MM-DD-<feature-name>-eval.md`

Create the `docs/evals/` directory if it doesn't exist.

### 5. Summarize and Suggest Next Step

After saving, output a brief summary:

```
Evaluation complete: docs/evals/<date>-<name>-eval.md

Result: GO ✓ / NO-GO ✗ / MODIFY ~

<1-2 sentence summary of the key finding>

<If Go or Modify:>
Next: /explore <name> — generate solution approaches and pick one.

<If No-Go:>
<What to do instead, based on the evaluation>
```

## Arguments

`$ARGUMENTS` is the idea name or partial name. Examples:
- `order-push-notifications`
- `push notifications`  (partial match — will search)
- `oauth2-github-login`
- (empty — lists all ideas and asks)
