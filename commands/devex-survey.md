---
description: Design a Developer Experience survey — DX Core 24 questions, SPACE-aligned dimensions, Likert scale, anonymization, and action plan from results
---

# DevEx Survey Command

Design and run a Developer Experience survey: $ARGUMENTS

## Your Task

Help the user design a DX survey, generate the questions, define a scoring protocol, and create an action plan template for addressing findings.

## Step 1 — Define Survey Scope

Ask:
1. What is the primary concern? (Onboarding? Tooling? Process? Overall health?)
2. Team size (affects question depth and anonymization needs)
3. How often will this run? (One-time? Quarterly?)
4. Anonymous or attributed? (Recommendation: always anonymous for honest results)

## Step 2 — Generate Survey

```markdown
# Developer Experience Survey — [Team/Company] — [Quarter/Date]

**Estimated time:** 5–8 minutes
**Anonymous:** Yes — no individual responses are shared with management
**Purpose:** Understand what helps and hinders our engineering work

---

## Section 1: Flow and Focus
*How often are you able to do focused, deep work?*

| # | Statement | Rating |
|---|-----------|--------|
| 1 | I can get into a flow state during my typical workday | 1–7 |
| 2 | My work is interrupted frequently by meetings, messages, or ad-hoc requests | 1–7 |
| 3 | I have sufficient uninterrupted time to complete complex tasks | 1–7 |

**Scale:** 1 = Strongly Disagree, 4 = Neutral, 7 = Strongly Agree
**Note for interruption question:** Reverse-score (7 = good = few interruptions)

---

## Section 2: Feedback Loops
*How quickly do you know if your work is correct?*

| # | Statement | Rating |
|---|-----------|--------|
| 4 | Our CI/CD pipeline gives me feedback within an acceptable time | 1–7 |
| 5 | I know quickly whether my code changes work correctly | 1–7 |
| 6 | Code reviews are completed within a reasonable time | 1–7 |
| 7 | Deployment to production is straightforward and low-risk | 1–7 |

---

## Section 3: Cognitive Load
*How easy is it to understand and change our system?*

| # | Statement | Rating |
|---|-----------|--------|
| 8 | I can understand the codebase well enough to make changes confidently | 1–7 |
| 9 | Documentation helps me do my job without needing to ask colleagues | 1–7 |
| 10 | Our development environment is easy to set up and keep working | 1–7 |
| 11 | I understand how my work connects to our broader technical architecture | 1–7 |

---

## Section 4: Team and Collaboration
*How well do we work together?*

| # | Statement | Rating |
|---|-----------|--------|
| 12 | I get helpful feedback in code reviews | 1–7 |
| 13 | Knowledge is shared well across the team | 1–7 |
| 14 | I feel comfortable asking for help from teammates | 1–7 |

---

## Section 5: Wellbeing and Satisfaction
*How do you feel about your work?*

| # | Statement | Rating |
|---|-----------|--------|
| 15 | My current workload is sustainable | 1–7 |
| 16 | I feel energized by my work more often than drained | 1–7 |
| 17 | I would recommend this team/company as a great place to work | 1–7 |

---

## Open-Ended (optional, highest signal)

18. **What is the single biggest friction point in your daily work?**
    [text]

19. **What one change would most improve your productivity?**
    [text]

20. **What's working really well that we should protect?**
    [text]
```

## Step 3 — Survey Distribution

**Tools:**
- Google Forms (free, simple, anonymous with "Collect email addresses" = OFF)
- Typeform (better UX, free tier available)
- Notion (if team uses Notion)
- Slack poll for 5-question pulse surveys

**Recommended distribution:**
- Share link in team Slack channel
- Remind after 3 days (only once)
- Close after 5 days
- Target response rate: >70% for meaningful signal; >50% minimum

**For anonymization (small teams < 10):**
- Don't collect any demographic data
- Don't ask tenure or role
- Aggregate results before sharing (no individual rows)

## Step 4 — Scoring Protocol

```python
# Score calculation (example for Google Sheets)
# Each dimension = average of its questions

dimensions = {
    "Flow": [1, 2_reversed, 3],          # Reverse Q2
    "Feedback": [4, 5, 6, 7],
    "Cognitive Load": [8, 9, 10, 11],
    "Collaboration": [12, 13, 14],
    "Wellbeing": [15, 16, 17]
}

# Scoring thresholds:
# < 4.0: CRITICAL — immediate action required
# 4.0–5.0: NEEDS IMPROVEMENT — plan for next quarter
# 5.0–6.0: GOOD — maintain and improve
# > 6.0: EXCELLENT — share as model for others

# eNPS (from Q17):
# Promoters: score 6-7
# Passives: score 4-5
# Detractors: score 1-3
# eNPS = % Promoters - % Detractors
```

## Step 5 — Results Analysis and Action Plan

Template for presenting and acting on results:

```markdown
# DevEx Survey Results — [Team] — [Date]

**Response Rate:** [N] of [N] engineers ([%])
**Comparison:** [First survey / vs. last quarter: +X%]

---

## Dimension Scores

| Dimension | Score | vs. Last | Status |
|-----------|-------|----------|--------|
| Flow and Focus | [N]/7 | [+/-N] | 🔴/🟡/🟢 |
| Feedback Loops | [N]/7 | [+/-N] | 🔴/🟡/🟢 |
| Cognitive Load | [N]/7 | [+/-N] | 🔴/🟡/🟢 |
| Collaboration | [N]/7 | [+/-N] | 🔴/🟡/🟢 |
| Wellbeing | [N]/7 | [+/-N] | 🔴/🟡/🟢 |
| **eNPS** | **[N]** | **[+/-N]** | |

**Lowest dimension: [dimension] — highest priority for action**

---

## Open-Ended Themes

Top themes from open-ended questions (clustered by frequency):

1. **[Theme]** — mentioned by [N] of [N] respondents
   > Selected quotes: "[quote]"

2. **[Theme]** — mentioned by [N] respondents

---

## Action Plan

### Immediate Actions (this sprint)
- **[Issue from Q18/19]**: [specific action], owner: [role], done by: [date]

### This Quarter
- **[Dimension below 4.0]**: [specific experiment], owner: [role]
  - Measure: [which question's score should improve]
  - Target: [from X to Y by end of quarter]

### Watch List (score 4.0–5.0, monitor)
- [Dimension]: [what we'll do if it drops below 4.0]

### What We're Protecting (score > 6.0)
- [Dimension]: [acknowledge and share what's working]

---

## Survey Process Notes

- Next survey: [date — recommend quarterly]
- Changes made based on this survey: [track promises made]
```

## Step 6 — Follow-Through Protocol

The #1 reason DevEx surveys fail: **management reads them and does nothing.**

**Commit to:**
1. Share results with the full team within 2 weeks
2. Announce at least 3 concrete actions taken
3. At the next survey, show what changed as a result of the last one
4. Track promised actions as actual work items (not aspirations)

**What to avoid:**
- Sharing individual-level data with managers
- Comparing scores across teams (context differs)
- Using scores in performance reviews
- Treating the survey as a performance metric (Goodhart's Law applies)

## Reference Skills

- `engineering-metrics` — SPACE framework theory, understanding what DevEx measures
- `team-process` — sprint planning and retrospective formats
- `/dora-baseline` — complement DevEx with objective delivery metrics
- `/engineering-review` — monthly review that uses both DORA + DevEx data
