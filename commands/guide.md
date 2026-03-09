---
description: "Get a step-by-step workflow plan for a specific task using clarc components. Usage: /guide <task> — e.g. /guide add auth, /guide write E2E tests, /guide deploy to k8s"
---

# /guide

Given a task description, return an ordered workflow plan using the right clarc skills, agents, and commands.

## What to Do

Parse the task the user described and match it to the closest task type below. Output:

```
## Workflow: <task name>

### Step 1 — <phase>
Command/Agent: <what to run>
Skill to read: `skill-name`
Action: <specific instruction>

### Step 2 — ...
...

### Estimated effort: <S | M | L>
### Key risks: <list>
```

## Task Type → Workflow Map

### auth / authentication / login / JWT / OAuth / permissions / RBAC
1. Read skill `auth-patterns` for the right auth pattern (JWT vs session vs OAuth)
2. `/plan` — generate implementation plan
3. `/tdd` — write auth tests first (login, logout, token refresh, unauthorized access)
4. Invoke `security-reviewer` after implementation
5. `/security` — full security scan

### testing / unit tests / integration tests / coverage
1. Read skill `tdd-workflow`
2. `/tdd` — enforce RED → GREEN → REFACTOR cycle
3. Run `/test-coverage` to identify gaps
4. For E2E: `/e2e`
5. Invoke `tdd-guide` agent if stuck

### E2E tests / end-to-end / playwright / cypress
1. Read skill `e2e-testing`
2. `/e2e` — generate and run E2E test journeys
3. Invoke `e2e-runner` agent for maintenance
4. Add to CI: `/setup-ci`

### API / REST / endpoint / route / OpenAPI
1. Read skill `api-design`
2. `/api-contract` — spec-first: write OpenAPI before code
3. `/plan` → `/tdd` → implement
4. `/typescript-review` or `/go-review` (language-appropriate)
5. `/docs-review` — review API documentation

### deploy / kubernetes / k8s / helm / infra / terraform
1. Read skill `kubernetes-patterns` or `terraform-patterns`
2. `/iac-review` — review infrastructure code
3. `/gitops-review` — validate GitOps setup
4. Invoke `gitops-architect` for design decisions
5. `/finops-audit` — check cost impact

### database / migration / schema / SQL / ORM / query
1. Read skill `database-migrations`
2. `/database-review` — review schema and queries
3. `/migrate` — database migration workflow
4. Invoke `database-reviewer` for query optimization

### refactor / clean up / dead code / simplify
1. `/debt-audit` — identify technical debt
2. Read skill `legacy-modernization` if large refactor
3. Invoke `refactor-cleaner` — find dead code
4. `/tdd` — ensure tests pass before and after
5. `/code-review` after each refactor step

### performance / slow / optimize / cache / N+1
1. Read skill `caching-patterns` or `web-performance`
2. `/profile` — guided profiling workflow
3. Invoke `performance-analyst` with profiling output
4. For frontend: `/web-perf`
5. `/database-review` if queries are slow

### security / vulnerability / OWASP / audit / pentest
1. `/security` — full DevSecOps scan
2. Invoke `security-reviewer` on affected files
3. Read skill `auth-patterns` if auth-related
4. Read skill `supply-chain-security` for dependency risks
5. `/dep-audit` — dependency vulnerability check

### CI/CD / pipeline / GitHub Actions / deployment
1. Read skill `ci-cd-patterns`
2. `/setup-ci` — generate CI pipeline
3. Read skill `deployment-patterns`
4. `/gitops-review` if Kubernetes-based

### monitoring / observability / logging / metrics / alerts
1. Read skill `observability`
2. `/add-observability` — add production observability
3. `/slo` — define SLIs and SLOs
4. Invoke `architect` for observability architecture decisions

### code review / PR review / review changes
1. `/code-review` — comprehensive review
2. Language-specific: `/typescript-review`, `/go-review`, `/python-review`, etc.
3. `/security` if touching auth/API
4. Invoke `pr-review-toolkit:review-pr` for full PR review

### documentation / docs / README / API docs
1. Read skill `api-docs-patterns`
2. `/update-docs` — sync documentation
3. `/onboard` — generate onboarding docs
4. `/docs-review` — review existing docs quality

### architecture / design / new service / microservice / system design
1. Invoke `architect` or `planner` agent
2. `/explore` — generate solution options with ADR
3. `/arc42` — document architecture decision
4. `/adr-writing` — create Architecture Decision Record

### feature / new feature / implement
1. `/plan` — create implementation plan
2. `/tdd` — TDD workflow
3. `/code-review` after implementation
4. `/e2e` for critical paths

### onboarding / setup / new project / getting started
1. `/quickstart` — clarc interactive onboarding
2. `/context` — see what's most relevant for this project
3. `/setup-dev` — set up local development environment
4. `/onboard` — generate CONTRIBUTING.md and setup scripts

### dependency / packages / npm / upgrade / audit
1. `/dep-audit` — full dependency audit
2. `/deps` — dependency upgrade workflow
3. Read skill `supply-chain-security`

### accessibility / a11y / WCAG / screen reader
1. Read skill `accessibility`
2. `/a11y-audit` — comprehensive accessibility audit
3. Read skill `accessibility-patterns`

### mobile / iOS / Android / Flutter / React Native
1. Read skill `flutter-patterns` or `react-native-patterns` or `swift-patterns`
2. Invoke `android-reviewer` or `swift-reviewer` or `flutter-reviewer`
3. `/mobile-release` — mobile release workflow

### GraphQL / schema / resolver
1. Read skill `graphql-patterns`
2. `/api-contract` — contract-first approach
3. `/code-review`

### release / version / changelog / publish
1. `/release` — cut a new release
2. Read skill `release-management`

### unknown task
If the task doesn't match a category above:
1. Start with `/plan` — let the planner agent create a structured approach
2. `/context` — check what clarc components are relevant for this project
3. Ask: "What type of task is this?" to help narrow the category
