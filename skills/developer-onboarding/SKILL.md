---
name: developer-onboarding
description: "Day-1 productivity engineering — code archaeology (git/CodeScene/Sourcegraph), CONTRIBUTING.md patterns, automated setup scripts, architecture tour, domain glossary, onboarding metrics (Time to First PR)"
---

# Skill: Developer Onboarding Engineering

Making new team members productive on day one — through code archaeology, automated setup, structured knowledge transfer, and measurable onboarding outcomes.

## When to Activate

- A new developer is joining the team and there is no CONTRIBUTING.md or it is outdated
- The time between joining and the first merged PR exceeds two weeks
- Developers frequently ask the same questions about the codebase in Slack
- A legacy codebase has no documentation explaining its architecture or conventions
- Setting up a new repository and planning for future team growth
- Auditing onboarding quality with Time-to-First-PR metrics
- Running `/onboard` command to generate onboarding artifacts for an existing codebase

---

## Philosophy: Day-1 Productivity

The goal of onboarding engineering is not orientation — it is making someone productive as fast as possible. Measure success with concrete milestones:

| Milestone | Target |
|-----------|--------|
| Local environment running | Day 1 |
| First merged PR (even a doc fix) | Day 1–2 |
| First bug fix merged independently | Week 1 |
| First feature delivered end-to-end | Week 2–4 |

**Anti-patterns to eliminate:**

- "Read the code, ask if you have questions" — unstructured, relies on interruptions
- Onboarding docs that were written once and never updated — worse than no docs
- Assuming every new hire has the same background — tech stack familiarity varies widely
- No buddy / no first task assigned — new hires cannot navigate alone

**Evergreen principle:** Every onboarding artefact must be maintained automatically or it will rot. Automate staleness detection. Add onboarding doc review to your release process.

---

## Code Archaeology — Understanding an Existing Codebase

When joining a legacy codebase, use structured archaeology techniques before writing a single line.

### Git history as primary source

```bash
# Understand the trajectory of a file — every change ever made
git log --follow -p src/payments/processor.ts

# Who wrote this and why? (blame + show commit context)
git blame src/payments/processor.ts
git show <commit-hash>           # read the commit message — it explains intent

# Visualise the full branch history
git log --all --oneline --graph --decorate | head -60

# Which files change together? (coupling analysis)
git log --format=format: --name-only | sort | uniq -c | sort -rn | head -20
```

### Hotspot detection — find the highest-churn files

High-churn files are where bugs live, where technical debt accumulates, and where you need to understand the most:

```bash
# Top 20 most frequently changed files in last 6 months
git log --since="6 months ago" --format=format: --name-only \
  | sort | uniq -c | sort -rn | head -20
```

Use this list to prioritise your reading order — read the hotspots first.

### Dependency graph — visualise architecture from code

```bash
# JavaScript / TypeScript — module dependency graph
npx madge --image graph.svg src/

# Python — package dependency graph
pip install pydeps
pydeps src/mypackage --max-bacon 3

# Go — package dependency graph
go mod graph | head -30
# Or with a visualiser:
go install golang.org/x/tools/cmd/godoc@latest

# Java — show dependency tree
mvn dependency:tree
./gradlew dependencies
```

### CodeScene — knowledge distribution and risk analysis

CodeScene analyses git history to answer questions that code alone cannot:

```
Key CodeScene metrics for onboarding:
├── Hotspots — complexity × churn (where bugs cluster)
├── Knowledge Map — who knows which parts of the codebase
├── Bus Factor — how many people understand each module
├── Code Churn — which files change most (ownership ambiguity)
└── Temporal Coupling — which files always change together
```

**Using CodeScene for onboarding:**
1. Import the repository into CodeScene (or use the CLI)
2. Look at the Knowledge Map — who are the experts for each module?
3. Find modules with bus factor = 1 — these need documentation urgently
4. Assign the new hire a first task in a low-bus-factor, low-complexity area

```bash
# CodeScene CLI (self-hosted)
codescene analyze --repo . --output report.html

# Or use the SaaS (free for open-source, paid for private)
# https://codescene.com
```

### Sourcegraph — cross-repository code search

Sourcegraph enables finding all usages of a function, type, or pattern across the entire codebase (or across all repositories):

```
Key Sourcegraph use cases for onboarding:
- Find all callers of a function across repos
- Find all usages of a deprecated API to assess migration scope
- Navigate large codebases without cloning everything
- Search by regex, language, file type, repo

Example searches:
  repo:myorg/api lang:go func CreateOrder    ← find function definition
  repo:myorg/.* "stripe.Charge" count:all   ← find all Stripe charge calls
  file:\.test\. (CreateOrder|updateOrder)    ← find all test files for order logic
```

### OpenGrok — self-hosted code browser for legacy systems

For large legacy codebases (Java EE, C++, COBOL) where Sourcegraph is overkill:

```bash
# Run OpenGrok with Docker
docker run -d \
  -v /path/to/source:/opengrok/src \
  -p 8080:8080 \
  opengrok/docker:latest

# Access at http://localhost:8080
# Features: full-text search, xrefs, blame, history
```

---

## CONTRIBUTING.md — the Onboarding Bible

A great CONTRIBUTING.md is the single most important onboarding document. It must be accurate, concise, and runnable. Use `/onboard contributing` to generate one automatically.

### Required sections

```markdown
# Contributing to <Project Name>

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20.0 | `nvm install 20` |
| Docker | ≥ 24.0 | https://docs.docker.com/get-docker/ |
| pnpm | ≥ 9.0 | `npm install -g pnpm` |

## Setup (one-time)

```bash
git clone https://github.com/example/repo.git
cd repo
./scripts/setup.sh          # installs deps, copies .env, starts services
```

Setup takes about 3 minutes. See [Troubleshooting](#troubleshooting) if anything fails.

## Development Workflow

```bash
# Start all services
make dev                    # or: docker compose up -d && pnpm dev

