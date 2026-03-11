---
name: developer-onboarding-advanced
description: Advanced developer onboarding — Architecture Tour (codebase walkthrough by request), anchor files, domain glossary, GitHub Issue onboarding checklist template, knowledge sharing patterns (pair programming, ADRs, Loom), and onboarding metrics (Time to First PR).
---

# Developer Onboarding — Advanced

This skill extends `developer-onboarding` with codebase navigation, structured knowledge transfer, and metrics. Load `developer-onboarding` first.

## When to Activate

- Creating an Architecture Tour document for a complex codebase
- Building a domain glossary so new hires understand the business domain
- Setting up a GitHub Issue template for new hire onboarding checklists
- Designing a structured pair-programming schedule for the first 4 weeks
- Measuring Time to First PR and diagnosing where onboarding breaks down

---

## Codebase Navigation Strategies

### Architecture Tour — a guided walk through the codebase

An Architecture Tour is a document or walkthrough that explains the codebase through the lens of a real request:

```markdown
## Architecture Tour: What happens when a user places an order?

### 1. HTTP Request arrives
**File:** `src/api/routes/orders.ts` — the Express route handler
- Validates the JWT token (`src/middleware/auth.ts`)
- Parses and validates the request body with Zod

### 2. Business logic
**File:** `src/services/OrderService.ts` — the core domain logic
- Checks inventory availability (`InventoryRepository`)
- Calculates pricing including discounts
- Emits `order.created` domain event

### 3. Persistence
**File:** `src/repositories/OrderRepository.ts` — Prisma ORM
- Inserts the order in a database transaction
- Updates inventory counts atomically

### 4. Async processing
**File:** `src/workers/OrderProcessor.ts` — BullMQ worker
- Processes payment via Stripe
- Sends confirmation email
- Fires webhook to customer's registered endpoint

### 5. Tests
**File:** `tests/services/OrderService.test.ts` — unit tests
**File:** `tests/integration/orders.test.ts` — integration tests with real DB
**File:** `tests/e2e/checkout.spec.ts` — Playwright E2E
```

### Anchor files — the 10 files every team member should know

Pin these in your README or CONTRIBUTING.md:

```markdown
## Key Files

| File | Purpose |
|------|---------|
| `src/app.ts` | Express app initialisation — all middleware registered here |
| `src/config.ts` | All environment variables and their defaults |
| `src/domain/errors.ts` | All application error types |
| `prisma/schema.prisma` | Database schema — single source of truth |
| `src/services/AuthService.ts` | Authentication and session management |
| `src/services/OrderService.ts` | Core business logic for orders |
| `tests/helpers/test-setup.ts` | Test utilities used in all test files |
| `.github/workflows/ci.yml` | CI pipeline — what runs on every PR |
| `docker-compose.yml` | Local infrastructure (DB, Redis, queues) |
| `docs/decisions/` | Architecture Decision Records — why things are the way they are |
```

### Domain Glossary

Extract and document domain-specific terminology that is not obvious to outsiders:

```markdown
## Glossary

| Term | Meaning |
|------|---------|
| **Fulfillment** | The process of picking, packing, and shipping an order |
| **Merchant** | A business selling products through our platform (not a customer) |
| **SKU** | Stock Keeping Unit — unique identifier for a specific product variant |
| **Chargeback** | A payment reversal initiated by the customer's bank |
| **Net settlement** | The payment to the merchant after platform fees are deducted |
| **Webhook fanout** | Delivering a single event to multiple registered endpoints |
```

---

## Onboarding Checklist as GitHub Issue

Create this as a GitHub Issue Template so every new hire gets their own checklist:

