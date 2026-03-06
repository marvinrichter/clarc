---
description: Generate onboarding documentation for an existing codebase — README, CONTRIBUTING.md, and arc42 architecture documentation with C4 diagrams. Reads the existing code and produces accurate documentation.
---

# Onboard

Read an existing codebase and generate accurate onboarding documentation: README, CONTRIBUTING.md, and Architecture Overview.

## Instructions

### 1. Read the Codebase

Explore the project thoroughly before writing anything:
- Top-level structure (directories, key files)
- `package.json` / `pyproject.toml` / `go.mod` / `pom.xml` — project name, scripts, dependencies
- Entry point (main file, server setup)
- Key modules and their responsibilities
- Database schema (migrations, models)
- API routes (route files, OpenAPI spec if present)
- External services used (from .env.example or config files)
- Test setup and how to run tests
- CI/CD (GitHub Actions workflow files)

Parse `$ARGUMENTS`:
- (empty) → generate all three documents
- `readme` → only README.md
- `contributing` → only CONTRIBUTING.md
- `architecture` → delegate to `/arc42` (arc42 + C4 diagrams)
- `all` → all three

### 2. Generate README.md

If README.md exists, add missing sections. If it exists and is comprehensive, report what's already there and skip.

```markdown
# <Project Name>

<1-2 sentence description of what this is and what it does>

## What It Does

<3-5 bullet points of key features/capabilities>

## Architecture Overview

<1 paragraph: the main components and how they fit together>
See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Getting Started

### Prerequisites
<list based on actual runtime requirements>

### Setup
<step-by-step from cloning to running — use actual commands from package.json scripts>

### Running Tests
<actual test command>

## Available Commands

| Command | Description |
|---------|-------------|
<list from package.json scripts / Makefile / pyproject.toml>

## Environment Variables

See [.env.example](./.env.example) for all required variables.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
```

### 3. Generate CONTRIBUTING.md

```markdown
# Contributing

## Development Setup

See [README.md](./README.md#getting-started) for setup instructions.

## Development Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make changes following the coding standards below
3. Write tests (TDD preferred — write test first)
4. Ensure all checks pass: `<lint command>` + `<test command>`
5. Submit a pull request

## Code Standards

**Language:** <detected language and version>
**Formatter:** <detected formatter> — runs automatically on save
**Linter:** <detected linter> — `<lint command>`
**Tests:** <detected test framework> — `<test command>`
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

- [ ] Tests pass locally
- [ ] Coverage maintained at 80%+
- [ ] Linter passes
- [ ] Type checker passes (if applicable)
- [ ] CHANGELOG updated (for features and fixes)
- [ ] Breaking changes documented

## Project Structure

<actual directory structure with brief descriptions of each directory>

## Architecture Decisions

Major decisions are documented as ADRs in [docs/decisions/](./docs/decisions/).
```

### 4. Generate Architecture Documentation (arc42)

Architecture documentation follows the arc42 standard with C4 diagrams.
Delegate entirely to the `/arc42` command:

```
/arc42 all
```

This generates:
- `docs/architecture/arc42.md` — full 12-section arc42 document
- `docs/architecture/diagrams/context.puml` — C4 Context (Section 3)
- `docs/architecture/diagrams/container.puml` — C4 Container (Section 5)
- `docs/architecture/diagrams/component-api.puml` — C4 Component (Section 5)
- `docs/architecture/diagrams/deployment.puml` — C4 Deployment (Section 7)
- Section 9 ADR index built from `docs/decisions/`

If `/arc42` was already run (arc42.md exists), report this and skip.

> **Note:** If the project has a legacy `ARCHITECTURE.md` in the root, offer to migrate:
> "Found ARCHITECTURE.md. Migrate to arc42 in docs/architecture/arc42.md? (yes/no)"

### 5. Report

```
ONBOARDING DOCS GENERATED
══════════════════════════

Generated:
  README.md                          ← <new or updated>
  CONTRIBUTING.md                    ← <new>
  docs/architecture/arc42.md         ← <new — arc42 + C4 diagrams>
  docs/architecture/diagrams/*.puml  ← <C4 diagrams>

Architecture highlights:
  - <key component 1>
  - <key component 2>
  - External services: <list>
  - ADRs indexed: <N>
```

## Arguments

`$ARGUMENTS` can be:
- (empty) → generate all three documents
- `readme` → only README.md
- `contributing` → only CONTRIBUTING.md
- `architecture` → run /arc42 all
