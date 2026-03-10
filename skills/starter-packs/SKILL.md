---
name: starter-packs
description: Workflow Starter-Packs — 6 battle-tested project archetypes (REST API, React SPA, Python Pipeline, Go Service, Flutter App, Spring Boot). Bootstraps a new project with the right structure, CI, testing, and clarc rules pre-configured.
version: 1.1.0
---

# Workflow Starter-Packs

Bootstrap a new project from a battle-tested archetype with correct structure, CI, testing setup, and clarc rules pre-configured. Run via `/project-init <pack-name>`.

## When to Activate

- Starting a new project from scratch
- User runs `/project-init <pack-name>`
- User asks "set up a REST API project" or similar
- After language detection in the setup wizard
- Bootstrapping a service that must follow hexagonal architecture with correct folder structure from day one
- Onboarding a new team to clarc where a preconfigured CI, test setup, and rule set should be ready immediately
- Evaluating which archetype (rest-api, react-spa, go-service, etc.) best matches a new project's requirements

## Available Packs

| Pack | Stack | Key Skills |
|------|-------|-----------|
| `rest-api` | Node.js + Fastify, TypeScript, PostgreSQL | hexagonal-typescript, ddd-typescript, typescript-coding-standards, api-design |
| `react-spa` | React 19, TypeScript, Vite, TailwindCSS | typescript-patterns, frontend-patterns, state-management, accessibility |
| `python-pipeline` | Python 3.13+, FastAPI or CLI, pytest, ruff | ddd-python, fastapi-patterns, python-testing |
| `go-service` | Go 1.26+, Chi, sqlc, testify | go-patterns, go-testing, docker-patterns |
| `flutter-app` | Flutter 3.x, Riverpod, go_router | flutter-patterns, flutter-testing, dart-patterns |
| `spring-boot` | Java 25+, Spring Boot 4.0+, Testcontainers | hexagonal-java, ddd-java, springboot-patterns, jpa-patterns, springboot-tdd |

## Pack Specifications

### rest-api

Hexagonal Architecture (Ports & Adapters) — dependency arrows always point inward toward domain. See skill `hexagonal-typescript` for full pattern details.

```
<project>/
├── src/
│   ├── domain/
│   │   ├── model/          # entities, value objects, branded IDs (pure TS — no framework)
│   │   ├── port/
│   │   │   ├── in/         # input port interfaces (use case contracts)
│   │   │   └── out/        # output port interfaces (repository / notification contracts)
│   │   └── event/          # domain events
│   ├── application/
│   │   └── usecase/        # use case implementations — orchestrate domain + ports
│   ├── adapter/
│   │   ├── in/
│   │   │   └── http/       # Fastify route handlers, Zod schemas, request/response DTOs
│   │   └── out/
│   │       └── persistence/ # PostgreSQL repository implementations (Prisma / pg)
│   └── config/             # DI wiring only (container.ts — no business logic)
├── tests/
│   ├── unit/               # domain model + use cases (no framework, no DB)
│   ├── integration/        # adapter tests (DB, HTTP) with real infra
│   └── e2e/                # full API contract tests
├── .github/workflows/      # CI: biome lint, vitest, build, security scan
├── Dockerfile
├── docker-compose.yml      # App + PostgreSQL
├── .clarc/
└── CONTRIBUTING.md
```

**Architecture rules:**
- `domain/` has zero framework imports — no Fastify, no Prisma, no Node built-ins
- `adapter/` never imports from other adapters — only from `domain/port/`
- `config/container.ts` is the only place that wires implementations to ports (DI root)
- Value objects are immutable (`Object.freeze`), use factory functions with validation
- Typed IDs: `UserId = string & { readonly _brand: 'UserId' }` — no primitive obsession

**clarc rules installed:** `typescript`
**Skills to load:** `hexagonal-typescript`, `ddd-typescript`, `typescript-coding-standards`, `api-design`, `postgres-patterns`

**Setup steps Claude performs:**
1. `mkdir <project> && cd <project> && npm init -y`
2. Install: fastify, zod, @prisma/client, vitest, biome, tsx
3. Generate folder structure above
4. Create `src/domain/model/` baseline (one example entity with branded ID)
5. Create `src/domain/port/in/` and `src/domain/port/out/` baseline interfaces
6. Create `src/application/usecase/` baseline implementation
7. Create `src/adapter/in/http/` health route + Zod schema
8. Create `tests/unit/` baseline test (RED → GREEN in < 5 min)
9. Create `.github/workflows/ci.yml`
10. Enable Memory Bank: `mkdir .clarc`

---

### react-spa

