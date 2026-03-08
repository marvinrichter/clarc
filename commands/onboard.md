---
description: Generate onboarding documentation for an existing codebase — README, CONTRIBUTING.md, arc42 architecture docs, architecture tour, setup script validation, domain glossary, and GitHub onboarding issue template.
---

# Onboard

Read an existing codebase and generate accurate onboarding documentation: README, CONTRIBUTING.md, Architecture Overview, Architecture Tour, Domain Glossary, and Onboarding Issue Template.

## Instructions

### 0. Parse Arguments

`$ARGUMENTS` can be:
- (empty) → full onboarding suite (steps 1–8)
- `readme` → only README.md
- `contributing` → only CONTRIBUTING.md
- `architecture` → delegate to `/arc42` (arc42 + C4 diagrams)
- `tour` → only Architecture Tour (step 5)
- `glossary` → only Domain Glossary (step 6)
- `checklist` → only GitHub Onboarding Issue Template (step 7)
- `setup` → only setup script audit (step 4)
- `all` → all documents

### 1. Read the Codebase

Explore the project thoroughly before writing anything:

```
Files to read:
  - Top-level directory structure
  - package.json / pyproject.toml / go.mod / pom.xml / Cargo.toml
    → project name, scripts, dependencies, language version
  - Entry point: main.ts / main.py / main.go / Application.java / src/app.ts
  - Key modules and their responsibilities (read directory names + key files)
  - Database schema: prisma/schema.prisma / migrations/ / models.py
  - API routes: routes/ / controllers/ / handlers/ / openapi.yaml
  - External services: .env.example / config/ / docker-compose.yml
  - Test setup: jest.config / pytest.ini / go test / pom.xml surefire
  - CI/CD: .github/workflows/ / .gitlab-ci.yml / Makefile
  - Existing docs: README.md / CONTRIBUTING.md / docs/
  - Setup script: scripts/setup.sh / Makefile setup target
```

Use `Glob` and `Read` — do NOT run arbitrary commands on the codebase.

Determine:
- **Primary language** (TypeScript / Python / Go / Java / Rust / other)
- **Framework** (Next.js / Express / FastAPI / Django / gin / Spring Boot / etc.)
- **Test framework** (Vitest / pytest / go test / JUnit / etc.)
- **Formatter + linter** (Prettier+ESLint / black+ruff / gofmt+golint / etc.)
- **Package manager** (npm / pnpm / yarn / pip / poetry / go modules / maven / gradle)
- **Infrastructure** (Docker Compose / Kubernetes / serverless / local only)

---

### 2. Generate README.md

If README.md exists and is comprehensive, report what's already there and skip. Otherwise add missing sections:

```markdown
# <Project Name>

<1-2 sentence description of what this is and what it does>

## What It Does

<3-5 bullet points of key features/capabilities>

## Architecture Overview

<1 paragraph: the main components and how they fit together>
See [docs/architecture/arc42.md](./docs/architecture/arc42.md) for the full picture.

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
<list based on actual runtime requirements detected>

### Setup

```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>
<actual setup command — ./scripts/setup.sh or make setup or npm install>
```

### Running Tests

```bash
<actual test command from package.json / Makefile / pyproject.toml>
```

## Available Commands

| Command | Description |
|---------|-------------|
<list from package.json scripts / Makefile / pyproject.toml>

## Environment Variables

See [.env.example](./.env.example) for all required variables.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
```

---

### 3. Generate CONTRIBUTING.md

Generate a CONTRIBUTING.md that is specific to this project's actual tools and conventions — not generic boilerplate.

```markdown
# Contributing to <Project Name>

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
<detected tools with exact versions from config files>

## Setup (one-time)

```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>
<actual setup command>
```

Setup takes about X minutes. See [Troubleshooting](#troubleshooting) if anything fails.

## Development Workflow

```bash
# Start the development environment
<actual dev command>

# Run all tests
<actual test command>

