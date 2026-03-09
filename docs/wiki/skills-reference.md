# Skills Reference

Skills are knowledge files loaded on-demand when Claude detects they're relevant. They encode domain expertise: patterns, conventions, examples, anti-patterns.

## How Skills Work

Skills are not commands — they don't require invocation. Claude loads them automatically when the task context matches. You can also reference them explicitly:

```
Use the clarc-way skill to understand the development methodology.
Load the postgres-patterns skill for this query optimization.
```

## Skill Categories

### Methodology

| Skill | What it covers |
|-------|---------------|
| `clarc-way` | The clarc Way — full development methodology, skip matrix, pipeline |
| `debugging-workflow` | Systematic debugging — reproduce, isolate, hypothesize, verify |
| `tdd-workflow` | Test-Driven Development — RED/GREEN/IMPROVE cycle |
| `search-first` | Research-before-coding — find existing solutions first |
| `subagent-context-retrieval` | Progressive context loading for large codebases |

### Language Patterns

| Skill | Languages |
|-------|-----------|
| `typescript-patterns` | TypeScript strict mode, utility types, module patterns |
| `typescript-patterns-advanced` | Mapped types, conditional types, template literals |
| `python-patterns` | PEP 8, idiomatic Python, async patterns |
| `python-patterns-advanced` | Metaclasses, descriptors, protocol-based design |
| `go-patterns` | Idiomatic Go, error handling, interface design |
| `go-patterns-advanced` | Generics, concurrency patterns, testing |
| `swift-patterns` | Value types, protocols, Combine |
| `swift-patterns-advanced` | Macros, result builders, advanced concurrency |
| `rust-patterns` | Ownership, error handling, traits |
| `java-patterns` | Spring Boot, DI, hexagonal architecture |
| `kotlin-patterns` | Coroutines, null safety, sealed classes |
| `ruby-patterns` | Rails idioms, ActiveRecord, RSpec |
| `elixir-patterns` | GenServer, Supervisors, OTP design |
| `cpp-patterns` | C++20, RAII, smart pointers |
| `php-patterns` | PHP 8.4+, PSR-12, readonly classes |

### Architecture

| Skill | What it covers |
|-------|---------------|
| `hexagonal-typescript` | Ports & adapters in TypeScript |
| `hexagonal-java` | Hexagonal architecture in Java/Spring |
| `ddd-typescript` | Domain-Driven Design in TypeScript |
| `ddd-java` | DDD in Java |
| `strategic-ddd` | Bounded contexts, context mapping |
| `cqrs-event-sourcing` | CQRS patterns, event stores |
| `api-design` | REST API design, versioning, RFC 7807 errors |
| `api-contract` | Contract-first API design with OpenAPI |
| `graphql-patterns` | Schema design, resolvers, subscriptions |
| `grpc-patterns` | Protocol Buffers, streaming, service mesh |

### Infrastructure & DevOps

| Skill | What it covers |
|-------|---------------|
| `kubernetes-patterns` | Pods, Services, operators, health checks |
| `docker-patterns` | Multi-stage builds, compose, networking |
| `terraform-patterns` | IaC patterns, modules, state management |
| `ci-cd-patterns` | GitHub Actions, deployment strategies |
| `serverless-patterns` | Lambda, cold starts, event-driven |
| `edge-patterns` | Edge functions, CDN, distributed state |
| `gitops-patterns` (via skill) | ArgoCD, Flux, progressive delivery |

### Data

| Skill | What it covers |
|-------|---------------|
| `postgres-patterns` | Query optimization, indexes, RLS, Supabase |
| `database-migrations` | Schema evolution, rollback, zero-downtime |
| `nosql-patterns` | MongoDB, DynamoDB, Redis data modeling |
| `duckdb-patterns` | Embedded analytics, OLAP queries |
| `data-engineering` | Pipelines, transformations, quality |
| `caching-patterns` | Cache invalidation, TTL strategies, Redis |

### Testing

| Skill | What it covers |
|-------|---------------|
| `tdd-workflow` | TDD cycle, test isolation, mocking |
| `e2e-testing` | Playwright, test journeys, flaky test handling |
| `contract-testing` | Pact, consumer-driven contracts |
| `load-testing` | k6, Locust, performance thresholds |
| `visual-testing` | Visual regression, screenshot diffs |

### Security

| Skill | What it covers |
|-------|---------------|
| `auth-patterns` | OAuth, JWT, session management |
| `gdpr-privacy` | PII handling, consent, RTBF, DPA |
| `supply-chain-security` | SBOM, SLSA, provenance, pinned deps |
| `security-review` | OWASP checklist, threat modeling |

### AI/ML

| Skill | What it covers |
|-------|---------------|
| `llm-app-patterns` | Prompt engineering, structured output, RAG |
| `rag-patterns` | Retrieval-Augmented Generation |
| `eval-harness` | LLM evaluation frameworks |
| `cost-aware-llm-pipeline` | Token optimization, caching, model selection |
| `prompt-engineering` | System prompts, few-shot, chain-of-thought |

## Finding Skills

```
/find-skill <topic>
```

Examples:
```
/find-skill postgres
/find-skill react native
/find-skill authentication
```
