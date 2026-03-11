---
description: Run an issue triage session — list open issues, suggest labels, identify stale issues, and generate standard close responses for out-of-scope or duplicate issues.
---

# Triage

Run a GitHub issue triage session for this repository.

## Steps

### 1. Load open issues

```bash
gh issue list --state open --limit 50 --json number,title,createdAt,updatedAt,labels,body,comments
```

If there are more than 50 open issues, note the count and process the oldest 50 first.

### 2. Classify each issue

For each issue, classify it as one of:

| Class | Criteria |
|---|---|
| `bug` | Describes something broken; has reproduction steps or error output |
| `feature` | Requests new functionality |
| `question` | Asking how to use the project (belongs in Discussions) |
| `duplicate` | Same problem already tracked in another issue |
| `stale` | No activity for >90 days and no resolution |
| `needs-info` | Missing reproduction steps, version, or other required information |
| `out-of-scope` | Does not fit the project's stated purpose |

### 3. Generate label suggestions

For each issue, suggest labels to apply using:

```bash
gh issue edit <number> --add-label "<label>"
```

Apply from the standard taxonomy:
- Type: `bug`, `enhancement`, `docs`, `question`
- Status: `needs-triage`, `needs-info`, `in-progress`, `blocked`, `wontfix`
- Priority: `p0-critical`, `p1-high`, `p2-medium`, `p3-low`
- Contributor: `good first issue`, `help wanted`

Print each command — do not execute automatically unless the user confirms.

### 4. Identify stale issues

Flag issues with no activity (no comments, no label changes) in the last 90 days. Generate a standard close message:

```
This issue has been open for 90+ days without activity. We're closing it
to keep the tracker manageable. If this is still relevant, please reopen
with updated reproduction steps and version information.

Thank you for reporting!
```

```bash
gh issue close <number> --comment "<message>"
```

### 5. Identify duplicates

Look for issues with similar titles or descriptions. When a duplicate is found, generate:

```
This appears to be a duplicate of #<original>. I'm closing this in favour
of the original issue. Please add a thumbs-up reaction on #<original> to
help us prioritise, and comment there if you have additional context.
```

```bash
gh issue close <number> --comment "<message>"
```

### 6. Redirect questions to Discussions

For issues classified as `question`:

```
GitHub Issues is reserved for bug reports and feature requests. For questions,
please open a Discussion: https://github.com/<owner>/<repo>/discussions/new

I'm closing this issue. Feel free to reopen if you find a reproducible bug.
```

```bash
gh issue close <number> --comment "<message>"
```

## Output Format

Produce a triage summary table:

```
## Triage Summary

| # | Title | Classification | Suggested Labels | Action |
|---|-------|---------------|-----------------|--------|
| 42 | Error on startup | bug | bug, p1-high, needs-info | Request more info |
| 41 | How do I configure X? | question | question | Redirect to Discussions |
| 38 | Add dark mode | feature | enhancement, p3-low, good first issue | Label + leave open |
| 25 | Crashes on Windows | stale | — | Close (stale) |

Total: 4 issues processed. Actions: 1 close (stale), 1 close (question), 2 labeled.
```

Then print all `gh` commands grouped by action type (label, close, comment) for the user to review and run.

## After This

- `/plan` — create implementation plan for triaged issues
- `/breakdown` — decompose the highest-priority issue