Feature-scoped React SPA. Each feature is a self-contained module. See skill `frontend-patterns`.

```
<project>/
├── src/
│   ├── features/           # feature-scoped modules (high cohesion)
│   │   └── <feature>/
│   │       ├── components/ # feature-specific UI components
│   │       ├── hooks/      # feature-specific custom hooks
│   │       ├── store.ts    # Zustand slice for this feature
│   │       └── api.ts      # TanStack Query hooks for this feature
│   ├── shared/
│   │   ├── components/     # shared UI primitives (Button, Modal, etc.)
│   │   ├── api/            # base API client (type-safe fetch wrapper)
│   │   └── types/          # global TypeScript types
│   ├── pages/              # route-level page components (thin — delegate to features)
│   └── app/
│       ├── router.tsx      # React Router / TanStack Router config
│       └── providers.tsx   # QueryClient, ThemeProvider, etc.
├── tests/
│   ├── unit/               # pure functions, hooks (vitest)
│   └── e2e/                # Playwright user-flow tests
├── public/
├── .github/workflows/
├── vite.config.ts
└── .clarc/
```

**Architecture rules:**
- Features do NOT import from each other — only from `shared/`
- Pages are thin wrappers — business logic belongs in features
- State: Zustand slices per feature; no global god-store
- Server state: TanStack Query — no manual fetch/useEffect in components

**clarc rules installed:** `typescript`
**Skills to load:** `typescript-patterns`, `frontend-patterns`, `state-management`, `accessibility`, `e2e-testing`

---

### python-pipeline

Domain-centric Python service with hexagonal-style layering. See skills `ddd-python` and `fastapi-patterns`.

```
<project>/
├── src/<project>/
│   ├── domain/
│   │   ├── model.py        # dataclass entities + Pydantic value objects (no framework deps)
│   │   ├── ports.py        # ABC interfaces for repositories and external services
│   │   └── events.py       # domain events (dataclasses)
│   ├── application/
│   │   └── services.py     # use case / service classes — orchestrate domain + ports
│   ├── adapters/
│   │   ├── api/            # FastAPI routers + Pydantic request/response schemas
│   │   ├── persistence/    # SQLAlchemy repository implementations
│   │   └── cli.py          # Typer CLI entry point (optional)
│   └── config.py           # pydantic-settings, DI wiring
├── tests/
│   ├── unit/               # domain + application services (no DB, no HTTP)
│   └── integration/        # adapter tests (real DB via pytest-testcontainers)
├── pyproject.toml          # uv managed; ruff + mypy configured
├── Dockerfile
├── .github/workflows/
└── .clarc/
```

**Architecture rules:**
- `domain/` has zero framework imports — no FastAPI, no SQLAlchemy, no requests
- Repository interfaces (`ports.py`) are ABCs; implementations live in `adapters/persistence/`
- `application/services.py` accepts ports via constructor injection — never imports adapters directly
- All public functions have type hints; mypy strict mode enabled

**clarc rules installed:** `python`
**Skills to load:** `ddd-python`, `fastapi-patterns`, `python-patterns`, `python-testing`

---

### go-service

Idiomatic Go service using `cmd/internal/pkg` layout. Interface-based boundaries and small packages replace strict hexagonal — see skill `go-patterns`.

```
<project>/
├── cmd/<service>/
│   └── main.go             # wiring only: flag parsing, DI, server start
├── internal/
│   ├── domain/             # business types + pure domain functions
│   ├── handler/            # HTTP handlers (Chi router) — call service layer
│   ├── service/            # business logic — accepts repository interfaces
│   └── repository/         # data access — PostgreSQL via sqlc-generated code
├── pkg/                    # exported packages (if library-style)
├── migrations/             # SQL migration files (golang-migrate)
├── sqlc.yaml               # sqlc config — generates type-safe DB code
├── Makefile                # build, test, migrate, generate targets
├── Dockerfile
├── .github/workflows/
└── .clarc/
```

**Architecture rules:**
- `service/` depends only on interfaces, not concrete types — testable with mocks
- `repository/` uses sqlc-generated code — no string-interpolated SQL
- `main.go` is the only place that wires concrete types to interfaces (composition root)
- Errors: always `fmt.Errorf("context: %w", err)` — never discard
- No global state, no `init()` side effects

**clarc rules installed:** `golang`
**Skills to load:** `go-patterns`, `go-testing`, `go-patterns-advanced`, `docker-patterns`

---

### flutter-app

Clean Architecture with Riverpod — `data/domain/presentation` per feature. See skill `flutter-patterns`.

