---
description: Capture and structure a raw product idea. Asks clarifying questions to fill gaps, then writes a structured idea document. First step in the product lifecycle before evaluation and solution design.
---

# Idea Capture

Capture a raw product idea from `$ARGUMENTS` and turn it into a structured idea document.

## Instructions

### 1. Parse the Input

Read `$ARGUMENTS` as the raw idea. It may be:
- A single sentence: "push notifications for order updates"
- A paragraph with some context
- Completely empty (ask for the idea first)

If `$ARGUMENTS` is empty: ask "What's the idea you want to capture?"

### 2. Identify Gaps

A well-formed idea needs answers to these 5 questions. Check which are answered and which are missing:

1. **Problem** — What problem does this solve? For whom? What is the situation where this problem occurs?
2. **User** — Who specifically has this problem? (Not "users" — a concrete persona)
3. **Current state** — What do they do today without this? Why is that bad?
4. **Proposed solution** — What is the rough shape of the solution?
5. **Success metric** — How would we know this worked? What would be measurably better?

### 3. Ask Clarifying Questions (if needed)

If 2 or more of the 5 questions are unanswered, ask them **in a single message** before writing the document.

Keep questions short and conversational. Maximum 4 questions at once.

Example:
```
Before I write up the idea, a few quick questions:

1. Who specifically would use push notifications — the end customer, or internal ops staff?
2. What do they do today when an order ships? (Email? They have to check manually?)
3. What would success look like — fewer support tickets? Higher open rates?
```

Wait for the user's answers, then proceed.

If only 0-1 questions are missing, make reasonable inferences and note them in the document. Don't block on perfect clarity.

### 4. Generate the Feature Name

Create a short kebab-case name from the idea:
- "push notifications for order updates" → `order-push-notifications`
- "OAuth2 login with GitHub" → `oauth2-github-login`
- "CSV export for analytics dashboard" → `analytics-csv-export`

### 5. Write the Idea Document

Create `docs/ideas/YYYY-MM-DD-<feature-name>.md`:

```markdown
# Idea: <Human-Readable Feature Name>

**Date:** YYYY-MM-DD
**Status:** CAPTURED
**Feature:** <kebab-case-name>

## Problem Statement

<2-4 sentences: what problem exists, for whom, in what situation>

## Target User

**Who:** <specific persona — role, context, not "all users">
**Job-to-be-done:** <what are they trying to accomplish?>
**Frequency:** <how often does this situation occur?>
**Pain level:** <how bad is the current state — minor inconvenience / significant friction / blocker?>

## Current State

<what do they do today? why is it painful or insufficient?>

## Proposed Solution

<rough shape of the solution — what would it do? not how it works internally>

## Success Metrics

<how would we know this worked? what is measurably better?>
- [ ] <metric 1, e.g. "Support tickets about order status drop by 30%">
- [ ] <metric 2>

## Assumptions

<what are we assuming to be true that we haven't verified?>
- [ ] <assumption 1>
- [ ] <assumption 2>

## Open Questions

<what would we need to know before committing to build this?>
- [ ] <question 1>
- [ ] <question 2>

## Out of Scope (initial thoughts)

<what is explicitly NOT part of this idea — helps prevent scope creep>
- ...

## Notes

<anything else relevant — market context, user quotes, related ideas, constraints>
```

Create the `docs/ideas/` directory if it doesn't exist.

### 6. Confirm and Suggest Next Step

After writing:

```
Idea captured: docs/ideas/YYYY-MM-DD-<name>.md

Next: run /evaluate <name> to assess whether it's worth building.
```

## Arguments

`$ARGUMENTS` is the raw idea. Examples:
- `push notifications when orders ship`
- `let users export their data as CSV`
- `OAuth2 login with GitHub and Google`
- (empty — will ask for the idea)

## After This

- `/evaluate` — evaluate the captured idea for Go/No-Go
