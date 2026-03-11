---
description: Analyze raw user feedback (support tickets, NPS comments, app store reviews, survey responses) to identify top pain points, cluster themes, and generate idea seeds. Delegates to the feedback-analyst agent.
---

# Analyze Feedback

Turn raw user feedback into ranked pain points and actionable idea seeds.

## Instructions

### 1. Find the Feedback Data

Parse `$ARGUMENTS` as a file path, glob pattern, or directory:
- `feedback/nps-q1.csv` — single file
- `feedback/*.csv` — all CSVs in a directory
- `feedback/` — all files in directory
- (empty) — look for any feedback files: `feedback/`, `data/`, `*.csv`, `*.json` in project root

If no files found: ask "Where is your feedback data? (path to CSV, JSON, or text file)"

Read and inspect the file(s):
- What format is it? (CSV headers, JSON structure, plain text)
- How many entries?
- What date range?
- What's the relevant text column? (look for: body, comment, text, message, feedback, review)

### 2. Delegate to feedback-analyst

Use the **feedback-analyst** agent, providing:
- File paths and format
- Column name with feedback text
- Any segmentation available (plan, role, NPS score, date)
- Number of idea seeds to generate (default: top 5)

Parse `$ARGUMENTS` for extra options:
- `top 10` → generate 10 idea seeds instead of 5
- `churned` → focus on feedback from churned users only (if column available)
- `enterprise` → focus on enterprise/paid users only
- `last 90 days` → filter by date if date column available

### 3. Save Results

Save the analysis report to `docs/insights/feedback-YYYY-MM-DD.md`.
Create `docs/insights/` if it doesn't exist.

Idea seeds go to `docs/ideas/discovered/YYYY-MM-DD-<name>.md`.

### 4. Output Summary

```
FEEDBACK ANALYSIS COMPLETE
══════════════════════════

Source:      <file(s)>
Total items: <N>
Segments:    <if filtered>

TOP 5 PAIN POINTS
─────────────────

#1  Data Export (142 mentions, pain 4/5)        → /idea analytics-csv-export
#2  Mobile Access (89 mentions, pain 3/5)        → /idea mobile-approval-flow
#3  Dashboard Speed (67 mentions, pain 3/5)      → /idea dashboard-performance
#4  Team Permissions (54 mentions, pain 4/5)     → /idea granular-permissions
#5  Slack Integration (48 mentions, pain 2/5)    → /idea slack-notifications

Full report:   docs/insights/feedback-YYYY-MM-DD.md
Idea seeds:    docs/ideas/discovered/ (5 files)

Next steps:
  /evaluate <name>   — assess each idea
  /discover <topic>  — research the market around your top pain point
```

## Arguments

`$ARGUMENTS` examples:
- `feedback/nps-march.csv` — analyze specific file
- `feedback/` — analyze all files in directory
- `feedback/nps.csv top 10` — generate 10 idea seeds
- `feedback/tickets.csv churned` — focus on churned users
- (empty) — auto-detect feedback files

## After This

- `/brainstorm` — generate ideas from clustered feedback themes
- `/idea` — capture the highest-priority idea