```
<project>/
├── lib/
│   ├── features/           # one directory per bounded feature
│   │   └── <feature>/
│   │       ├── data/
│   │       │   ├── models/         # JSON-serializable data models (freezed)
│   │       │   ├── repositories/   # concrete implementations (Dio, Hive)
│   │       │   └── datasources/    # remote and local data sources
│   │       ├── domain/
│   │       │   ├── entities/       # pure Dart entities (no JSON annotations)
│   │       │   ├── repositories/   # abstract repository interfaces
│   │       │   └── usecases/       # single-responsibility use case classes
│   │       └── presentation/
│   │           ├── pages/          # full-screen widgets (go_router destinations)
│   │           ├── widgets/        # feature-specific widgets
│   │           └── providers/      # Riverpod providers for this feature
│   ├── core/
│   │   ├── router/         # go_router config + route guards
│   │   ├── theme/          # ThemeData, tokens, text styles
│   │   └── utils/          # shared helpers
│   └── main.dart
├── test/
│   ├── unit/
│   ├── widget/
│   └── integration/
├── .github/workflows/
└── .clarc/
```

**Architecture rules:**
- `domain/` has zero Flutter/platform imports — pure Dart
- `presentation/` reads state only from Riverpod providers — no direct repository calls
- All widgets use `const` constructors where possible
- Repository interfaces in `domain/repositories/` — implementations in `data/repositories/`

**clarc rules installed:** `flutter`
**Skills to load:** `flutter-patterns`, `flutter-testing`, `dart-patterns`

---

### spring-boot

Hexagonal Architecture (Ports & Adapters) for Java/Spring Boot. See skills `hexagonal-java` and `ddd-java`.

```
<project>/
├── src/main/java/<pkg>/
│   ├── domain/
│   │   ├── model/          # entities, value objects as records, typed IDs (pure Java — no Spring)
│   │   ├── port/
│   │   │   ├── in/         # input port interfaces (use case contracts)
│   │   │   └── out/        # output port interfaces (repository / notification contracts)
│   │   └── event/          # domain events
│   ├── application/
│   │   └── usecase/        # @Service use case implementations — orchestrate domain + ports
│   ├── adapter/
│   │   ├── in/
│   │   │   ├── web/        # @RestController, request/response records, @Valid input
│   │   │   └── messaging/  # @KafkaListener (if needed)
│   │   └── out/
│   │       ├── persistence/ # @Repository, JPA entities, mappers, Spring Data impls
│   │       └── client/     # external HTTP clients (WebClient / RestClient)
│   └── config/             # @Configuration — bean wiring only, no business logic
├── src/test/java/<pkg>/
│   ├── unit/               # domain model + use cases (no Spring context, no DB)
│   └── integration/        # @SpringBootTest with Testcontainers (PostgreSQL)
├── Dockerfile
├── docker-compose.yml      # App + PostgreSQL
├── .github/workflows/
└── .clarc/
```

**Architecture rules:**
- `domain/` has zero Spring annotations — `@Service`, `@Component`, `@Autowired` are forbidden here
- `adapter/` never imports from other adapters — only from `domain/port/`
- `config/` is the only place that wires `@Bean` implementations to port interfaces
- Value objects: Java records with compact constructors for validation
- Constructor injection only — no `@Autowired` on fields

**clarc rules installed:** `java`
**Skills to load:** `hexagonal-java`, `ddd-java`, `springboot-patterns`, `jpa-patterns`, `springboot-tdd`

---

## Bootstrap Protocol

When `/project-init <pack>` is invoked:

1. **Validate pack name** — if unknown, list available packs
2. **Prompt for project name** — `What is your project name?`
3. **Confirm target directory** — `Create in ./<name>? [Y/n]`
4. **Load architecture skills** — load `hexagonal-<lang>` and `ddd-<lang>` before generating files
5. **Generate structure** — create directories and baseline files following the architecture rules
6. **Install clarc rules** — run `install.sh <language>` for the pack's language
7. **Run initial test** — verify the baseline test passes (RED → GREEN)
8. **Enable Memory Bank** — `mkdir .clarc` + write `.clarc/README.md`
9. **Print next steps** — what to do after setup

## Next Steps (shown after init)

```
✔ Project <name> initialized with <pack> starter-pack

Next steps:
  cd <name>
  npm install               # or: uv sync / go mod tidy / ./gradlew build
  npm test                  # verify baseline passes

clarc skills to load:
  /hexagonal-typescript     # (rest-api) or /hexagonal-java (spring-boot)
  /ddd-typescript           # (rest-api) or /ddd-java / /ddd-python
  /tdd
  /api-design
```
