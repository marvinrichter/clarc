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

## Parallel Execution

ALWAYS invoke agents in parallel for independent tasks:

```
# GOOD: parallel
Launch 3 agents simultaneously:
1. security-reviewer → auth module
2. typescript-reviewer → new API routes
3. tdd-guide → missing test coverage

# BAD: sequential when not needed
First security-reviewer, then typescript-reviewer, then tdd-guide
```

For complex analysis, use split-role sub-agents:
- Factual reviewer
- Senior engineer perspective
- Security expert
- Consistency checker
