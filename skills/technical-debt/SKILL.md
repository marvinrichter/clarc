---
name: technical-debt
description: "Technical debt management: Ward Cunningham's quadrant (Reckless/Prudent × Deliberate/Inadvertent), Martin Fowler taxonomy, quantification with SonarQube/SQALE/radon, Churn×Complexity hotspot matrix (Code Maat), Interest Rate concept, debt ticket format, Buy-vs-Pay-Down decision framework, communicating debt to non-technical stakeholders."
---

# Technical Debt Skill

Technical debt is not a bug, it's a financial metaphor. Like financial debt, some debt is strategic ("ship now, refactor later") and some is accidental ("we didn't know better"). Both accumulate *interest* — slowing down future development. This skill covers measuring, prioritizing, and paying down debt systematically.

## When to Activate

- Planning a tech-debt sprint or "hardening" quarter
- A team feels slow but can't point to what's wrong
- Communicating the cost of technical debt to non-technical stakeholders
- Deciding whether to pay down debt or continue building features
- Running a tech debt audit before a major new initiative

---

## The Debt Quadrant (Ward Cunningham + Martin Fowler)

```
                    DELIBERATE           INADVERTENT
                  ┌────────────────┬──────────────────┐
   RECKLESS       │ "No time for   │ "What's          │
                  │  design"       │  layering?"      │
                  ├────────────────┼──────────────────┤
   PRUDENT        │ "Ship now,     │ "Now we know     │
                  │  refactor      │  a better way"   │
                  │  later"        │                  │
                  └────────────────┴──────────────────┘
```

**Reckless + Deliberate**: Skipping design under time pressure. *Avoid.* The cost always exceeds the savings.

**Reckless + Inadvertent**: Lack of knowledge. *Invest in education.* Code reviews, pair programming, training.

**Prudent + Deliberate**: Strategic shortcut with documented intent. *Track and pay down.* Acceptable if the ticket exists.

**Prudent + Inadvertent**: Learned something new that invalidates old approach. *Normal engineering.* Refactor when touching the area.

---

## Measuring Technical Debt

### Complexity Metrics

**Cyclomatic Complexity** — number of independent paths through a function:
```bash
# JavaScript / TypeScript
npx complexity-report --format json src/

# Python
pip install radon
radon cc src/ -a -s  # -a: average, -s: show scores
radon mi src/ -s     # Maintainability Index

# Go
go install github.com/fzipp/gocyclo@latest
gocyclo -over 15 ./...  # Flag functions with complexity > 15

# Java (via SonarQube or standalone)
# Use SonarLint plugin in IDE for immediate feedback

# Ruby
gem install flog
flog app/
```

**Cognitive Complexity** (SonarQube, more human-aligned):
- Not just paths, but how hard the code is to *understand*
- Nested loops and conditionals cost more than flat code

**Target thresholds:**

| Rating | Cyclomatic Complexity | Action |
|--------|----------------------|--------|
| A | 1–5 | Good |
| B | 6–10 | Acceptable |
| C | 11–15 | Needs refactor |
| D | 16–25 | High debt |
| F | >25 | Critical — split immediately |

### Churn × Complexity Matrix (Adam Tornhill — Code Maat)

The most valuable metric: files that are *both* frequently changed and complex are your highest-priority debt.

```
High Complexity
     │   Low Churn         │  High Churn
     │   (complex but      │  (complex AND
     │   rarely touched)   │  frequently changed)
     │   → LOW priority    │  → HIGHEST PRIORITY
─────┼────────────────────────────────────────────
Low  │   Low Churn         │  High Churn
Complexity  (simple,      │  (simple, often changed)
     │   rarely touched)   │  → low risk
     │   → ignore          │
     └────────────────────────────────────────────
                            High Churn
```

```bash
# Git churn analysis (files changed most often last 6 months)
git log --after="6 months ago" --name-only --format="" | \
  sort | uniq -c | sort -rn | head -20

# Combine with complexity manually, or use Code Maat:
# https://github.com/adamtornhill/code-maat
git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN' > git.log
java -jar code-maat.jar -l git.log -c git2 -a coupling
```

### SonarQube / SonarCloud

```bash
# Run local SonarQube analysis
docker run -d -p 9000:9000 sonarqube:community

# Analyze (adjust for your language)
npx sonarqube-scanner \
  -Dsonar.projectKey=my-project \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000

# Key metrics to track:
# - Technical Debt Ratio (SQALE): time to fix / time to develop
# - Reliability Rating: A-E for bugs
# - Maintainability Rating: A-E for code smells
# - Coverage: % lines tested
```

**SQALE Method** — estimates debt in time:
- SonarQube calculates remediation time for each code smell
- Debt Ratio = Total Remediation Time / Estimated Development Time
- < 5%: A (low debt) | 6–10%: B | 11–20%: C | 21–50%: D | > 50%: E

