# Agent Orchestration

All agents are located in `~/.claude/agents/` (installed via `install.sh`).

---

## When to Invoke Automatically

No user prompt needed — invoke these agents proactively:

| Situation | Agent to use |
|-----------|-------------|
| Complex feature request or implementation plan | **planner** |
| Architectural decision or system design | **architect** |
| New feature or bug fix | **tdd-guide** |
| Code just written or modified | **code-reviewer** (routes to specialist) |
| Code touches auth, input handling, APIs, or secrets | **security-reviewer** |
| Build fails or type errors occur | **build-error-resolver** |
| Go build or vet errors | **go-build-resolver** |
| Critical user flows need testing | **e2e-runner** |
| Documentation needs updating | **doc-updater** |
| Dead code cleanup or refactoring | **refactor-cleaner** |

---

## Haiku Tier Agents (10–15× cheaper — use for lightweight tasks)

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `summarizer-haiku` | Summaries, classification, boilerplate generation, text transformations | Summarize findings, classify severity levels, fill templates, extract patterns |

---

## Core Workflow Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `planner` | Implementation planning — produces PRD, architecture, task breakdown | Complex features, refactoring, new modules |
| `architect` | System design, scalability, technical decision-making | Architectural decisions, new services, system changes |
| `tdd-guide` | Test-Driven Development — enforces write-tests-first, 80%+ coverage | All new features, bug fixes, refactoring |
| `code-reviewer` | Code review orchestrator — routes to language specialists | After writing or modifying any code |
| `security-reviewer` | Security vulnerability detection (OWASP Top 10, secrets, SSRF, injection) | Code touching auth, input, APIs, sensitive data |
| `build-error-resolver` | Build and compile error resolution for any language | When build or type-check fails |
| `go-build-resolver` | Go-specific build, vet, and linter error resolution | When Go builds fail |
| `e2e-runner` | E2E testing with Playwright — generates, runs, and maintains test journeys | Critical user flows, regression testing |
| `refactor-cleaner` | Dead code cleanup — runs knip/depcheck/ts-prune, safely removes unused code | Code maintenance, dependency cleanup |
| `doc-updater` | Documentation and codemap specialist — updates READMEs, codemaps, guides | After structural changes, before releases |

---

## Language Reviewer Agents

Invoked by **code-reviewer** automatically based on file extension. Can also be invoked directly.

| Agent | Languages | Specialization |
|-------|-----------|----------------|
| `typescript-reviewer` | `.ts`, `.tsx`, `.js`, `.mjs` | Hexagonal architecture, DDD, type safety, security, performance |
| `go-reviewer` | `.go` | Idiomatic Go, concurrency, error handling, performance |
| `python-reviewer` | `.py` | PEP 8, Pythonic idioms, type hints, security |
| `java-reviewer` | `.java`, `.kt` | Java 25+, Spring Boot, JPA, security |
| `swift-reviewer` | `.swift` | Swift concurrency, protocol architecture, SwiftUI, DDD |
| `rust-reviewer` | `.rs` | Ownership, borrowing, async/Tokio, error handling |
| `cpp-reviewer` | `.cpp`, `.cc`, `.h`, `.hpp` | C++ Core Guidelines, C++20/23, memory safety, RAII |
| `ruby-reviewer` | `.rb`, `.rake` | Rails best practices, Brakeman security, N+1 detection |
| `elixir-reviewer` | `.ex`, `.exs` | OTP patterns, Ecto, Sobelow security, functional idioms |
| `database-reviewer` | `.sql`, `.prisma` | PostgreSQL query optimization, schema design, RLS, Supabase |

---

## Product & Strategy Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `product-evaluator` | Critically evaluates product ideas — Go/No-Go recommendation | Before implementing any new feature or product idea |
| `solution-designer` | Generates 2-4 solution options with trade-off analysis and ADR | After product-evaluator gives Go or Modify |
| `competitive-analyst` | Researches competitors — feature matrix, pricing, market gaps | During discovery, with `/discover` command |
| `feedback-analyst` | Analyzes qualitative user feedback — clusters themes, generates idea seeds | When processing support tickets, NPS, app store reviews |

---

