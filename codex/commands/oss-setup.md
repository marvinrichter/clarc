---
description: Set up open source project infrastructure for a GitHub repository — issue/PR templates, CODEOWNERS, CONTRIBUTING.md, label taxonomy, and branch protection configuration.
---

# OSS Setup

Set up the full open source governance infrastructure for this repository.

## What This Command Creates

Run through each step, creating files with sensible defaults that the user should then customize:

### 1. Issue Templates

Create `.github/ISSUE_TEMPLATE/` directory with:

- **`bug_report.yml`** — YAML form with: description, steps to reproduce, expected behaviour, version, OS dropdown. Pre-labels with `bug, needs-triage`.
- **`feature_request.yml`** — YAML form with: problem, proposed solution, alternatives, contribution checkbox. Pre-labels with `enhancement, needs-triage`.
- **`config.yml`** — Disables blank issues, links to Discussions for questions.

### 2. PR Template

Create **`.github/pull_request_template.md`** with:
- Summary section (closes #issue)
- Changes bullet list
- Test plan checklist
- Screenshots section
- Contributor checklist (read CONTRIBUTING, code style, docs updated)

### 3. CODEOWNERS

Create **`CODEOWNERS`** (or `.github/CODEOWNERS`) with:
- Global fallback: `* @<org>/core-team` (placeholder — user must replace)
- Commented examples for `/docs/`, `/src/auth/`, config files

### 4. CONTRIBUTING.md

Create **`CONTRIBUTING.md`** with:
- Dev setup section (clone, install, test, lint commands detected from project type)
- Commit format section (Conventional Commits)
- PR process section (fork, branch, test, submit)
- Code style section
- Security reporting note

Detect the project type from `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` to fill in the correct install/test/lint commands.

### 5. Label Taxonomy

Create **`docs/labels.json`** with the full label set:

```json
[
  { "name": "bug",             "color": "d73a4a", "description": "Something is broken" },
  { "name": "enhancement",     "color": "a2eeef", "description": "New feature or improvement" },
  { "name": "docs",            "color": "0075ca", "description": "Documentation change" },
  { "name": "chore",           "color": "e4e669", "description": "Maintenance, dependency updates" },
  { "name": "question",        "color": "d876e3", "description": "Further information requested" },
  { "name": "needs-triage",    "color": "fbca04", "description": "Not yet classified" },
  { "name": "in-progress",     "color": "0e8a16", "description": "Actively being worked on" },
  { "name": "blocked",         "color": "e11d48", "description": "Waiting on external dependency" },
  { "name": "needs-info",      "color": "fef3c7", "description": "Awaiting reporter response" },
  { "name": "wontfix",         "color": "ffffff", "description": "Out of scope or by design" },
  { "name": "p0-critical",     "color": "b91c1c", "description": "Production outage or data loss" },
  { "name": "p1-high",         "color": "dc2626", "description": "Major feature broken" },
  { "name": "p2-medium",       "color": "f59e0b", "description": "Minor feature broken or UX issue" },
  { "name": "p3-low",          "color": "6b7280", "description": "Nice to have" },
  { "name": "good first issue","color": "7057ff", "description": "Good for newcomers" },
  { "name": "help wanted",     "color": "008672", "description": "Extra attention needed" }
]
```

Then print the `gh label create` commands so the user can run them:

```bash
cat docs/labels.json | jq -r '.[] | "gh label create \"\(.name)\" --color \"\(.color)\" --description \"\(.description)\""'
```

### 6. Community Health Files

- **`CODE_OF_CONDUCT.md`** — Contributor Covenant v2.1 (insert contact email placeholder)
- **`SECURITY.md`** — Supported versions table, responsible disclosure process, 90-day timeline
- **`SUPPORT.md`** — Directs questions to Discussions; links to docs

### 7. Branch Protection Note

Branch protection requires admin access and cannot be fully automated without a personal access token. Print the recommended settings for the user to apply manually in GitHub Settings → Branches:

```
Required settings for branch: main
- Require PR before merging: ON
- Required approvals: 1
- Dismiss stale reviews: ON
- Require status checks: ON (select your CI job names)
- Require branches up to date: ON
- No force pushes: ON
- No deletions: ON

To apply via CLI (requires admin token):
gh api repos/<owner>/<repo>/branches/main/protection --method PUT \
  --field required_status_checks='{"strict":true,"contexts":[]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

## After Running

Remind the user to:
1. Replace `@<org>/core-team` in CODEOWNERS with actual team names
2. Add contact email in CODE_OF_CONDUCT.md and SECURITY.md
3. Run the label creation commands printed above
4. Apply branch protection rules in GitHub Settings
5. Add a release-please workflow if using automated CHANGELOG (see `open-source-governance` skill)
