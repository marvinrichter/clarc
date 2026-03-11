---
description: Install, configure, and deploy Backstage — from npx create-app to production with GitHub integration, TechDocs, and Docker Compose local dev
---

# Backstage Setup Command

Set up Backstage for: $ARGUMENTS

## Your Task

Walk through Backstage installation and configuration from scratch to a running developer portal.

## Step 1 — Prerequisites Check

```bash
# Required
node --version    # Must be 18+ (LTS recommended)
yarn --version    # 1.x (Classic) — Backstage uses Yarn 1
docker --version  # For local dev with Docker Compose

# Check ports available
lsof -i :3000    # Backstage frontend
lsof -i :7007    # Backstage backend
```

## Step 2 — Create App

```bash
# Create new Backstage app
npx @backstage/create-app@latest

# Prompts:
# ? Enter a name for the app [required] → my-backstage
# ? Select database for the backend [SQLite for dev] → SQLite

cd my-backstage

# Project structure:
# packages/app/      — React frontend
# packages/backend/  — Node.js backend
# app-config.yaml    — Main configuration
# app-config.local.yaml  — Local overrides (gitignored)
```

## Step 3 — Create GitHub App

```bash
# Create GitHub App with required permissions
npx @backstage/create-github-app your-org-name

# This:
# 1. Opens GitHub App creation in browser
# 2. Downloads github-app-[id]-credentials.yaml
# 3. You copy secrets to app-config.local.yaml

# Required GitHub App permissions:
# Repository:
#   - Contents: Read (catalog discovery)
#   - Metadata: Read (required)
#   - Pull requests: Read & Write (scaffolder)
#   - Actions: Read & Write (trigger workflows)
# Organization:
#   - Members: Read (team mapping)

# Install the App on your organization
```

## Step 4 — Configure app-config.yaml

```yaml
# app-config.yaml — base configuration (commit this)
app:
  title: My Company Developer Portal
  baseUrl: http://localhost:3000

organization:
  name: My Company

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007
  database:
    client: better-sqlite3
    connection: ':memory:'

integrations:
  github:
    - host: github.com
      apps:
        - $include: github-app-credentials.yaml

catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Location, Group, User]
  locations:
    # Your org's catalog entries
    - type: github-discovery
      target: https://github.com/your-org
      rules:
        - allow: [Component, System, API, Resource]
    # Bootstrap: Backstage itself
    - type: file
      target: ../../catalog-info.yaml

techdocs:
  builder: local
  generator:
    runIn: local
  publisher:
    type: local
```

```yaml
# app-config.local.yaml — local secrets (gitignored)
integrations:
  github:
    - host: github.com
      apps:
        - appId: 12345
          webhookUrl: http://localhost:7007/api/events/http/github-app-webhook
          clientId: Iv1.abc123
          clientSecret: your-client-secret
          privateKey: |
            -----BEGIN RSA PRIVATE KEY-----
            ... paste private key here ...
            -----END RSA PRIVATE KEY-----
          webhookSecret: your-webhook-secret
```

## Step 5 — catalog-info.yaml for Backstage Itself

```yaml
# catalog-info.yaml (root of backstage repo)
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-backstage
  description: Internal Developer Portal
  annotations:
    backstage.io/techdocs-ref: dir:.
spec:
  type: website
  lifecycle: production
  owner: group:platform-team
```

## Step 6 — Local Dev with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  backstage:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - '3000:3000'  # Frontend
      - '7007:7007'  # Backend
    command: sh -c "yarn install && yarn dev"
    environment:
      - NODE_ENV=development

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: backstage
      POSTGRES_PASSWORD: backstage
      POSTGRES_DB: backstage
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start local dev
docker-compose up

# Or without Docker
yarn install
yarn dev  # Starts both frontend and backend
```

## Step 7 — Build Docker Image and Configure CI/CD

```dockerfile
# packages/backend/Dockerfile
FROM node:18-bookworm-slim AS base
WORKDIR /app

FROM base AS build
COPY package.json yarn.lock ./
COPY packages packages
RUN yarn install --frozen-lockfile
RUN yarn workspace backend build

FROM base AS production
ENV NODE_ENV=production

COPY --from=build /app/packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz
RUN yarn install --production --frozen-lockfile

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
```

```bash
docker build -t backstage-backend:latest -f packages/backend/Dockerfile .
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/backstage.yml
name: Deploy Backstage

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: yarn

      - run: yarn install --frozen-lockfile

      - name: Build
        run: yarn tsc && yarn build:all

      - name: Build Docker image
        run: |
          docker build \
            -t ${{ vars.REGISTRY }}/backstage:${{ github.sha }} \
            -f packages/backend/Dockerfile .

      - name: Push and Deploy
        run: |
          docker push ${{ vars.REGISTRY }}/backstage:${{ github.sha }}
          # Deploy to your platform (ECS, k8s, etc.)
```

## Step 8 — First Catalog Entity

```bash
# Add catalog-info.yaml to your first service repo
cat > catalog-info.yaml << 'EOF'
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  description: Description of my service
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: your-org/my-service
spec:
  type: service
  lifecycle: production
  owner: group:my-team
EOF

git add catalog-info.yaml
git commit -m "chore: add Backstage catalog entry"
git push
```

```bash
# Trigger catalog refresh in Backstage
curl -X POST http://localhost:7007/api/catalog/locations \
  -H 'Content-Type: application/json' \
  -d '{"type":"github","target":"https://github.com/your-org/my-service/blob/main/catalog-info.yaml"}'
```

## Arguments

`$ARGUMENTS` — optional focus area or target configuration. Examples:

- (empty) → full Backstage setup from scratch
- `github` → GitHub App creation and integration only (Steps 3-4)
- `techdocs` → TechDocs configuration and local build
- `docker` → Docker image build and CI/CD pipeline only (Step 7)
- `catalog` → catalog entity registration and discovery (Step 8)

## Validation Checklist

- [ ] `yarn dev` starts without errors
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] Backend health: `curl http://localhost:7007/healthcheck`
- [ ] GitHub integration connected (check Settings > Integrations in Backstage UI)
- [ ] First catalog entity visible in Catalog tab
- [ ] TechDocs renders for at least one component

## Reference Skills

- `backstage-patterns` — catalog YAML, Scaffolder templates, custom plugins
- `platform-engineering` — IDP strategy, component prioritization

## After This

- `/golden-path` — create Golden Path templates in the configured Backstage
- `/tdd` — add tests for custom Backstage plugins
