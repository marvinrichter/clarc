---
name: ci-cd-patterns
description: "CI/CD pipeline patterns with GitHub Actions: build/test/lint workflows, environment gates, caching, security scanning, Docker builds, and deployment automation. Includes templates for TypeScript, Python, Go, and Java."
origin: ECC
---

# CI/CD Patterns Skill

Reliable software delivery requires automated pipelines that catch problems before they reach users. Every merge to main should run through the same quality gates that Claude Code runs locally.

## When to Activate

- Setting up CI/CD for a new project (`/setup-ci`)
- Adding a new check to an existing pipeline
- Debugging flaky or slow CI workflows
- Setting up environment-based deployment gates (staging → production)
- Adding security scanning to the pipeline
- Configuring Docker build and push in CI
- Setting up breaking change detection for APIs

---

## Pipeline Architecture

```plantuml
@startuml
start
fork
  :Lint\n(fast, < 1min);
fork again
  :Type Check\n(fast, < 2min);
fork again
  :Unit Tests\n(parallel shards);
end fork

:Integration Tests\n(needs services: DB, Redis);

if (Branch = main?) then (yes)
  :Build Docker Image\npush to registry;
  :Deploy → Staging;
  :Smoke Tests on Staging;
  if (Manual approval?) then (yes)
    :Deploy → Production;
    :Notify team;
  endif
else (PR / feature branch)
  :Report results\nto PR;
  stop
endif
stop
@enduml
```

---

## Core Workflow: PR Checks

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # Cancel superseded runs on same PR

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
      - uses: codecov/codecov-action@v4  # optional: coverage reporting
```

---

## API Breaking Change Detection

Add this job to every PR that touches `api/v1/openapi.yaml`:

```yaml
  api-breaking-changes:
    name: API Breaking Change Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Install oasdiff
        run: |
          curl -fsSL https://raw.githubusercontent.com/tufin/oasdiff/main/install.sh | sh
      - name: Check for breaking changes
        run: |
          oasdiff breaking \
            https://raw.githubusercontent.com/${{ github.repository }}/main/api/v1/openapi.yaml \
            api/v1/openapi.yaml \
            --fail-on ERR
```

---

## Docker Build & Push

```yaml
  docker:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Environment Gates: Staging → Production

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_run:
    workflows: [CI]
    branches: [main]
    types: [completed]

jobs:
  deploy-staging:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment: staging  # requires environment to be set up in GitHub settings
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to staging..."
      # Add actual deploy steps here (kubectl, fly deploy, railway up, etc.)

  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl --fail https://staging.yourapp.com/health/ready || exit 1

  deploy-production:
    needs: smoke-test
    environment:
      name: production
      url: https://yourapp.com
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to production..."
```

Set up **environment protection rules** in GitHub → Settings → Environments:
- `staging`: no protection (auto-deploy)
- `production`: require 1 reviewer approval

---

## Security Scanning

```yaml
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      # Dependency vulnerabilities
      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true  # report but don't block

      # SAST (Static Application Security Testing)
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript  # or: python, go, java
      - uses: github/codeql-action/analyze@v3

      # Secret scanning (prevent credentials in code)
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

---

## Language-Specific Templates

### Python (uv + pytest)

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
        with: { enable-cache: true }
      - run: uv sync --frozen
      - run: uv run ruff check .
      - run: uv run mypy .
      - run: uv run pytest --cov --cov-report=xml
```

### Go

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version-file: go.mod, cache: true }
      - run: go vet ./...
      - run: go test ./... -race -coverprofile=coverage.out
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v6
```

### Java (Maven)

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin', cache: 'maven' }
      - run: mvn verify
```

---

## Caching Strategy

| Language | Cache Key | What to Cache |
|----------|-----------|---------------|
| Node.js | `package-lock.json` hash | `~/.npm` |
| Python (uv) | `uv.lock` hash | `~/.cache/uv` |
| Go | `go.sum` hash | `~/.cache/go-build`, `~/go/pkg/mod` |
| Java (Maven) | `pom.xml` hash | `~/.m2` |
| Docker | `Dockerfile` + source hash | GitHub Actions cache (`type=gha`) |

Always restore cache before install, save after. Use `actions/cache@v4` or the setup actions' built-in caching.

---

## Secrets Management in CI

```yaml
# NEVER hardcode secrets in workflows
# Set them in GitHub → Settings → Secrets and Variables → Actions

env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  SENTRY_DSN: ${{ secrets.SENTRY_DSN }}

# For environment-specific secrets:
  API_KEY: ${{ secrets.STAGING_API_KEY }}  # in staging environment
  API_KEY: ${{ secrets.PRODUCTION_API_KEY }}  # in production environment
```

**Rules:**
- Production secrets only accessible from the `production` environment (with required reviewers)
- Never print secrets to logs (`echo $SECRET` → shows in logs)
- Rotate secrets on every PR merge to main if a team member leaves
- Use OIDC for cloud provider auth instead of long-lived credentials

---

## CI/CD Checklist

Before going live:

- [ ] Lint, type check, and tests run on every PR
- [ ] Tests fail the PR (not just report)
- [ ] No secrets in workflow files or codebase
- [ ] Docker images tagged with git SHA (not just `latest`)
- [ ] Staging environment gate before production
- [ ] Production environment requires manual approval
- [ ] API breaking change detection in CI (if REST API exists)
- [ ] Security scanning (dependency audit + SAST)
- [ ] Dependency caching configured (CI < 3 min for most runs)
- [ ] `concurrency` group set (cancel superseded runs on PRs)
- [ ] Health check smoke test after each deployment
- [ ] Rollback procedure documented
