---
description: Generate GitHub Actions CI/CD workflows for the current project. Detects language, test runner, and deployment target, then creates build/test/lint, Docker, and deploy workflows.
---

# Setup CI

Generate GitHub Actions CI/CD workflows tailored to the current project.

## Instructions

### 1. Detect Project Configuration

Read the project:
- **Language**: TypeScript/JavaScript, Python, Go, Java
- **Package manager**: npm/pnpm/yarn/bun, pip/uv, go mod, maven/gradle
- **Test runner**: jest/vitest, pytest, go test, junit
- **Lint**: eslint/biome, ruff, golangci-lint, checkstyle
- **Type check**: tsc, mypy, go vet
- **Docker**: does `Dockerfile` exist?
- **API spec**: does `api/v1/openapi.yaml` exist? (→ add oasdiff)
- **Services needed**: check for DB client (prisma, drizzle, sqlalchemy, gorm, jpa) → add postgres service in test job

Parse `$ARGUMENTS` for target hints:
- `staging-production` — include deploy workflow with environment gates
- `staging-only` — only deploy to staging
- `pr-checks` — only the PR CI workflow (no deploy)
- (empty) — generate sensible defaults based on project

### 2. Create Directory

```bash
mkdir -p .github/workflows
```

### 3. Generate CI Workflow

Create `.github/workflows/ci.yml`:

Include:
- `on: push (main) + pull_request (main)`
- `concurrency` group to cancel superseded PR runs
- **lint** job: runs fast linting
- **typecheck** job: type checking (if applicable)
- **test** job: runs test suite with service containers (DB, Redis) if detected
- **api-breaking-changes** job: if `api/v1/openapi.yaml` exists
- **security** job: dependency audit + TruffleHog secret scan

Use the detected project commands. If a command is not found, use a sensible default and add a `# TODO: update this command` comment.

### 4. Generate Docker Workflow (if Dockerfile exists)

Create `.github/workflows/docker.yml`:
- Trigger: `workflow_run` on CI success on main
- Login to `ghcr.io` using `GITHUB_TOKEN`
- Build with `docker/build-push-action`
- Tags: `latest` + `${{ github.sha }}`
- Use GitHub Actions cache (`type=gha`)

### 5. Generate Deploy Workflow (if staging/production requested)

Create `.github/workflows/deploy.yml`:
- `deploy-staging` environment gate (auto)
- Smoke test: `curl --fail $STAGING_URL/health/ready`
- `deploy-production` environment gate (requires review)
- Notify team (via Slack webhook if `SLACK_WEBHOOK` secret mentioned)

Add placeholder deploy steps with `# TODO: replace with your deploy command` comments:
```yaml
- name: Deploy to staging
  run: |
    # TODO: replace with your deploy command
    # Examples:
    #   fly deploy --app myapp-staging
    #   railway up --service myapp-staging
    #   kubectl set image deployment/myapp app=ghcr.io/${{ github.repository }}:${{ github.sha }}
    echo "Add your deploy command here"
```

### 6. Create CODEOWNERS (if not exists)

```
# .github/CODEOWNERS
* @<your-github-username>
```

### 7. Report What Was Generated

```
CI/CD SETUP COMPLETE
════════════════════

Generated:
  .github/workflows/ci.yml          ← PR checks (lint + test + security)
  .github/workflows/docker.yml      ← Docker build + push to ghcr.io
  .github/workflows/deploy.yml      ← Deploy: staging → production

Detected:
  Language:   TypeScript
  Tests:      vitest
  Lint:       eslint + biome
  Typecheck:  tsc
  DB:         PostgreSQL (test service added)
  API spec:   ✓ (oasdiff breaking change detection added)
  Docker:     ✓

TODO (manual steps):
  1. Set up GitHub Environments: staging + production
     GitHub → Settings → Environments → Add protection rules
  2. Add secrets in GitHub → Settings → Secrets:
     DATABASE_URL, SENTRY_DSN (and any others in .env.example)
  3. Replace placeholder deploy commands in deploy.yml
  4. Add STAGING_URL to environment variables

Reference: skill ci-cd-patterns
```

## Arguments

`$ARGUMENTS` can be:
- (empty) — detect and generate appropriate workflows
- `pr-checks` — only CI workflow (no docker, no deploy)
- `full` — CI + Docker + deploy with staging and production gates
- `staging-only` — CI + Docker + staging deploy only
