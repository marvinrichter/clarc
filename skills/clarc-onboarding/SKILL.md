---
name: clarc-onboarding
description: Staged learning path for clarc — Day 1 survival commands, Week 1 workflow integration, Month 1 advanced agents. Includes solo, team, and role-specific paths.
---

## When to Use

Use this skill when:
- A developer is new to clarc and needs a staged learning path
- Onboarding a team to clarc for the first time
- Starting clarc on a new project type
- Helping someone understand which clarc components matter for their role

## The Three Phases

### Day 1 — Survive (Core 5 Commands)

Get value within the first 30 minutes. Learn exactly these commands in order:

| Command | Why first |
|---------|-----------|
| `/quickstart` | Interactive setup — installs the right rules for your stack |
| `/context` | See which clarc components matter for your project |
| `/plan` | Turn a feature request into a concrete plan |
| `/code-review` | Immediate code quality feedback |
| `/tdd` | Write your first feature the right way |

**Day 1 goal:** Complete one real task (a small feature or bug fix) using `/plan` → `/tdd` → `/code-review` in sequence.

### Week 1 — Grow (Workflow Integration)

Integrate clarc into your daily workflow. Add these:

| Command/Agent | When to use it |
|--------------|---------------|
| `/guide <task>` | Any time you start a new task — get the right workflow |
| `/security-review` | Before every PR that touches auth, APIs, or user data |
| `/e2e` | For any feature with a critical user flow |
| `code-reviewer` agent | After every significant code change (or use the nudge hook) |
| `/doctor` | Weekly — verify clarc installation is healthy |

**Week 1 goal:** Run `/guide <task>` for every task this week. Notice which skills get recommended.

### Month 1 — Master (Advanced Agents)

Unlock the full workflow OS. Add these:

| Component | When it pays off |
|-----------|-----------------|
| `/orchestrate` | Complex tasks needing 3+ independent analyses |
| `architect` agent | Any architectural decision |
| `tdd-guide` agent | For disciplined TDD on complex features |
| `/debt-audit` | Monthly — identify where to invest refactoring time |
| `/instinct-report` | See what clarc has learned about your codebase |
| `/skill-create` | Extract patterns from your git history into skills |

**Month 1 goal:** Have a personal set of project-local instincts in `~/.clarc/instincts/`.

---

## Solo Developer Path

**Priority order:**
1. `/plan` + `/tdd` + `/code-review` — your core loop
2. `/security-review` — catch vulnerabilities before they reach production
3. `/guide <task>` — get the right tool for every job
4. `/instinct-report` — review what clarc has learned after 30 sessions

**What to skip initially:**
- Multi-agent orchestration (overkill for solo work)
- `/team-sync` (no team to sync with)
- CI/CD integration (do this in Month 2)

---

## Team Path

**Week 1 team setup:**
1. One person runs `/quickstart` and commits `.clarc/` config to the repo
2. Everyone installs: `npx github:marvinrichter/clarc` in the project root
3. Run `/onboard` to generate `CONTRIBUTING.md` and setup scripts
4. Add `/setup-ci` to wire clarc into the CI pipeline

**Shared conventions to establish:**
- Which hooks are disabled for this project (`.clarc/hooks-config.json`)
- Whether to commit `.clarc/skills/` for project-local skills
- Who owns the `/doctor` health check (runs weekly)

**Team commands that matter:**

| Command | Team value |
|---------|-----------|
| `/code-review` | Consistent review quality across all PRs |
| `/security-review` | Security standards enforced on every PR |
| `/e2e` | Shared E2E test suite that everyone runs |
| `/onboard` | New hires set up independently in < 5 minutes |
| `/agent-stats` | See which agents the team uses most |

---

## Role-Specific Paths

### Frontend Developer
Start with: `/context` → `/e2e` → `/a11y-audit` → `/web-perf`
Key skills: `frontend-patterns`, `state-management`, `accessibility-patterns`, `e2e-testing`

### Backend Developer
Start with: `/context` → `/tdd` → `/database-review` → `/security-review`
Key skills: `api-design`, `auth-patterns`, `database-migrations`, `observability`

### DevOps / Platform Engineer
Start with: `/context` → `/iac-review` → `/gitops-review` → `/finops-audit`
Key skills: `kubernetes-patterns`, `terraform-patterns`, `gitops-patterns`, `observability`

### Tech Lead / Architect
Start with: `/plan` → `/explore` → `/arc42` → `/debt-audit`
Key agents: `architect`, `planner`, `modernization-planner`

---

## Common Mistakes in Week 1

| Mistake | Fix |
|---------|-----|
| Using `/help` instead of `/guide <task>` | `/guide` gives you a workflow, `/help` gives you a list |
| Running `/code-review` on every line | Use the code-review-nudge hook — it suggests automatically |
| Ignoring the TDD guard nudge | The nudge fires for a reason — write the test first |
| Not reading the suggested skill | Skills contain the patterns Claude will use — read them |
| Using `/orchestrate` for simple tasks | Reserve it for tasks needing 3+ independent analyses |

---

## Quick Reference Card

```
New task?          → /guide <task description>
New project?       → /context
Implementing?      → /plan → /tdd → /code-review
Before PR?         → /security + /code-review
Architecture?      → /explore → /arc42
Build broken?      → say "fix the build" (build-error-resolver auto-triggers)
Performance issue? → /profile
Stuck?             → /clarc-way
```

---

## Example: First Session Transcript

A new developer joining a Python/FastAPI project:

```
# Day 1 — first 30 minutes

User: /quickstart
clarc: Detected Python project (FastAPI). Installing rules/python/ and core skills.
       Nudge hooks enabled. Run `/context` next to see what matters for this codebase.

User: /context
clarc: Found 3 relevant skills for this project:
       - fastapi-patterns (FastAPI routing, dependency injection, Pydantic v2)
       - python-patterns (PEP 8, type hints, dataclasses)
       - postgres-patterns (async SQLAlchemy, migrations)
       Run /plan before implementing, /tdd to write tests first.

User: /plan add user authentication with JWT
clarc: [planner agent] Breaking down: JWT token generation, login endpoint,
       dependency for protected routes, refresh token flow...
       Task list created in TODO.md.

User: /tdd implement the login endpoint
clarc: [tdd-guide agent] Writing test first:
       test_login_returns_jwt_on_valid_credentials
       test_login_returns_401_on_wrong_password
       RED: tests fail. Now implement login_router.py...

User: /code-review
clarc: [python-reviewer agent] Found 2 issues:
       HIGH: Password compared without constant-time comparison (timing attack)
       MEDIUM: JWT secret read directly from os.environ — use pydantic Settings instead.
```

**What happened:** 30 minutes, one real feature shipped, two security issues caught before PR.
