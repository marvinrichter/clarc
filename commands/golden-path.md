---
description: Create a Golden Path Backstage Scaffolder template for a standard service type — generates template.yaml, skeleton files, CI/CD, and catalog-info.yaml
---

# Golden Path Command

Create a Golden Path template for: $ARGUMENTS

## Your Task

Build a complete Backstage Scaffolder template (Golden Path) for a standard service type. Includes: template definition, skeleton files, CI/CD, catalog entry.

## Step 1 — Identify Service Type

From $ARGUMENTS or ask:

```
Common service types:
- nodejs-api      — Node.js/TypeScript REST API
- python-api      — FastAPI or Flask service
- go-service      — Go HTTP service
- react-frontend  — React SPA
- next-app        — Next.js full-stack app
- java-service    — Spring Boot REST API
- worker          — Background job/queue consumer
- data-pipeline   — ETL/data processing job
```

Clarify:
- What does this service typically connect to? (DB, queue, cache)
- What CI/CD pattern? (GitHub Actions / GitLab CI)
- What deployment target? (Kubernetes / ECS / Lambda / Vercel)
- Any organization-specific patterns required?

## Step 2 — Define Template Structure

```
templates/[service-type]/
  template.yaml                    # Backstage Scaffolder definition
  skeleton/
    .github/workflows/
      ci.yml                       # CI pipeline
      deploy.yml                   # Deployment workflow
    src/
      index.${{ values.ext }}      # Entry point
    Dockerfile
    docker-compose.yml             # Local dev
    catalog-info.yaml              # Pre-filled catalog entry
    .env.example                   # Required env vars
    README.md                      # Onboarding guide
    [service-specific files]
```

## Step 3 — Generate template.yaml

```yaml
# templates/[service-type]/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: [service-type]
  title: [Human-readable name]
  description: |
    [1-2 sentence description — what does this create?
    What does a team get out of the box?]
  tags:
    - [language]
    - [framework]
  annotations:
    backstage.io/techdocs-ref: dir:.
spec:
  owner: group:platform-team
  type: service

  parameters:
    - title: Service Details
      required: [name, description, owner]
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z][a-z0-9-]*[a-z0-9]$'
          description: Lowercase with hyphens. Used as repo name and service identifier.
          ui:autofocus: true
        description:
          title: Description
          type: string
          description: What does this service do? (1-2 sentences)
        owner:
          title: Team
          type: string
          ui:field: OwnerPicker
          ui:options:
            allowedKinds: [Group]

    # Service-type-specific parameters
    - title: Configuration
      properties:
        database:
          title: Add PostgreSQL database?
          type: boolean
          default: false
        messageQueue:
          title: Add SQS queue?
          type: boolean
          default: false
        # Add relevant options for this service type

    - title: Repository
      required: [repoUrl]
      properties:
        repoUrl:
          title: Repository Location
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts: [github.com]
            allowedOwners: [your-org]
        visibility:
          title: Repository Visibility
          type: string
          default: private
          enum: [private, internal, public]

  steps:
    - id: fetch-template
      name: Fetch Template Files
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          destination: ${{ parameters.repoUrl | parseRepoUrl }}
          database: ${{ parameters.database }}
          messageQueue: ${{ parameters.messageQueue }}

    - id: publish
      name: Create GitHub Repository
      action: publish:github
      input:
        repoUrl: ${{ parameters.repoUrl }}
        description: ${{ parameters.description }}
        visibility: ${{ parameters.visibility }}
        defaultBranch: main
        gitCommitMessage: 'chore: initialize from golden path'
        gitAuthorName: Platform Team Bot
        gitAuthorEmail: platform-bot@mycompany.com

    - id: register
      name: Register in Service Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

    - id: provision-database
      name: Provision Database
      if: ${{ parameters.database }}
      action: github:actions:dispatch
      input:
        repoUrl: github.com?repo=infra&owner=your-org
        workflowId: provision-postgres.yml
        branchOrTagName: main
        workflowInputs:
          service_name: ${{ parameters.name }}
          team: ${{ parameters.owner }}
          environment: dev

  output:
    links:
      - title: Open Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in Catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
      - title: GitHub Actions
        url: ${{ steps.publish.output.remoteUrl }}/actions
    text:
      - title: Next Steps
        content: |
          Your new service is ready! Here's what to do next:

          1. Clone the repository: `git clone ${{ steps.publish.output.remoteUrl }}`
          2. Check the README for local dev setup
          3. The first CI run will fail until you add required secrets to GitHub
          4. Your service is registered in the catalog — add your teammates as members of your team

```

## Step 4 — skeleton/catalog-info.yaml

```yaml
# skeleton/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.name }}
  description: ${{ values.description }}
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: ${{ values.destination.owner }}/${{ values.destination.repo }}
  tags: []  # Add relevant tags
spec:
  type: service
  lifecycle: experimental   # Teams change to 'production' when ready
  owner: ${{ values.owner }}
```

## Step 5 — skeleton/.github/workflows/ci.yml

Generate a CI pipeline appropriate for the service type.

For Node.js:
```yaml
# skeleton/.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - run: npm run build
```

## Step 6 — skeleton/README.md

```markdown
# ${{ values.name }}

${{ values.description }}

## Quick Start

\`\`\`bash
git clone [this repo]
cd ${{ values.name }}
cp .env.example .env
# Fill in required values in .env
npm install
npm run dev
\`\`\`

## Architecture

[Brief description of what this service does and how it fits in the system]

## Prerequisites

- [ ] Required env vars (see .env.example)
{%- if values.database %}
- [ ] PostgreSQL running locally (`docker-compose up db`)
{%- endif %}

## Running Locally

\`\`\`bash
# With Docker
docker-compose up

# Without Docker
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test          # Unit + integration tests
npm run test:e2e  # E2E tests (requires running server)
\`\`\`

## Deployment

This service deploys automatically on merge to `main`.

## Ownership

**Team:** ${{ values.owner }}
**On-call:** [link to PagerDuty]
**Slack:** #[team-channel]
```

## Step 7 — Validate the Template

```bash
# Lint the template
npx @backstage/cli template:lint templates/[service-type]/template.yaml

# Dry-run scaffold locally (no GitHub)
npx @backstage/cli template:test \
  --template templates/[service-type]/template.yaml \
  --params name=test-service description="Test" owner=group:platform-team \
  --output /tmp/golden-path-output

# Inspect output
ls -la /tmp/golden-path-output/
cat /tmp/golden-path-output/catalog-info.yaml
```

## Reference Skills

- `backstage-patterns` — Scaffolder template syntax, actions, catalog YAML
- `platform-engineering` — Golden Path strategy and adoption

## After This

- `/tdd` — add tests for Golden Path templates
- `/setup-dev` — verify the Golden Path setup script works
