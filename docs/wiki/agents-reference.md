# Agents Reference

Agents are specialized subagents that clarc delegates work to. Most activate automatically — you don't need to invoke them manually.

## Core Workflow Agents

| Agent | Activates when | Manual command |
|-------|---------------|----------------|
| `planner` | Complex features, refactoring | `/plan` |
| `tdd-guide` | New features, bug fixes | `/tdd` |
| `code-reviewer` | After writing or modifying code | `/code-review` |
| `security-reviewer` | Code touches auth, input, APIs, secrets | `/security` |
| `architect` | Architectural decisions | `/arc42` |
| `build-error-resolver` | Build fails | `/build-fix` |
| `e2e-runner` | Critical user flows need testing | `/e2e` |
| `refactor-cleaner` | Dead code cleanup | `/refactor` |
| `doc-updater` | Documentation needs updating | `/update-docs` |

## Language Reviewer Agents

These are invoked automatically by `code-reviewer` based on file extension, or directly:

| Agent | Files | Specialization |
|-------|-------|----------------|
| `typescript-reviewer` | `.ts`, `.tsx`, `.js` | Type safety, DDD, hexagonal arch |
| `go-reviewer` | `.go` | Idiomatic Go, error handling, concurrency |
| `python-reviewer` | `.py` | PEP 8, type hints, Pythonic idioms |
| `java-reviewer` | `.java` | Spring Boot, JPA, hexagonal arch |
| `swift-reviewer` | `.swift` | SwiftUI, concurrency, protocol arch |
| `rust-reviewer` | `.rs` | Ownership, async/Tokio, error handling |
| `ruby-reviewer` | `.rb` | Rails patterns, Brakeman, N+1 detection |
| `elixir-reviewer` | `.ex`, `.exs` | OTP patterns, Ecto, Sobelow |
| `kotlin-reviewer` | `.kt` | Coroutines, null safety, Compose |
| `cpp-reviewer` | `.cpp`, `.h` | C++20, RAII, memory safety |
| `database-reviewer` | `.sql`, `.prisma` | PostgreSQL, query optimization, RLS |

## Product & Strategy Agents

| Agent | Purpose | Invoked by |
|-------|---------|-----------|
| `product-evaluator` | Go/No-Go for product ideas | `/evaluate` |
| `solution-designer` | 2–4 solution options + ADR | `/explore` |
| `competitive-analyst` | Competitor feature matrix | `/competitive-review` |
| `feedback-analyst` | Cluster themes from user feedback | `/analyze-feedback` |

## Visual Design Agents

| Agent | Purpose | Invoked by |
|-------|---------|-----------|
| `design-critic` | Structured visual critique — composition, hierarchy, color, typography, accessibility | `/design-critique` |
| `design-system-reviewer` | Comprehensive design system audit — tokens, dark mode, icons, accessibility, component completeness | manual |
| `presentation-designer` | Slide deck creation and structure — speaker notes, narrative, slide density | `/slide-deck` |
| `talk-coach` | Talk and presentation review — structure, timing, audience fit | `/talk-outline` |

## Specialist Agents

| Agent | Purpose |
|-------|---------|
| `gitops-architect` | ArgoCD/Flux setup design |
| `mlops-architect` | ML serving, drift, A/B testing |
| `finops-advisor` | Cloud cost optimization |
| `frontend-architect` | Micro-frontend architecture |
| `data-architect` | Data Mesh design |
| `sdk-architect` | SDK architecture and release process |
| `android-reviewer` | Jetpack Compose, Hilt, Room |
| `flutter-reviewer` | Flutter/Dart patterns |
| `devsecops-reviewer` | SAST, IaC misconfig, OWASP |
| `supply-chain-auditor` | SBOM, unpinned deps, unsigned artifacts |
| `performance-analyst` | Flamegraphs, N+1, profiling output |
| `resilience-reviewer` | Circuit breakers, retry patterns |

## How to Invoke an Agent Manually

In Claude Code, ask Claude to use a specific agent:

```
Use the security-reviewer agent to check my authentication module.

Use the planner agent to create an implementation plan for adding OAuth.
```

Or use the relevant slash command, which invokes the agent automatically.
