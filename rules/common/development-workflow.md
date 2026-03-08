# Development Workflow

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process that happens before git operations.

The full workflow covers two phases: **Product Discovery** (is this the right thing to build?) and **Feature Implementation** (how to build it well).

---

## Product Discovery Phase

> Run this phase for new features whose value or approach is not yet clear. Skip for bug fixes, refactors, chores, and features with well-defined requirements.

1. **Idea Capture** — `/idea <description>`
   - Structures the raw idea: problem statement, target user, success metric
   - Asks clarifying questions if gaps exist
   - Output: `docs/ideas/YYYY-MM-DD-<name>.md`

2. **Evaluation** — `/evaluate <name>`
   - Delegates to **product-evaluator** agent (model: Opus)
   - Assesses: problem clarity, user fit, technical feasibility, alternatives, opportunity cost
   - Produces explicit Go / No-Go / Modify recommendation
   - Output: `docs/evals/YYYY-MM-DD-<name>-eval.md`
   - **Stop here if No-Go.** Do not proceed to implementation.

3. **Solution Design** — `/explore <name>` → `/prd <name>`
   - `/explore` delegates to **solution-designer** agent: generates 2-4 options, trade-off analysis, Architecture Decision Record
   - `/prd` synthesizes idea + eval + ADR into a full Product Requirements Document
   - Output: `docs/decisions/<name>-adr.md` + `docs/specs/<name>-prd.md`
   - The PRD is directly consumed by `/overnight`, `/plan`, and `/tdd`

See skill `product-lifecycle` for the full decision criteria and document templates.

---

## Feature Implementation Workflow

0. **Research & Reuse** _(mandatory before any new implementation)_
   - **GitHub code search first:** Run `gh search repos` and `gh search code` to find existing implementations, templates, and patterns before writing anything new.
   - **Exa MCP for research:** Use `exa-web-search` MCP during the planning phase for broader research, data ingestion, and discovering prior art.
   - **Check package registries:** Search npm, PyPI, crates.io, and other registries before writing utility code. Prefer battle-tested libraries over hand-rolled solutions.
   - **Search for adaptable implementations:** Look for open-source projects that solve 80%+ of the problem and can be forked, ported, or wrapped.
   - Prefer adopting or porting a proven approach over writing net-new code when it meets the requirement.

1. **FinOps Gate** _(mandatory when adding or changing cloud infrastructure)_
   - **Infracost check**: Run `infracost breakdown --path=.` for all Terraform changes — cost estimate must be reviewed before merge
   - **Cost-review threshold**: If monthly cost increases > 10%, tag PR with `cost-review` and involve a team lead or FinOps champion
   - **Tagging standard first**: Before creating any new AWS/GCP/Azure resource, confirm the tagging taxonomy (`project`, `team`, `environment`, `owner`) is defined in Terraform locals or variables
   - **Right-size from the start**: Use the smallest instance/service tier sufficient for the workload — it's easier to scale up than to justify scale-down later
   - Skip this step for purely non-infrastructure changes (frontend features, logic-only refactors, documentation)

1. **API Contract** _(mandatory when adding or changing API endpoints or events)_
   - **Spec before code**: Write `api/v1/openapi.yaml` (REST) or `api/v1/asyncapi.yaml` (events) before any implementation
   - **Lint the spec**: `spectral lint api/v1/openapi.yaml` — must pass with zero errors
   - **Generate types/stubs**: Run code generation for affected languages (see skill `api-contract`)
   - **Breaking changes**: Any field removal, rename, or type change requires `api/v2/` — enforced by `oasdiff` in CI
   - Skip this step only for purely internal, non-API changes (e.g., refactoring, DB migrations)

2. **Plan First**
   - Use **planner** agent to create implementation plan
   - Generate planning docs before coding: PRD, architecture, system_design, tech_doc, task_list
   - Identify dependencies and risks
   - Break down into phases

3. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

4. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

5. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format
   - See [git-workflow.md](./git-workflow.md) for commit message format and PR process

---

## Architecture Documentation

Architecture is documented using **arc42 + C4 diagrams** as the single standard.

**Document location:** `docs/architecture/arc42.md` + `docs/architecture/diagrams/*.puml`

**Commands:**
- `/arc42` — generate full arc42 document for the current project (first time)
- `/arc42 section-N` — update a specific section after structural changes
- `/arc42 decisions` — rebuild the ADR index in Section 9

**When to update arc42:**

| Change | Update which section |
|--------|---------------------|
| New external service integrated | Section 3 (Context) |
| New container added (service, DB, queue) | Section 5 (Building Blocks) |
| Infrastructure or cloud topology changes | Section 7 (Deployment) |
| New cross-cutting pattern established | Section 8 (Cross-cutting Concepts) |
| ADR accepted (from `/explore`) | Section 9 — add to index |
| New quality SLO defined | Section 10 (Quality Requirements) |

**ADR flow:** `/explore` → `docs/decisions/YYYY-MM-DD-<name>-adr.md` → add to arc42 Section 9 index → `/arc42 decisions` to rebuild automatically.
