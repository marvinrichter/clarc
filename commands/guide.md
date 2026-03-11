---
description: "Get a step-by-step workflow plan for a specific task using clarc components. Usage: /guide <task> — e.g. /guide add auth, /guide write E2E tests, /guide deploy to k8s"
---

# /guide

Quick routing guide — for detailed steps, each command has full instructions.

Match `$ARGUMENTS` to the closest category and route to the right command.

### auth / authentication / JWT / OAuth / RBAC
Implement auth patterns securely with tests and a security scan.
→ `/plan` → `/tdd` → `/security-review`
### testing / unit tests / integration tests / coverage
Write tests first (TDD); use `/e2e` for end-to-end critical paths.
→ `/tdd` or `/e2e`
### E2E tests / end-to-end / Playwright / Cypress
Generate and run E2E test journeys; wire into CI.
→ `/e2e`
### API / REST / endpoint / OpenAPI
Spec-first design, then plan, implement with TDD, and review.
→ `/plan` → `/tdd` → `/code-review`
### deploy / kubernetes / k8s / Helm / Terraform
Review infrastructure code, validate GitOps, check cost impact.
→ `/iac-review` → `/gitops-review` → `/finops-audit`
### database / migration / schema / SQL / ORM
Review schema and queries, then run the migration workflow.
→ `/database-review` → `/migrate`
### refactor / clean up / dead code / simplify
Audit debt, remove dead code, guard with tests, then review.
→ `/debt-audit` → `/tdd` → `/code-review`
### performance / slow / optimize / cache / N+1
Profile hotspots; review slow queries separately.
→ `/profile` → `/database-review`
### security / vulnerability / OWASP / audit
Full DevSecOps scan plus dependency vulnerability check.
→ `/security-review` → `/dep-audit`
### CI/CD / pipeline / GitHub Actions / deployment
Generate or update CI pipeline; validate GitOps for Kubernetes.
→ `/setup-ci` → `/gitops-review`
### monitoring / observability / logging / metrics
Add production observability and define SLOs.
→ `/add-observability` → `/slo`
### code review / PR review
Comprehensive review routed to the right language specialist.
→ `/code-review`
### documentation / docs / README / API docs
Sync docs, generate onboarding artefacts, review quality.
→ `/update-docs` → `/onboard` → `/docs-review`
### architecture / design / new service / system design
Explore options, create ADR, document architecture.
→ `/explore` → `/arc42`
### feature / new feature / implement
Plan, build with TDD, review, add E2E for critical paths.
→ `/plan` → `/tdd` → `/code-review` → `/e2e`
### onboarding / setup / new project / getting started
Interactive clarc onboarding; generate CONTRIBUTING.md and setup scripts.
→ `/quickstart` → `/onboard`
### dependency / packages / npm / upgrade / audit
Audit and upgrade dependencies with supply-chain awareness.
→ `/dep-audit` → `/dep-update`
### accessibility / a11y / WCAG
Comprehensive accessibility audit.
→ `/a11y-audit`
### mobile / iOS / Android / Flutter / React Native
Language-appropriate review and mobile release workflow.
→ `/code-review` → `/mobile-release`
### GraphQL / schema / resolver
Contract-first GraphQL design and review.
→ `/plan` → `/code-review`
### release / version / changelog / publish
Cut a new release with changelog and publish steps.
→ `/release`
### unknown task
When no category matches, start with planning then explore relevant context.
→ `/plan` → `/clarc-way`

---

See also: `/clarc-way` (interactive workflow guide), `/quickstart` (5-minute onboarding)
