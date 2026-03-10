---
name: open-source-governance
description: "Open source project governance: GitHub issue/PR templates, CODEOWNERS, CONTRIBUTING.md structure, community health files, label taxonomy, branch protection rules, and automated CHANGELOG from Conventional Commits. For maintainers who want contributors to succeed without hand-holding every PR."
---

# Open Source Governance Skill

## When to Activate

- Launching a new open source project
- Cleaning up governance of an existing project before a public launch
- Onboarding the first external contributors
- Reducing maintainer review burden through automation
- Setting up a CHANGELOG and release process
- Configuring branch protection rules, CODEOWNERS, and required status checks to enforce quality gates on every PR
- Automating releases and CHANGELOG generation from Conventional Commits using release-please or a similar tool

---

## Issue Templates

GitHub supports YAML-based issue templates (`.github/ISSUE_TEMPLATE/`). Prefer YAML over Markdown — YAML templates render as structured forms.

### Bug report — `.github/ISSUE_TEMPLATE/bug_report.yml`

```yaml
name: Bug Report
description: Something is not working as expected
title: "[Bug]: "
labels: ["bug", "needs-triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: "Thanks for taking the time to fill out this bug report!"

  - type: textarea
    id: description
    attributes:
      label: What happened?
      description: A clear description of the bug.
      placeholder: "When I run `tool create`, it..."
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: Minimal steps to reproduce the behaviour.
      value: |
        1. Run `...`
        2. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected behaviour
      description: What did you expect to happen?
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: Version
      placeholder: "1.2.3"
    validations:
      required: true

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options: ["macOS", "Linux", "Windows"]
    validations:
      required: true
```

### Feature request — `.github/ISSUE_TEMPLATE/feature_request.yml`

```yaml
name: Feature Request
description: Suggest a new feature or improvement
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem this solves
      description: What use case is this for? Who benefits?
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: How should this work?
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: What other approaches did you consider?

  - type: checkboxes
    id: contribution
    attributes:
      label: Are you willing to contribute?
      options:
        - label: "I'd like to submit a PR for this"
```

### Config — `.github/ISSUE_TEMPLATE/config.yml`

```yaml
blank_issues_enabled: false
contact_links:
  - name: Questions & Discussions
    url: https://github.com/<org>/<repo>/discussions
    about: Use Discussions for questions, not Issues.
```

---

## PR Template — `.github/pull_request_template.md`

```markdown
## Summary

<!-- One-paragraph description of what this PR does and why. Link to the issue it closes. -->

Closes #

## Changes

<!-- Bullet list of significant changes. Focus on the "what", not the "how". -->

-

## Test Plan

<!-- How did you test this? Check all that apply. -->

- [ ] Added unit tests
- [ ] Added integration tests
- [ ] Manually tested locally
- [ ] Added to CI

## Screenshots (if applicable)

<!-- Before/after screenshots for UI changes. -->

## Checklist

- [ ] I have read the [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] My code follows the project's coding style
- [ ] I have updated documentation if needed
- [ ] Breaking changes are documented in the PR description
```

---

## CODEOWNERS

`.github/CODEOWNERS` routes review requests automatically.

```
# Global fallback — all files require review from @org/core-team
*                           @org/core-team

# Specific paths override the global rule
/docs/                      @org/docs-team
/src/auth/                  @security-lead @org/core-team
/src/payments/              @payments-lead @org/core-team

# Config files — require devops review
*.yml                       @org/devops
.github/                    @org/core-team

# Individual ownership (for solo maintainers)
/scripts/release.sh         @release-manager
```

### Rules

- Most-specific path wins (GitHub evaluates bottom-up)
- Team ownership (`@org/team`) is preferred over individual for scalability
- Don't over-specify — too many CODEOWNERS rules slow down PRs

---

## CONTRIBUTING.md

```markdown
# Contributing to <Project>

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/<org>/<repo>.git
cd <repo>

# Install dependencies
npm install   # or: pip install -e ".[dev]" / go mod download / cargo build

# Run tests
npm test      # or: pytest / go test ./... / cargo test

# Run linter
npm run lint  # or: ruff check . / golangci-lint run / cargo clippy
```

## How to Contribute

1. **Find an issue** — look for `good first issue` or `help wanted` labels
2. **Comment on the issue** to say you're working on it (avoids duplicate effort)
3. **Fork and branch** — `git checkout -b feat/your-feature`
4. **Write tests first** — we follow TDD; PRs without tests for new features will be returned
5. **Submit a PR** — fill in the PR template fully

## Commit Format

