---
name: team-process
description: "Engineering team process patterns: OKR definition and scoring, sprint planning and retros, roadmap structuring (now/next/later), feature breakdown into user stories with acceptance criteria, and engineering metrics (DORA, velocity). For product lifecycle see product-lifecycle skill."
---

# Team Process

> **Scope**: Engineering team rituals, planning frameworks, and delivery metrics.
> For product discovery and PRD creation, see [product-lifecycle](../product-lifecycle/SKILL.md).
> For feature breakdown into sprint tasks, use `/breakdown`.

## When to Activate

- Writing OKRs for a quarter
- Running sprint planning or retrospectives
- Creating a product roadmap
- Defining engineering team metrics
- Structuring a feature into user stories and acceptance criteria
- Setting up team working agreements

---

## OKR Framework

### Structure

```
Objective (qualitative, inspiring, 1 sentence):
  "Become the fastest checkout experience in our category"

Key Results (measurable, 3-5 per objective):
  KR1: Reduce checkout time from 120s to 45s (median)
  KR2: Increase checkout completion rate from 68% to 82%
  KR3: Achieve p95 checkout latency < 2s on mobile
  KR4: 0 payment data incidents this quarter
```

### OKR quality checklist

- [ ] Objective is qualitative and inspiring (no metrics in the objective itself)
- [ ] Each KR is measurable with a specific number
- [ ] KRs are outcomes, not activities ("increase X from A to B" not "do Y")
- [ ] 3-5 KRs per objective (not 10)
- [ ] Stretch: 70% achievement = good (not 100%)
- [ ] Baseline established for each KR before quarter starts

### OKR anti-patterns

| Anti-pattern | Example | Fix |
|-------------|---------|-----|
| Activity KR | "Launch feature X" | "Feature X increases activation by 15%" |
| Sandbagging | KR you'll hit 100% easily | Set 70% = good |
| Too many | 8 objectives × 5 KRs = 40 KRs | Max 3 objectives × 4 KRs |
| No baseline | "Improve response time" | "Improve p95 latency from 800ms to 300ms" |
| Vanity metric | "Reach 100k users" | "90-day retention reaches 40%" |

### OKR scoring

At quarter end:
- **0.7–1.0**: Strong (if consistently 1.0, your targets were too easy)
- **0.4–0.6**: Partial — review blockers
- **< 0.4**: Missed — root cause analysis required

---

## Sprint Planning

### Sprint structure (2-week sprints)

```
Day 1:   Sprint planning (1-2h)
Days 2-9: Execution (daily standup 15min)
Day 10:   Code freeze + testing
Day 11:   Sprint review (30min) + Retrospective (1h)
Day 12:   Buffer / planning for next sprint
```

### Sprint planning agenda

1. **Capacity** (10 min): How many story points can we commit?
   - Default team velocity × 0.8 (leave 20% buffer for unplanned)
   - Account for PTO, interviews, on-call

2. **Backlog refinement** (20 min): Review top stories from backlog
   - Stories must have acceptance criteria before entering sprint
   - Stories > 5 pts must be broken down

3. **Commitment** (20 min): Select stories for the sprint
   - Fill to capacity × 0.8
   - Assign owners for each story

4. **Sprint goal** (5 min): One sentence summarizing the sprint's theme

### Sprint goal format

```
By end of sprint [N], users will be able to [capability], which delivers [value].
```

### Daily standup (async-friendly format)

```
Yesterday: [what I completed]
Today:     [what I'm working on]
Blockers:  [what's blocking me, who I need help from]
```

### Retrospective formats

**Start/Stop/Continue** (default):
- Start: what should we begin doing?
- Stop: what's hurting us that we should stop?
- Continue: what's working well?

**4Ls** (for deeper reflection):
- Liked: what went well?
- Learned: what did we learn?
- Lacked: what was missing?
- Longed for: what do we wish we had?

**Action item format**:
```
Action: [specific action]
Owner: [one person, not "the team"]
Due: [next sprint / specific date]
```

---

## Roadmap Structuring

### Now / Next / Later format

| Horizon | Timeframe | Status | Commitment level |
|---------|-----------|--------|-----------------|
| **Now** | Current quarter | In progress or committed | High — specific features |
| **Next** | Next 1-2 quarters | Planned | Medium — themes and epics |
| **Later** | 6+ months | Exploratory | Low — opportunities, not commitments |

### Roadmap item format

```
[Theme/Epic] — [one-line description]
Value: [outcome for users]
Metrics: [how we'll measure success]
Status: [Now / Next / Later]
Dependencies: [teams or external]
```

### Roadmap anti-patterns

- **Feature factory**: listing features without outcomes — always state the user value
- **Over-committing Later**: Later items should be opportunities, not promises
- **Missing dependencies**: calling out what blocks what
- **No metrics**: every item should have a measurable success criteria

---

## Engineering Metrics

### DORA (DevOps Research and Assessment) metrics

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| **Deployment frequency** | Multiple/day | Weekly | Monthly | < Monthly |
| **Lead time for changes** | < 1 hour | 1 day | 1 week | > 1 month |
| **Change failure rate** | < 5% | 10% | 15% | > 30% |
| **MTTR** | < 1 hour | < 1 day | < 1 week | > 1 week |

### Measuring DORA

```sql
-- Deployment frequency (deploys per day, 30-day window)
select
  count(*) / 30.0 as deploys_per_day
from deploys
where deployed_at >= now() - interval '30 days'
  and environment = 'production';

-- Change failure rate
select
  count(case when caused_incident then 1 end) * 1.0 / count(*) as failure_rate
from deploys
where deployed_at >= now() - interval '30 days';

-- MTTR (mean time to recovery)
select
  avg(extract(epoch from (resolved_at - started_at)) / 3600) as mttr_hours
from incidents
where resolved_at is not null
  and started_at >= now() - interval '90 days';
```

### Team health metrics

| Metric | How to measure | Target |
|--------|---------------|--------|
| Velocity | Story points per sprint | Stable (not maximized) |
| Unplanned work % | Unplanned pts / total pts | < 20% |
| Cycle time | Story created → merged | < 3 days |
| PR size | Lines changed per PR | < 400 lines |
| Test coverage | % branches covered | ≥ 80% |
| On-call burden | Pages per engineer per week | < 2 |

---

## Working Agreements Template

```markdown
## Team Working Agreements — [Team Name]

### Communication
- Default async: Slack for non-urgent, PR comments for code
- Response time: < 4h during business hours for direct messages
- Meeting-free blocks: Tuesday and Thursday 9am-12pm

### Code review
- PRs reviewed within 1 business day
- At least 1 approver required; 2 for core systems
- PR size: keep under 400 lines; break up larger changes

### On-call
- Rotation: 1 week per engineer, team of [N] = 1 week every [N] weeks
- Handoff: 30min sync at rotation end
- Runbook for every alert

### Definition of done
- Unit tests written and CI passing
- PR reviewed and approved
- Deployed to staging and manually tested
- Product sign-off for user-visible changes
- Docs updated if behavior changed

### Meetings
- All meetings have an agenda sent 24h before
- Decisions documented in the meeting notes within 24h
- Recurring meetings reviewed monthly for relevance
```

---

## Related

- [product-lifecycle](../product-lifecycle/SKILL.md) — product discovery, idea → PRD
- [incident-response](../incident-response/SKILL.md) — MTTR improvement, incident process
- `/breakdown` command — break epic into sprint-ready stories
- `/prd` command — write a Product Requirements Document
