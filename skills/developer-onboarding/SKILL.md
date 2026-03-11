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

**Evergreen principle:** Every onboarding artifact must be maintained automatically or it will rot. Automate staleness detection. Add onboarding doc review to your release process.

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

For codebase navigation strategies (Architecture Tour, anchor files, domain glossary), onboarding checklist GitHub Issue template, knowledge sharing patterns, and onboarding metrics (Time to First PR), see skill `developer-onboarding-advanced`.