We use [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add user authentication
fix: resolve race condition in queue processor
docs: update API reference for v2 endpoints
chore: upgrade dependencies
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `ci`

## Code Style

Run `npm run lint --fix` (or language equivalent) before committing. CI will fail on lint errors.

## PR Review Process

- PRs are reviewed within 3 business days
- One approval from a code owner is required to merge
- Squash merge is preferred for clean history
- Breaking changes require a discussion issue before implementation

## Reporting Security Issues

Do **not** open a public GitHub issue for security vulnerabilities.
See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.
```

---

## Label Taxonomy

A consistent label system reduces triage overhead.

### Label definitions

```bash
# Type labels
gh label create "bug"           --color "d73a4a" --description "Something is broken"
gh label create "enhancement"   --color "a2eeef" --description "New feature or improvement"
gh label create "docs"          --color "0075ca" --description "Documentation change"
gh label create "chore"         --color "e4e669" --description "Maintenance, dependency updates"
gh label create "question"      --color "d876e3" --description "Further information requested"

# Status labels
gh label create "needs-triage"  --color "fbca04" --description "Not yet classified"
gh label create "in-progress"   --color "0e8a16" --description "Actively being worked on"
gh label create "blocked"       --color "e11d48" --description "Waiting on external dependency"
gh label create "needs-info"    --color "fef3c7" --description "Awaiting reporter response"
gh label create "wontfix"       --color "ffffff" --description "Out of scope or by design"

# Priority labels
gh label create "p0-critical"   --color "b91c1c" --description "Production outage or data loss"
gh label create "p1-high"       --color "dc2626" --description "Major feature broken"
gh label create "p2-medium"     --color "f59e0b" --description "Minor feature broken or UX issue"
gh label create "p3-low"        --color "6b7280" --description "Nice to have"

# Contributor labels
gh label create "good first issue" --color "7057ff" --description "Good for newcomers"
gh label create "help wanted"      --color "008672" --description "Extra attention needed"
```

Save as `docs/labels.json` for batch import:

```json
[
  { "name": "bug",            "color": "d73a4a", "description": "Something is broken" },
  { "name": "enhancement",    "color": "a2eeef", "description": "New feature or improvement" },
  { "name": "needs-triage",   "color": "fbca04", "description": "Not yet classified" },
  { "name": "good first issue","color": "7057ff", "description": "Good for newcomers" }
]
```

---

## Branch Protection

Configure in GitHub Settings → Branches → Branch protection rules for `main`:

| Setting | Recommended value |
|---------|------------------|
| Require PR before merging | Enabled |
| Required approvals | 1 (or 2 for high-risk repos) |
| Dismiss stale reviews on new push | Enabled |
| Require status checks to pass | Enabled (select your CI jobs) |
| Require branches to be up to date | Enabled |
| Do not allow force pushes | Enabled |
| Do not allow deletions | Enabled |

### Via GitHub CLI (requires admin token)

```bash
gh api repos/<owner>/<repo>/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/test","ci/lint"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

---

## Automated CHANGELOG

### release-please (recommended)

release-please reads Conventional Commits and opens a release PR automatically.

```yaml
# .github/workflows/release-please.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node   # or: python, go, rust
          token: ${{ secrets.GITHUB_TOKEN }}
```

### CHANGELOG.md format (maintained by release-please)

```markdown
# Changelog

## [2.1.0](https://github.com/org/repo/compare/v2.0.0...v2.1.0) (2024-03-01)

### Features

* add streaming support for chat completions ([#142](https://github.com/org/repo/issues/142)) ([a3b4c5d](https://github.com/org/repo/commit/a3b4c5d))

### Bug Fixes

* fix race condition in queue processor ([#138](https://github.com/org/repo/issues/138)) ([f1e2d3c](https://github.com/org/repo/commit/f1e2d3c))
```

---

## Community Health Files

### CODE_OF_CONDUCT.md

Use the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/):

```bash
curl -o CODE_OF_CONDUCT.md https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md
```

Replace `[INSERT CONTACT METHOD]` with your project's email or link.

### SECURITY.md

```markdown
# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: security@example.com
Response time: within 48 hours
Disclosure timeline: 90 days after fix is released

We will credit you in the CHANGELOG unless you prefer to remain anonymous.
```

### SUPPORT.md

```markdown
# Getting Support

| Type | Link |
|------|------|
| Docs | https://docs.example.com |
| Discussions (Q&A) | https://github.com/<org>/<repo>/discussions |
| Bug reports | Use the bug report issue template |
| Security issues | See SECURITY.md |

**Please do not use GitHub Issues for general questions.** Use Discussions instead.
```

---

## Checklist

- [ ] `.github/ISSUE_TEMPLATE/bug_report.yml` with YAML form fields
- [ ] `.github/ISSUE_TEMPLATE/feature_request.yml` with YAML form fields
- [ ] `.github/ISSUE_TEMPLATE/config.yml` disabling blank issues
- [ ] `.github/pull_request_template.md` with summary, changes, test plan, checklist
- [ ] `.github/CODEOWNERS` routes reviews to teams
- [ ] `CONTRIBUTING.md` covers dev setup, commit format, PR process, code style
- [ ] Label taxonomy applied via `gh label create` script
- [ ] Branch protection configured: required reviews, status checks, no force push
- [ ] release-please workflow added for automated CHANGELOG + releases
- [ ] `CODE_OF_CONDUCT.md` (Contributor Covenant)
- [ ] `SECURITY.md` with responsible disclosure process
- [ ] `SUPPORT.md` directs questions to Discussions