```markdown
<!-- .github/ISSUE_TEMPLATE/onboarding.md -->
---
name: Developer Onboarding
about: Track onboarding progress for a new team member
title: 'Onboarding: [Name]'
labels: onboarding
assignees: ''
---

## Week 1 — Setup & First PR

- [ ] Local environment running (`./scripts/setup.sh` succeeded)
- [ ] All tests passing locally
- [ ] Read CONTRIBUTING.md
- [ ] Completed Architecture Tour (read `docs/architecture/arc42.md`)
- [ ] Reviewed 5 recent PRs to understand coding style
- [ ] First PR merged (can be a documentation fix)
- [ ] Introduced to Slack channels and key contacts
- [ ] Buddy assigned: @___

## Week 2 — First Bug Fix

- [ ] Completed Code Archaeology session with buddy
- [ ] Reviewed ADRs in `docs/decisions/` (understand why key decisions were made)
- [ ] First bug fix PR opened and merged independently
- [ ] Able to run and write tests without help
- [ ] Reviewed oncall runbook (if applicable)

## Week 3–4 — First Feature

- [ ] First feature ticket picked from backlog
- [ ] Architecture decision made (ADR drafted if needed)
- [ ] Feature implemented with tests (TDD)
- [ ] Feature deployed to staging and verified
- [ ] Onboarding feedback submitted (see link below)

## Feedback

Please submit your onboarding feedback after 30 days:
[Onboarding Survey](https://forms.example.com/onboarding-feedback)
```

---

## Knowledge Sharing Patterns

### Structured pair programming (first 4 weeks)

| Week | Session type | Goal |
|------|-------------|------|
| 1 | Codebase walkthrough with buddy | Navigate independently |
| 2 | Pair on a bug fix | Debug and test patterns |
| 3 | Pair on a feature | Design and implementation |
| 4 | New hire leads, buddy observes | Confirm independence |

### Architecture Decision Records (ADRs)

New hires should read ADRs before asking "why is it this way?". Every significant decision must have an ADR — see skill `adr-writing`.

```bash
# Find all ADRs for the project
ls docs/decisions/YYYY-MM-DD-*.md

# Example ADR topics that help new hires:
# - Why we chose PostgreSQL over MongoDB
# - Why we use BullMQ instead of SQS
# - Why the order service is a monolith (not microservices yet)
# - Why we use REST and not GraphQL
```

### Video walkthroughs (Loom)

For complex operational processes, a 10-minute Loom is worth more than a 5-page doc:

```
High-value Loom topics:
- Deployment process (staging → production, feature flags)
- Incident response: how to triage, who to call, where to look
- Database migration workflow (safe, zero-downtime patterns)
- Running load tests and reading results
```

Store links in CONTRIBUTING.md or the internal wiki — not in Slack (messages get lost).

---

## Onboarding Metrics

Track these to identify where onboarding breaks down:

| Metric | How to measure | Target |
|--------|----------------|--------|
| **Time to First PR** | GitHub API: `first_closed_pr.date - hire_date` | ≤ 2 days |
| **Time to First Independent Feature** | Manually tracked in onboarding issue | ≤ 4 weeks |
| **Setup success rate** | `./scripts/setup.sh` exit code logged to monitoring | ≥ 95% |
| **Onboarding NPS** | Anonymous survey at 30 days (scale 0–10) | ≥ 8 |
| **Question frequency** | Count Slack @-mentions of senior devs from new hire | Decreasing after week 2 |

```bash
# GitHub script — time to first PR for a user
gh pr list --author "@username" --state merged --json mergedAt \
  | jq -r '.[0].mergedAt'
```

**When metrics are bad:**
- Time to First PR > 5 days → fix the setup script or CONTRIBUTING.md
- Setup success rate < 90% → run the setup on a fresh VM in CI weekly
- Onboarding NPS < 7 → run onboarding retrospective with recent hires
- Questions not decreasing → identify the knowledge gap and document it

---

## Quick Reference

```
New hire arrives:
  1. Create onboarding GitHub issue from template
  2. Assign buddy
  3. Run: ./scripts/setup.sh
  4. Read: CONTRIBUTING.md
  5. Complete: Architecture Tour
  6. First task: small PR (doc fix, test, good-first-issue)

Codebase archaeology order:
  1. git log --oneline -30          — recent history
  2. git log --format=: --name-only | sort | uniq -c | sort -rn — hotspots
  3. madge / pydeps / go mod graph  — architecture
  4. Read anchor files (listed in CONTRIBUTING.md)
  5. Architecture Tour document

When onboarding feels broken:
  1. Measure Time to First PR
  2. Run make doctor on a fresh machine
  3. Survey recent hires (anonymous)
  4. Fix the root cause — never "just ask someone"
```

## Reference

- `developer-onboarding` — code archaeology, CONTRIBUTING.md patterns, automated setup scripts
- `adr-writing` — Architecture Decision Records format and templates
- `arc42-c4` — arc42 architecture documentation with C4 diagrams