---

## The Interest Rate Concept

Not all debt is equally costly. Prioritize by *interest rate*:

**High interest debt** (slows you down daily):
- God Class that everyone must modify for every new feature
- Untested core service that causes fear of change
- Database schema that makes every query an adventure

**Low interest debt** (rarely costs you anything):
- Legacy utilities nobody uses
- One-off scripts in a /scripts folder
- Internal tooling with low change frequency

```
Annual Interest = (Hours lost per week due to this debt) × 52

Example:
- Legacy authentication module
- Everyone who changes auth spends 2h extra per change
- Team changes auth ~3x/month = 6h/month = 72h/year
- At $150/h = $10,800/year in interest
- Refactor estimate: 40h = $6,000 = pays for itself in 8 months
```

---

## Debt Ticket Format

Every tracked debt item should have:

```markdown
**Title**: [Debt] UserService: God Class with 1200 lines, 15 unrelated responsibilities
**Type**: Tech Debt
**Priority**: P1

**Why This Is Debt**
UserService was originally 100 lines. Over 3 years, every team added something here
because "it's where users are handled." It now includes: auth, profile management,
notification preferences, billing history, session management.

**Current Cost (Interest)**
- Every new user feature requires touching UserService → context switch for unrelated code
- Average 2h overhead per story that touches UserService
- ~8 stories/sprint × 2h = 16h/sprint wasted = ~0.5 engineer-weeks/sprint

**Proposed Fix**
Split into: AuthService, UserProfileService, BillingService (3 services)
Extract each responsibility behind an interface first (Branch-by-Abstraction).

**Estimated Effort**
3 sprints (6 weeks) for complete separation

**Break-Even Point**
At 16h/sprint interest, 3 sprints × 2 weeks × 16h = 96h of debt cost
Refactor cost: ~80h
Pays for itself immediately after completion.

**Acceptance Criteria**
- [ ] Each service has single responsibility
- [ ] Each service has >80% test coverage
- [ ] No circular dependencies
- [ ] Original UserService deleted
```

---

## Buy-vs-Pay-Down Framework

```
Should we pay down this debt now?

1. Calculate Annual Interest Rate
   If < 10h/year: DEFER (low interest)

2. Is it on the critical path of next 2 quarters?
   Yes: PAY DOWN (blocking progress)
   No: continue to step 3

3. Is the debt accumulating? (Getting worse each sprint)
   Yes: PAY DOWN (compounding interest)
   No: MONITOR

4. What's the morale impact?
   Significant frustration, attrition risk: PAY DOWN
   Low impact: DEFER

Decision matrix:
| Interest | Growth | Critical Path | Action |
|----------|--------|---------------|--------|
| High | Yes | Yes | Pay down now (P0) |
| High | Yes | No | Pay down this quarter (P1) |
| High | No | Yes | Pay down now (P0) |
| High | No | No | Pay down next quarter (P2) |
| Low | Any | No | Defer or delete |
```

---

## Communicating Debt to Non-Technical Stakeholders

**Avoid**: "We need to refactor the UserService."
**Use**: "Our checkout team spends 4 extra hours per feature on outdated auth code. In the last year, that's cost us ~200h of engineering time — equivalent to one engineer-month. A 2-week investment now eliminates this permanently."

**Templates:**

**The Technical Debt Tax:**
> "Every new feature in [area] currently takes X% longer than it should because of accumulated debt. We're paying a monthly tax of ~[N] engineer-days. Fixing it costs [Y] days upfront, and pays for itself in [Z] months."

**The Risk Frame:**
> "This code hasn't been meaningfully tested. Every change is a risk of breaking [business-critical flow]. Last quarter this caused [incident/near-miss]. A 3-week hardening sprint would reduce this risk from HIGH to LOW."

**The Opportunity Frame:**
> "If we spend 4 weeks on tech debt now, our next feature in this area goes from 3 months to 6 weeks. That's an additional feature shipped this quarter without hiring anyone."

---

## Definition of Done for Debt Tickets

"It's ongoing" is not an acceptable state. Each debt ticket must have:

- [ ] Clear acceptance criteria (not "improve the code")
- [ ] The old code is *deleted*, not "improved"
- [ ] Test coverage meets bar (80%+ for modified areas)
- [ ] Complexity metric measurably improved (cyclomatic complexity reduced)
- [ ] Code reviewed by someone who didn't write it
- [ ] Feature flag removed (if applicable)

---

## Reference Skills

- `legacy-modernization` — patterns for replacing legacy code (Strangler Fig, Branch-by-Abstraction)
- `engineering-metrics` — measuring impact of debt reduction on DORA metrics
- `/debt-audit` — command to run a systematic debt inventory