# Type check and lint
<actual check command>
```

## Branch and PR Conventions

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Write tests first (TDD preferred)
3. Ensure `<check command>` passes before opening a PR
4. PR title must follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
5. Request review from at least one code owner

## Code Standards

**Language:** <detected>
**Formatter:** <detected> — runs automatically on save (editor settings included if found)
**Linter:** <detected> — `<lint command>`
**Type checker:** <detected if applicable>
**Coverage:** 80% minimum on new code

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org):
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — refactoring (no behavior change)
- `test:` — tests only
- `docs:` — documentation only
- `chore:` — tooling, dependencies

## Pull Request Checklist

- [ ] Tests pass locally (`<test command>`)
- [ ] Coverage maintained at 80%+
- [ ] Linter passes (`<lint command>`)
- [ ] Type checker passes (if applicable)
- [ ] CHANGELOG updated (for user-facing features and bug fixes)
- [ ] Breaking changes documented in PR description

## Project Structure

<actual directory structure — read top-level dirs + key files>

## Architecture Overview

See [docs/architecture/arc42.md](./docs/architecture/arc42.md) for the full arc42 architecture document.

**Key files every developer should know:**
<list 5-10 anchor files from the codebase>

## Architecture Decisions

Major decisions are documented as ADRs in [docs/decisions/](./docs/decisions/).
Read these before asking "why is it this way?".

## Troubleshooting

<generate troubleshooting entries based on common failure points detected in setup script or docker-compose.yml>

## Getting Help

- Questions: open a GitHub Discussion or ask in the team's Slack channel
- Bugs: open a GitHub Issue
- Security issues: see SECURITY.md (if present)
```

---

### 4. Audit the Setup Script

Find the setup script (`scripts/setup.sh` / `Makefile setup` / `package.json postinstall` / etc.) and evaluate it against these criteria:

| Criterion | Check |
|-----------|-------|
| **Exists** | Is there a one-command bootstrap? |
| **Idempotent** | Can it be run twice safely? Look for `[ -f .env ] \|\| cp .env.example .env` patterns |
| **Fast** | Estimates time — no unnecessary downloads or rebuilds |
| **Actionable errors** | Uses `|| fail "message: install X via Y"` pattern |
| **Cross-platform** | Handles macOS vs Linux differences |
| **Doctor command** | Is there a `make doctor` or `./scripts/check.sh` for ongoing health checks? |
| **Version checks** | Validates required tool versions, not just presence |

Report findings as PASS / WARN / FAIL per criterion with suggested fixes.

If no setup script exists, generate a skeleton based on the detected stack:

```bash
# scripts/setup.sh skeleton generated by /onboard
#!/usr/bin/env bash
set -euo pipefail
fail() { echo "✗ $*" >&2; exit 1; }
ok()   { echo "✓ $*"; }

# 1. Check tools
command -v <runtime> >/dev/null 2>&1 || fail "<Runtime> not found. Install via: <instructions>"
ok "<Runtime> $(<runtime> --version)"

# 2. Install dependencies
<package manager install command>
ok "Dependencies installed"

# 3. Configure environment
[ -f .env ] || cp .env.example .env && ok "Created .env — review required values"

# 4. Start services
<docker compose up -d or equivalent>
ok "Services started"

# 5. Migrate database (if applicable)
<migration command>
ok "Database ready"

echo "Setup complete. Run: <dev command>"
```

---

### 5. Generate Architecture Tour

An Architecture Tour explains the codebase through the lens of a real, concrete user action — tracing a request end-to-end:

Identify the most important user flow (e.g., creating a resource, logging in, processing a payment) by reading the routes and services.

```markdown
# Architecture Tour: What happens when a user <does X>?

## Overview

<1 paragraph description of the system and the flow being traced>

## Step 1 — <First layer, e.g. HTTP Request>

**File:** `<actual file path>`
- <What this file does in this flow>
- <Key decision or pattern used here>

## Step 2 — <Second layer, e.g. Business Logic>

**File:** `<actual file path>`
- <What this file does>
- <Dependencies it calls>

## Step 3 — <Third layer, e.g. Persistence>

**File:** `<actual file path>`
- <Database interaction>
- <Transaction or consistency pattern>

## Step 4 — <Async or side effects, if applicable>

**File:** `<actual file path>`
- <Background job, event, webhook, email, etc.>

## Tests for this flow

| Layer | Test file |
|-------|-----------|
| Unit | `<path>` |
| Integration | `<path>` |
| E2E | `<path>` (if present) |

## Key Files Every Developer Should Know

| File | Purpose |
|------|---------|
<list 5-10 anchor files identified from the codebase>
```

---

### 6. Generate Domain Glossary

Extract domain-specific terminology from the codebase:

1. Read entity names from the database schema (Prisma / SQLAlchemy / JPA models)
2. Read domain type names from `src/domain/` or equivalent (value objects, aggregates)
3. Read enum values and their comments
4. Read constant names in `src/constants.ts` or equivalent
5. Read ADR titles in `docs/decisions/` for important concepts

