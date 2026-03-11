---
description: From structured ideation frameworks — generate product ideas using JTBD, How Might We, analogy thinking, and constraint reversal. Produces concrete idea seeds without external research. For market-driven discovery (competitor features, Reddit/HN signals, trend analysis), use /discover instead.
---

# Brainstorm

Generate a set of concrete product ideas from a problem space using structured ideation techniques.

## Instructions

### 1. Parse the Prompt

`$ARGUMENTS` is a problem space, goal, or domain. Not a solution.

Good inputs:
- `reduce time from signup to first value in B2B SaaS`
- `help developers understand production errors faster`
- `make team retrospectives actually useful`
- `authentication for the next 5 years`

If `$ARGUMENTS` sounds like a solution ("build a better Jira"), reframe it:
"I'll rephrase that as a problem space to get better ideas: 'help software teams track work with less friction'. That will generate more diverse ideas."

### 2. Context Scan (2 min)

Quickly read the existing project (if in one) to understand:
- What does the product already do?
- Who are the users?
- What's already been built / evaluated / rejected?

Check `docs/ideas/`, `docs/evals/` for existing ideas to avoid duplicates.

### 3. Apply Ideation Frameworks

Run all 4 frameworks. Each produces different kinds of ideas.

#### Framework 1: Jobs-to-be-Done (JTBD)

Ask: "What job is the user hiring a product to do in this space?"

Format: "When [situation], I want to [motivation] so I can [expected outcome]."

Generate 3-5 distinct jobs. For each job, ask: "What's the minimum product that would nail this job?"

#### Framework 2: How Might We (HMW)

Reframe the problem space as a set of "How Might We" questions. Each HMW opens a solution direction.

```
Problem: developers struggle to understand production errors
HMW... make the error context self-explanatory?
HMW... bring relevant code directly to the developer instead of the reverse?
HMW... make errors impossible to ignore until resolved?
HMW... let the system diagnose itself before paging a human?
HMW... make fixing a repeated error take one click?
```

Generate 5-7 HMW questions. For each: sketch one concrete product response.

#### Framework 3: Analogy Thinking

"How do other domains/industries solve an analogous problem?"

Find 3-5 analogous problems in different industries. For each, extract the core mechanism and apply it.

```
Problem: too many alerts, alert fatigue
Analogous domain: Email → Gmail Priority Inbox (ML-ranked importance)
Applied: Smart alert triage that learns which alerts actually need action
→ Idea: ML-prioritized alert routing

Analogous domain: News → Morning Brew (curated digest instead of firehose)
Applied: Daily digest of most important alerts instead of real-time noise
→ Idea: Async alert digest
```

#### Framework 4: Constraint Reversal

Remove a constraint that everyone assumes is fixed. What becomes possible?

```
Problem space: B2B onboarding
Assumed constraints:
- "Onboarding must be done by a human sales rep" → What if it was fully automated?
- "Onboarding takes weeks" → What if first value in under 10 minutes?
- "Users need training" → What if the product trained itself to the user?
- "Pricing is decided before sign-up" → What if pricing emerged from actual usage?
```

For each reversal: one concrete product idea that exploits the removed constraint.

### 4. Score and Filter

From all frameworks (15-25 raw ideas), select the top 7 by:
- **Novelty**: meaningfully different from existing solutions?
- **JTBD fit**: solves a real, specific job?
- **Feasibility**: achievable without 10-person team?
- **Market signal**: any evidence users want this? (even anecdotally)

Remove ideas that are:
- Minor features of an existing product (not product ideas)
- Already well-solved (high-quality existing solution exists)
- Exactly the same as something in `docs/ideas/` or `docs/evals/`

### 5. Create Idea Seeds

For each of the top 7, create a brief idea seed with:
- The core insight (one sentence: the non-obvious thing)
- The job it solves (JTBD format)
- What's different from existing solutions
- The riskiest assumption to validate

Save to `docs/ideas/discovered/YYYY-MM-DD-brainstorm-<name>.md`.

### 6. Output

```
BRAINSTORM: <Problem Space>
════════════════════════════

Frameworks applied: JTBD, How Might We, Analogy, Constraint Reversal
Raw ideas generated: <N>
Top ideas selected:  7

TOP IDEAS
──────────────────────────────────────────────────────

1. <Idea Name>
   Core insight: <the non-obvious thing>
   Job solved:   "When [X], I want to [Y] so I can [Z]"
   Different:    <what no existing solution does>
   Risky assumption: <what must be true for this to work>
   → /idea <kebab-name>

2. [...]

[...]

Idea seeds saved: docs/ideas/discovered/ (7 files)

Suggested next step:
  Run /evaluate <name> for each idea you find compelling.
  Or: /discover <most promising idea's domain> to validate with market research.
```

## Arguments

`$ARGUMENTS` examples:
- `reduce developer on-call toil` — pain-focused
- `B2B SaaS billing that doesn't suck` — outcome-focused
- `authentication post-password` — trend-focused
- `make code review faster and higher quality` — process-focused
- (empty) — ask for the problem space

## After This

- `/idea` — capture the best idea for evaluation
- `/evaluate` — evaluate the idea for Go/No-Go
