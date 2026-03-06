---
description: Set up a complete local development environment for a new project. Generates devcontainer.json, .env.example, docker-compose.dev.yml for services, and a Getting Started section in the README.
---

# Setup Dev

Generate everything needed for a developer to get started with this project in under 5 minutes.

## Instructions

### 1. Detect Project

Read the project:
- Language and framework
- Required services: PostgreSQL (any DB client), Redis (any cache/queue), Elasticsearch, etc.
- Package manager
- Port the app runs on (check package.json start script, main.go, etc.)
- Existing devcontainer, docker-compose.dev.yml, .env.example

Only generate what's missing.

### 2. Generate docker-compose.dev.yml

Create `docker-compose.dev.yml` for local development services only (not the app itself — developers run the app locally):

```yaml
# docker-compose.dev.yml — Local development services only
# Run: docker compose -f docker-compose.dev.yml up -d
# Stop: docker compose -f docker-compose.dev.yml down

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [CMD, pg_isready, -U, app]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Only include services the project actually uses.

### 3. Generate .env.example

Create `.env.example` with ALL environment variables the app needs, with helpful comments:

```bash
# ─── App ──────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://app:app@localhost:5432/appdb

# ─── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Auth ─────────────────────────────────────────────────────────────────────
SESSION_SECRET=change-me-32-random-bytes-minimum       # openssl rand -hex 32
JWT_ACCESS_SECRET=change-me-access                     # openssl rand -hex 32
JWT_REFRESH_SECRET=change-me-refresh                   # openssl rand -hex 32

# ─── Observability ────────────────────────────────────────────────────────────
LOG_LEVEL=info                                          # debug|info|warn|error
SENTRY_DSN=                                             # Optional, from sentry.io

# ─── External Services ────────────────────────────────────────────────────────
# STRIPE_SECRET_KEY=sk_test_...                         # From stripe.com dashboard
# SENDGRID_API_KEY=SG...                                # From sendgrid.com
```

Read all `process.env.*` / `os.environ` / `os.Getenv` calls in the codebase to ensure every variable is documented.

### 4. Generate .devcontainer/devcontainer.json

```json
{
  "name": "<project-name>",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:24",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install",
  "postStartCommand": "docker compose -f docker-compose.dev.yml up -d",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma"
      ]
    }
  }
}
```

Adjust image and extensions based on detected language.

### 5. Update README — Getting Started Section

Add or update a `## Getting Started` section in README.md:

```markdown
## Getting Started

### Prerequisites

- Node.js 22+ (or use [mise](https://mise.jdx.dev): `mise install`)
- Docker (for local services)

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd <project>
npm install

# 2. Start local services (Postgres, Redis)
docker compose -f docker-compose.dev.yml up -d

# 3. Configure environment
cp .env.example .env
# Edit .env — the defaults work for local Docker setup

# 4. Set up database
npm run db:migrate
npm run db:seed    # optional: add sample data

# 5. Start development server
npm run dev
# App available at http://localhost:3000
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run test suite |
| `npm run lint` | Run linter |
| `npm run typecheck` | Run TypeScript type checker |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open database GUI |
```

### 6. Create .mise.toml (if not exists)

```toml
# .mise.toml — Pin runtime versions for all developers
[tools]
node = "22"
# python = "3.12"
# go = "1.24"
```

### 7. Report

```
DEV ENVIRONMENT SETUP COMPLETE
════════════════════════════════

Generated:
  docker-compose.dev.yml    ← PostgreSQL + Redis (local only)
  .env.example              ← All environment variables documented
  .devcontainer/            ← VS Code Dev Container config
  .mise.toml                ← Runtime version pinning
  README.md                 ← Getting Started section added/updated

To get started:
  docker compose -f docker-compose.dev.yml up -d
  cp .env.example .env
  npm install && npm run db:migrate && npm run dev
```

## Arguments

`$ARGUMENTS` can be:
- (empty) — generate all components
- `docker` — only docker-compose.dev.yml
- `env` — only .env.example
- `devcontainer` — only .devcontainer/
- `readme` — only README Getting Started section
