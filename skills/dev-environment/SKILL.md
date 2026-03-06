---
name: dev-environment
description: "Local development environment patterns: runtime version pinning with mise/asdf, environment variables with direnv, Dev Containers for consistent team environments, Docker Compose for local services, and pre-commit hooks."
origin: ECC
---

# Dev Environment Skill

"Works on my machine" is a solved problem. Consistent environments across the team eliminate entire classes of bugs and onboarding friction.

## When to Activate

- Setting up a new project's development environment (`/setup-dev`)
- Onboarding a new developer
- Debugging "it works on CI but not locally" problems
- Standardizing the team's Node/Python/Go version
- Setting up pre-commit hooks for automatic quality checks

---

## Runtime Version Pinning (mise)

[mise](https://mise.jdx.dev) (formerly rtx) manages Node, Python, Go, Java, and 200+ other runtimes per-project:

```toml
# .mise.toml — commit this to git
[tools]
node = "22"
python = "3.12"
go = "1.24"

[env]
NODE_ENV = "development"
```

```bash
# Install mise
curl https://mise.run | sh

# Install all tools defined in .mise.toml
mise install

# Activate (add to shell profile)
mise activate zsh >> ~/.zshrc
```

Everyone on the team runs the same versions. CI should use the same `.mise.toml`:

```yaml
# .github/workflows/ci.yml
- uses: jdx/mise-action@v2  # Reads .mise.toml automatically
```

---

## Environment Variables (direnv)

[direnv](https://direnv.net) automatically loads `.env` when you `cd` into a project directory:

```bash
# Install
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# Project setup
echo 'dotenv' > .envrc      # Load .env automatically
direnv allow                 # Approve this project
```

`.env` is gitignored. `.env.example` is committed with all variables documented.

```bash
# .env (local, gitignored)
DATABASE_URL=postgresql://app:app@localhost:5432/appdb
REDIS_URL=redis://localhost:6379

# .envrc (committed — just loads .env)
dotenv
```

---

## Dev Container (VS Code / GitHub Codespaces)

Dev Containers give every developer (and CI) the exact same environment in Docker:

```json
// .devcontainer/devcontainer.json
{
  "name": "myapp",
  "dockerComposeFile": ["../docker-compose.dev.yml", "docker-compose.devcontainer.yml"],
  "service": "app",
  "workspaceFolder": "/workspace",

  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  "postCreateCommand": "npm install && npm run db:migrate",
  "postStartCommand": "docker compose up -d postgres redis",

  "customizations": {
    "vscode": {
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "biomejs.biome"
      },
      "extensions": [
        "biomejs.biome",
        "prisma.prisma",
        "bradlc.vscode-tailwindcss"
      ]
    }
  }
}
```

```yaml
# .devcontainer/docker-compose.devcontainer.yml
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    environment:
      DATABASE_URL: postgresql://app:app@postgres:5432/appdb
      REDIS_URL: redis://redis:6379
```

---

## Docker Compose for Local Services

Run only infrastructure services locally — run the app code natively (better hot reload, debugger):

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:17-alpine
    environment: { POSTGRES_DB: appdb, POSTGRES_USER: app, POSTGRES_PASSWORD: app }
    ports: ['5432:5432']
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: [CMD, pg_isready, -U, app]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  mailpit:
    image: axllent/mailpit
    ports: ['1025:1025', '8025:8025']  # SMTP + Web UI for local email testing
    # Test emails visible at http://localhost:8025

volumes:
  postgres_data:
```

```bash
# Start services
docker compose -f docker-compose.dev.yml up -d

# Stop (keeps data)
docker compose -f docker-compose.dev.yml stop

# Reset data
docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d
```

---

## Pre-Commit Hooks (automatic quality gates)

These already exist via hooks.json — document the key ones:

| Hook | Trigger | What It Does |
|------|---------|-------------|
| Post-edit format | Edit any TS/JS file | Runs Biome/Prettier |
| Post-edit typecheck | Edit any .ts file | Runs `tsc --noEmit` |
| Console.log warning | Edit any file | Warns if console.log added |
| Pre-push reminder | git push | Prompts to review changes |

For teams without Claude Code, use [pre-commit](https://pre-commit.com):

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: lint
        name: Lint
        entry: npm run lint
        language: system
        pass_filenames: false

      - id: typecheck
        name: Type Check
        entry: npm run typecheck
        language: system
        pass_filenames: false
```

---

## Checklist

- [ ] `.mise.toml` committed with pinned runtime versions
- [ ] `.env.example` committed with all variables documented
- [ ] `.env` is in `.gitignore`
- [ ] `docker-compose.dev.yml` for local services
- [ ] README Getting Started section < 5 steps to running locally
- [ ] Local email testing (Mailpit) for features that send email
- [ ] Dev Container (optional but valuable for onboarding and Codespaces)
