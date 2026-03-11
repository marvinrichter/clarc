---
description: "Analyze the current project stack and surface the most relevant clarc skills, agents, and commands for this codebase."
---

# /context

Analyze the current project and give me a curated, actionable clarc component list tailored to this codebase.

## What to Do

1. **Detect the project stack** by checking for marker files and dependencies:
   - Run: `ls *.json *.toml *.mod *.lock 2>/dev/null | head -20` and check `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, `mix.exs`, etc.
   - Check `package.json` for framework dependencies (react, next, vue, nestjs, express, etc.)
   - Note: presence of `tsconfig.json` → TypeScript, `go.mod` → Go, `Cargo.toml` → Rust, etc.

2. **Check for domain signals** in directory structure:
   - `auth/`, `middleware/`, `routes/` → API/backend
   - `components/`, `pages/`, `app/` → frontend
   - `migrations/`, `schema/`, `models/` → database-heavy
   - `k8s/`, `helm/`, `terraform/` → infra/devops
   - `tests/`, `spec/`, `__tests__/` → test coverage present

3. **Output a curated list** structured as:

```
## Project Context
Stack: <primary language + framework>
Domain: <backend | frontend | fullstack | data | infra | mobile>

## Core Skills for This Project
| Skill | Why relevant |
|-------|-------------|
| `skill-name` | one-line reason |
...

## Key Agents to Use Proactively
| Agent | When to invoke |
|-------|---------------|
| `agent-name` | situation |
...

## Most Useful Commands Right Now
| Command | What it does for this project |
|---------|-------------------------------|
| `/command` | one-line reason |
...

## Quick Wins
3 specific actions you can take right now using clarc:
1. ...
2. ...
3. ...
```

## Stack → Component Mapping Reference

**TypeScript / Next.js:**
Skills: `typescript-patterns`, `typescript-patterns-advanced`, `e2e-testing`, `state-management`, `web-performance`, `auth-patterns`
Agents: `typescript-reviewer`, `e2e-runner`, `security-reviewer`
Commands: `/typescript-review`, `/e2e`, `/a11y-audit`, `/web-perf`

**TypeScript / NestJS / Express (backend):**
Skills: `nodejs-backend-patterns`, `api-design`, `auth-patterns`, `database-migrations`, `observability`
Agents: `typescript-reviewer`, `database-reviewer`, `security-reviewer`
Commands: `/typescript-review`, `/database-review`, `/security-review`

**Go:**
Skills: `go-patterns`, `go-patterns-advanced`, `go-testing`, `go-testing-advanced`, `api-design`
Agents: `go-reviewer`, `go-build-resolver`, `security-reviewer`
Commands: `/go-review`, `/go-test`, `/go-build`

**Python / FastAPI / Django:**
Skills: `python-patterns`, `fastapi-patterns` or `django-patterns`, `python-testing`, `auth-patterns`
Agents: `python-reviewer`, `database-reviewer`, `security-reviewer`
Commands: `/python-review`, `/database-review`, `/security-review`

**Rust:**
Skills: `rust-patterns`, `rust-patterns-advanced`, `rust-testing`
Agents: `rust-reviewer`
Commands: `/rust-review`, `/rust-test`, `/rust-build`

**Java / Spring Boot:**
Skills: `springboot-patterns`, `springboot-security`, `jpa-patterns`, `java-testing`
Agents: `java-reviewer`, `database-reviewer`
Commands: `/java-review`, `/database-review`

**React / Vue / Angular (frontend):**
Skills: `frontend-patterns`, `state-management`, `accessibility`, `design-system`, `e2e-testing`
Agents: `typescript-reviewer`, `e2e-runner`, `design-critic`
Commands: `/e2e`, `/a11y-audit`, `/storybook-audit`, `/web-perf`

**Kubernetes / Terraform (infra):**
Skills: `kubernetes-patterns`, `terraform-patterns`, `gitops-patterns`, `observability`
Agents: `gitops-architect`, `finops-advisor`
Commands: `/gitops-review`, `/iac-review`, `/finops-audit`

**Any project (universal):**
Always relevant: `tdd-workflow`, `git-workflow`, `api-design`, `security-review`
Always useful agents: `planner`, `code-reviewer`, `tdd-guide`
Always useful commands: `/plan`, `/tdd`, `/code-review`, `/security-review`

## After This

- `/plan` — create implementation plan using the discovered context
- `/breakdown` — decompose the task based on context