# Run tests
pnpm test                   # unit + integration
pnpm test:e2e               # Playwright E2E (requires running dev server)

# Type check + lint
pnpm check                  # runs tsc + eslint + prettier --check
```

## Branch and PR Conventions

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Write tests first (TDD preferred)
3. Ensure `pnpm check` passes before opening a PR
4. PR title must follow Conventional Commits: `feat:`, `fix:`, `docs:`, etc.
5. Request review from at least one CODEOWNER

## Code Standards

- **Formatter:** Prettier — runs on save (VSCode settings included)
- **Linter:** ESLint — `pnpm lint` or `pnpm lint:fix`
- **Type checker:** TypeScript strict — `pnpm typecheck`
- **Coverage:** 80% minimum on new code

## Architecture Overview

- `src/api/` — Express route handlers (thin — delegate to services)
- `src/services/` — Business logic (all domain operations here)
- `src/repositories/` — Data access (Prisma ORM)
- `src/domain/` — Domain types, errors, value objects
- `tests/` — Unit and integration tests (mirror src/ structure)

See [docs/architecture/arc42.md](./docs/architecture/arc42.md) for the full picture.

## Architecture Decisions

Major decisions are documented as ADRs in [docs/decisions/](./docs/decisions/).
When making a significant technical choice, create an ADR first.

## Troubleshooting

### `pnpm install` fails with EACCES
Run `sudo chown -R $USER ~/.npm` then retry.

### Docker services won't start
Run `docker compose down -v && docker compose up -d`.
Check `docker compose logs` for specific errors.

## Getting Help

- Slack: `#engineering` for general questions
- GitHub Issues: for bugs and feature requests
- Architecture questions: ping @architecture-team in `#architecture`
```

### Keeping CONTRIBUTING.md fresh

Add a staleness check to CI:

```bash
#!/bin/bash
# scripts/check-contributing-freshness.sh
# Warn if CONTRIBUTING.md has not been updated in the last 90 days

LAST_UPDATED=$(git log -1 --format="%ct" -- CONTRIBUTING.md)
NINETY_DAYS_AGO=$(date -d "90 days ago" +%s 2>/dev/null || date -v-90d +%s)

if [ "$LAST_UPDATED" -lt "$NINETY_DAYS_AGO" ]; then
  echo "WARNING: CONTRIBUTING.md has not been updated in 90+ days."
  echo "Please review for accuracy before the next team hire."
  exit 1
fi
```

---

## Automated Setup Script

A setup script is the single biggest accelerator for day-1 productivity. New hires should run one command and have a working local environment.

### Design principles

1. **Idempotent** — running `./scripts/setup.sh` twice must not break anything
2. **Fast** — target < 5 minutes on a standard developer laptop
3. **Explicit** — print every action taken; never silently skip steps
4. **Actionable errors** — when something fails, tell the user exactly what to do
5. **Cross-platform** — support macOS and Linux (WSL2 at minimum)

### Setup script template

```bash
#!/usr/bin/env bash
# scripts/setup.sh — one-command developer environment bootstrap
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
fail() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

echo "==> Setting up development environment..."

# 1. Check required tools
command -v node >/dev/null 2>&1 || fail "Node.js not found. Install via: nvm install 20"
node_version=$(node --version | cut -d. -f1 | tr -d 'v')
[ "$node_version" -ge 20 ] || fail "Node.js ≥ 20 required. Current: $(node --version)"
ok "Node.js $(node --version)"

command -v docker >/dev/null 2>&1 || fail "Docker not found. Install: https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 || fail "Docker is not running. Please start Docker Desktop."
ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ,)"

# 2. Install dependencies
echo "==> Installing dependencies..."
npm install -g pnpm@9 2>/dev/null || true
pnpm install
ok "Dependencies installed"

# 3. Configure environment
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created .env from .env.example"
  warn "Review .env and fill in required values before running the app"
else
  ok ".env already exists — skipping"
fi

# 4. Start infrastructure services
echo "==> Starting Docker services..."
docker compose up -d --wait
ok "Docker services running"

# 5. Run database migrations
echo "==> Running database migrations..."
pnpm db:migrate
ok "Database migrations applied"

# 6. Seed development data
echo "==> Seeding development data..."
pnpm db:seed
ok "Development data seeded"

# 7. Verify setup
echo "==> Verifying setup..."
pnpm typecheck && ok "TypeScript check passed" || warn "TypeScript check failed — check errors above"
pnpm test --run && ok "Tests passed" || warn "Some tests failed — review output above"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  pnpm dev       — start the development server"
echo "  pnpm test      — run the test suite"
echo "  open http://localhost:3000"
```

### Doctor command — ongoing health checks

```bash
# make doctor
.PHONY: doctor
doctor:
	@echo "==> Checking development environment..."
	@node --version | grep -qE 'v(20|21|22)' && echo "✓ Node.js OK" || echo "✗ Node.js: need v20+"
	@docker info > /dev/null 2>&1 && echo "✓ Docker running" || echo "✗ Docker not running"
	@docker compose ps --status running | grep -q postgres && echo "✓ PostgreSQL running" || echo "✗ PostgreSQL not running"
	@[ -f .env ] && echo "✓ .env present" || echo "✗ .env missing — run ./scripts/setup.sh"
	@pnpm tsc --noEmit > /dev/null 2>&1 && echo "✓ TypeScript OK" || echo "✗ TypeScript errors present"
```

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
