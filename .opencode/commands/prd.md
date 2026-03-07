---
description: Write a Product Requirements Document from a validated idea and its Architecture Decision Record. Produces a spec directly compatible with /overnight and /plan. Final step before implementation.
---

# PRD

Write a Product Requirements Document (PRD) from a validated idea and its Architecture Decision Record.

## Instructions

### 1. Find All Source Documents

Parse `$ARGUMENTS` as the idea name (kebab-case or partial match).

Collect in order:
- Idea: `docs/ideas/*<name>*.md`
- Evaluation: `docs/evals/*<name>*-eval.md`
- ADR: `docs/decisions/*<name>*-adr.md`

If the ADR is missing: "No Architecture Decision Record found. Run `/explore <name>` first."

If `$ARGUMENTS` is empty:
- List ideas that have both an eval (Go/Modify) and an ADR
- Ask which one to write a PRD for

### 2. Read All Source Documents

Read idea + eval + ADR fully. Synthesize:
- The validated problem (from idea + eval)
- The chosen solution approach (from ADR)
- The constraints and assumptions (from eval + ADR)
- The open questions that need to be resolved

### 3. Write the PRD

Create `docs/specs/YYYY-MM-DD-<feature-name>-prd.md`:

```markdown
# PRD: <Feature Name>

**Date:** YYYY-MM-DD
**Status:** READY FOR IMPLEMENTATION
**Idea:** docs/ideas/<name>.md
**Evaluation:** docs/evals/<name>-eval.md
**ADR:** docs/decisions/<name>-adr.md

## Problem

<2-3 sentences: the validated problem, for whom, why it matters>

## Solution

<2-3 sentences: what we're building (based on the ADR recommendation)>

**Approach:** <chosen option name from ADR>

## Target User

<specific persona from the idea evaluation>

## User Stories

<3-7 user stories in format: "As a <user>, I want to <action> so that <benefit>">

- As a [user], I want to [action] so that [benefit].
- As a [user], I want to [action] so that [benefit].

## Acceptance Criteria

Concrete, testable conditions that define "done":

- [ ] <criterion 1 — specific, measurable>
- [ ] <criterion 2>
- [ ] <criterion 3>
- [ ] All new code has 80%+ test coverage
- [ ] Build succeeds, lint clean, types pass
- [ ] No new console.log or debug statements

## Scope

### In Scope
<what is explicitly included — be specific>
- ...

### Out of Scope
<what is explicitly excluded — prevents scope creep>
- ...
- UI changes beyond what's required for the feature (unless explicitly listed)
- Documentation updates beyond inline code docs

## API Changes

<"None" if no API changes, otherwise list each endpoint>

### New Endpoints
- `POST /api/v1/<path>` — <purpose>
  - Request: `{ field: type }`
  - Response 201: `{ data: { ... } }`
  - Response 400: RFC 7807 ProblemDetails

### Modified Endpoints
- `GET /api/v1/<path>` — <what changes and why>

> If API changes exist: write OpenAPI 3.1 spec before implementation (see skill `api-contract`)

## Non-Functional Requirements

| Requirement | Target | Reason |
|-------------|--------|--------|
| Latency | <e.g. p99 < 200ms> | <why> |
| Data retention | <e.g. 90 days> | <regulatory / cost> |
| Security | <e.g. input validation, no PII in logs> | <why> |
| Availability | <e.g. same as existing service> | <why> |

## Implementation Notes

Key decisions from the ADR that should guide implementation:
- <decision 1 from ADR and its implication for code>
- <decision 2>

Files likely affected (based on ADR implementation sketch):
- `<path>` — <purpose>

## Success Metrics

How we'll know this worked, measured after shipping:
- <metric 1: e.g. "Support tickets about order status drop 20% in the first month">
- <metric 2>

## Open Questions

Resolved during PRD writing:
- [x] <question that was answered>: <answer>

Still open (resolve during implementation if possible):
- [ ] <question>

## Notes for Claude (Implementation)

- Read this PRD and the ADR before writing any code
- Follow the solution approach in the ADR — do not redesign
- Read 2-3 existing files in the affected area first to match conventions
- Update SHARED_TASK_NOTES.md after each implementation step
```

Create `docs/specs/` directory if it doesn't exist.

### 4. Check for API Changes

If the PRD includes API changes:
- Note that the `api-contract` step is mandatory before implementation
- The `/overnight` command will auto-detect this from the PRD

### 5. Summarize and Suggest Next Step

After saving:

```
PRD complete: docs/specs/<date>-<name>-prd.md

<brief summary of scope>

API changes: Yes / No

Ready to implement. Options:

  Autonomous (overnight):
    /overnight implement <name>
    → Claude reads the PRD, selects pipeline pattern, generates overnight.sh

  Interactive (planned):
    /plan <name>
    → Claude reads the PRD, creates step-by-step implementation plan

  Test-driven:
    /tdd <name>
    → Claude reads the PRD, starts RED phase
```

## Arguments

`$ARGUMENTS` is the idea name or partial name. Examples:
- `order-push-notifications`
- `push notifications`
- (empty — lists ideas with eval + ADR and asks)