Generate:

```markdown
# Domain Glossary

Terms that are specific to this system and may not be obvious to a new developer.

| Term | Definition |
|------|-----------|
| **<Term>** | <Definition derived from code and comments> |
| **<Term>** | <Definition> |
```

If fewer than 5 domain terms are found, note that and add a placeholder for the team to fill in.

---

### 7. Generate GitHub Onboarding Issue Template

```markdown
<!-- .github/ISSUE_TEMPLATE/onboarding.md -->
---
name: Developer Onboarding
about: Track onboarding progress for a new team member
title: 'Onboarding: [Name]'
labels: onboarding
assignees: ''
---

## Welcome to <Project Name>!

Buddy assigned: @___
Start date: ___

## Week 1 — Setup & First PR

- [ ] Local environment running (`<setup command>` succeeded)
- [ ] All tests passing locally (`<test command>`)
- [ ] Read [CONTRIBUTING.md](./CONTRIBUTING.md)
- [ ] Completed Architecture Tour (`docs/onboarding/architecture-tour.md`)
- [ ] Reviewed 5 recent merged PRs to understand coding style
- [ ] First PR merged (can be a documentation fix or good-first-issue)

## Week 2 — First Bug Fix

- [ ] Read Architecture Decision Records in `docs/decisions/`
- [ ] Completed a Code Archaeology session with buddy (git blame, hotspot analysis)
- [ ] First bug fix PR opened and merged independently
- [ ] Can write and run tests without help

## Week 3–4 — First Feature

- [ ] First feature ticket picked from backlog
- [ ] ADR drafted (if architectural decision was needed)
- [ ] Feature implemented with tests (TDD workflow)
- [ ] Feature deployed to staging and verified

## Feedback (after 30 days)

Please share your onboarding experience so we can improve it for the next hire:
[ ] Submitted onboarding feedback
```

Save this file to `.github/ISSUE_TEMPLATE/onboarding.md`.

---

### 8. Delegate Architecture Documentation

Architecture documentation follows the arc42 standard with C4 diagrams. Delegate to the `/arc42` command:

```
/arc42 all
```

This generates:
- `docs/architecture/arc42.md` — full 12-section arc42 document
- `docs/architecture/diagrams/context.puml` — C4 Context
- `docs/architecture/diagrams/container.puml` — C4 Container
- `docs/architecture/diagrams/component-api.puml` — C4 Component
- `docs/architecture/diagrams/deployment.puml` — C4 Deployment

If `/arc42` was already run (`arc42.md` exists), skip and report.

> If the project has a legacy `ARCHITECTURE.md` in the root, offer to migrate:
> "Found ARCHITECTURE.md. Migrate to arc42 in docs/architecture/arc42.md? (yes/no)"

---

### 9. Final Report

```
DEVELOPER ONBOARDING ARTIFACTS GENERATED
══════════════════════════════════════════
Project:  <name>
Language: <detected>
Framework: <detected>

Generated:
  README.md                                   ← <new | updated | skipped (already complete)>
  CONTRIBUTING.md                             ← <new | updated>
  scripts/setup.sh                            ← <new skeleton | audit report>
  docs/onboarding/architecture-tour.md        ← <new>
  docs/onboarding/glossary.md                 ← <new — N terms>
  .github/ISSUE_TEMPLATE/onboarding.md        ← <new>
  docs/architecture/arc42.md                  ← <new — arc42 + C4 diagrams>

Setup script audit:
  Idempotent:     <PASS | WARN | FAIL>
  Fast (< 5 min): <PASS | WARN | FAIL>
  Cross-platform: <PASS | WARN | FAIL>
  Doctor command: <PASS | MISSING>

Architecture highlights:
  - Request flow traced: <user action>
  - Anchor files identified: <N>
  - Domain terms documented: <N>
  - ADRs indexed: <N>

Next steps:
  1. Fill in .env values required for local development
  2. Review and customise the onboarding GitHub Issue Template
  3. Assign a buddy to the next new hire and create their onboarding issue
```

## Related Skills

- `developer-onboarding` — code archaeology, setup script design, CONTRIBUTING.md patterns, onboarding metrics
- `arc42-c4` — architecture documentation with C4 diagrams
- `adr-writing` — Architecture Decision Records