## Specialist & Review Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `agent-quality-reviewer` | Reviews a single agent file for quality across 8 dimensions | Before shipping or updating an agent |
| `agent-system-reviewer` | Full clarc system review — orchestrates all analyzers | `/system-review full` |
| `android-reviewer` | Android/Compose code review | All Kotlin/Android code changes |
| `bash-reviewer` | Bash/shell script review | All `.sh`/`.bash` code changes |
| `c-reviewer` | C code review (C11/C17, memory safety) | All C code changes |
| `command-auditor` | Audits clarc commands for UX ergonomics | `/command-audit` |
| `contract-reviewer` | API contract break detection | Modifying REST/event/GraphQL APIs |
| `csharp-reviewer` | C#/.NET code review | All C# code changes |
| `data-architect` | Data Mesh architecture design | Designing new data platforms |
| `design-critic` | Visual design critique | Screenshots, wireframes, UI code |
| `design-system-reviewer` | Design system audit — CSS tokens, dark mode, icons, a11y, design-code consistency | Auditing frontend for design quality or before major UI release |
| `devsecops-reviewer` | Security scan for code changes | Code touching auth, APIs, infrastructure |
| `docs-architect` | Documentation strategy and platform selection | Planning or overhauling API docs |
| `finops-advisor` | Cloud cost optimization | Terraform/K8s config cost review |
| `flutter-reviewer` | Flutter/Dart code review | All Flutter code changes |
| `frontend-architect` | Micro-Frontend architecture design | Building multi-team frontend systems |
| `gitops-architect` | GitOps setup design (ArgoCD/Flux) | Setting up K8s deployment workflows |
| `hook-auditor` | Audits the clarc hook system | `/hook-audit` |
| `kotlin-reviewer` | Kotlin code review | All `.kt`/`.kts` file changes |
| `mlops-architect` | MLOps infrastructure design | Deploying or operationalizing ML models |
| `modernization-planner` | Legacy codebase modernization roadmap | Analyzing legacy systems |
| `orchestrator-designer` | Multi-agent system design | Architecting new multi-agent workflows |
| `performance-analyst` | Performance hotspot analysis | Profiling output, flamegraphs, Lighthouse |
| `php-reviewer` | PHP code review (PHP 8.4+) | All PHP code changes |
| `platform-architect` | Internal Developer Platform design | Improving developer experience at scale |
| `presentation-designer` | Slide deck design and structure | Any slide deck creation |
| `prompt-quality-scorer` | Prompt engineering quality evaluation | Auditing agent/command instructions |
| `prompt-reviewer` | System prompt and template review | Writing or auditing LLM prompts |
| `resilience-reviewer` | Failure mode and circuit breaker review | Adding external dependencies |
| `scala-reviewer` | Scala code review (Cats Effect/ZIO) | All `.scala`/`.sc` file changes |
| `sdk-architect` | SDK architecture design | Building or evolving developer SDKs |
| `skill-depth-analyzer` | Skill prompt-engineering quality analysis | `/skill-depth` command |
| `supply-chain-auditor` | Supply chain security risk analysis | Before releases, security audits |
| `article-editor` | Editorial critique for articles — structure, opening, voice, evidence, SEO | After writing an article draft (`/article-review`) |
| `talk-coach` | Talk outline and slide deck review | After drafting a presentation |
| `workflow-os-competitor-analyst` | clarc vs competitor feature comparison | `/competitive-review` command |

---

## Parallel Execution

ALWAYS invoke agents in parallel for independent tasks — never sequentially when there are no dependencies between them.

For complex analysis, use split-role sub-agents (factual reviewer, senior engineer, security expert, consistency checker).

## Multi-Agent Coordination Patterns

Use the **orchestrator** agent or `/orchestrate` command for tasks requiring 3+ agents.

Key rules:
- **Worktree isolation** (`isolation: "worktree"`) for any agent that modifies files in parallel
- **Minimal context per agent** — pass only what each agent needs, not the full problem
- **Always synthesize** — collect all agent results and produce a unified output
- **Security > quality > style** when reconciling conflicting agent recommendations — see `docs/agent-priority-hierarchy.md` for the full 5-level hierarchy and 5 conflict classes

> See skill `multi-agent-patterns` for pattern selection (Fan-Out, Split-Role, Explorer+Validator, Worktree Isolation, Sequential Pipeline) with examples.
> See skill `agent-conflict-resolution` for conflict decision trees, escalation protocol, and real-world examples.
