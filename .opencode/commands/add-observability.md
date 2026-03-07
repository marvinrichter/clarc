---
description: Add production observability to a service — structured logging, metrics endpoint, health checks, and Sentry error tracking. Detects project type and adds the right libraries and middleware.
---

# Add Observability

Add the three pillars of production observability (Logs, Metrics, Errors + Health checks) to the current project.

## Instructions

### 1. Detect Project

Read the project to determine:
- Language and framework (TypeScript/Express/Fastify/Next.js, Python/FastAPI/Django, Go, Java/Spring)
- Package manager (npm/pnpm/yarn/bun, pip/uv, go mod, maven)
- Existing observability setup (any existing logging, metrics, or Sentry?)

If partially set up, only add what's missing.

### 2. Add Structured Logging

**TypeScript:**
- Install: `pino`, `pino-http`
- Create `src/lib/logger.ts` with pino instance (`service`, `env` base fields, JSON in prod)
- Add `pino-http` middleware to Express/Fastify app entry point
- Add correlation ID middleware (generate UUID, propagate via `X-Correlation-ID` header)

**Python:**
- Install: `structlog`
- Create `app/core/logging.py` with structlog config (JSON in prod, console in dev)
- Add middleware for correlation ID via `structlog.contextvars`

**Go:**
- Use stdlib `log/slog` with `NewJSONHandler`
- Add correlation ID middleware that puts logger in request context

**Java/Spring Boot:**
- Logback is already included — configure `logback-spring.xml` for JSON output
- Add MDC filter for correlation ID

### 3. Add Metrics Endpoint

**TypeScript:**
- Install: `prom-client`
- Create `src/lib/metrics.ts` with RED metrics (request counter + duration histogram)
- Add metrics middleware to app
- Add `GET /metrics` endpoint (Prometheus format)

**Python:**
- Install: `prometheus-fastapi-instrumentator` (FastAPI) or `django-prometheus` (Django)
- Configure and expose `/metrics`

**Go:**
- Install: `github.com/prometheus/client_golang/prometheus`
- Add `promhttp.Handler()` on `/metrics`

**Java/Spring:**
- Add `spring-boot-starter-actuator` + `micrometer-registry-prometheus`
- Enable `/actuator/prometheus` in `application.yml`

### 4. Add Health Check Endpoints

Add two endpoints:

`GET /health/live` — liveness (process alive)
```json
{ "status": "ok" }
```

`GET /health/ready` — readiness (dependencies available)
```json
{ "status": "ok", "checks": { "db": "ok", "redis": "ok" } }
```

Check what dependencies the project has (DB, Redis, external APIs) and probe each in `/health/ready`. Return HTTP 503 if any dependency is unavailable.

### 5. Add Error Tracking (Sentry)

- Install appropriate Sentry SDK for the framework
- Create initialization code reading `SENTRY_DSN` from environment
- Add to app entry point (before routes)
- Add `SENTRY_DSN` to `.env.example` (with comment: `# Get from sentry.io`)
- Set `tracesSampleRate: 0.1` in production (not 1.0 — cost)

### 6. Add Environment Variables

Add to `.env.example`:
```bash
# Observability
LOG_LEVEL=info                    # debug | info | warn | error
SENTRY_DSN=                       # From sentry.io → project → DSN
OTEL_EXPORTER_OTLP_ENDPOINT=      # Optional: OpenTelemetry collector URL
```

### 7. Report What Was Added

```
OBSERVABILITY ADDED
═══════════════════

Logging:    pino + pino-http (JSON in prod, pretty in dev)
            Correlation ID via X-Correlation-ID header

Metrics:    prom-client
            GET /metrics (Prometheus format)
            RED metrics on all HTTP routes

Health:     GET /health/live  → 200 OK
            GET /health/ready → checks DB + Redis

Errors:     Sentry SDK initialized
            Add SENTRY_DSN to your environment

Files changed:
  + src/lib/logger.ts
  + src/lib/metrics.ts
  ~ src/app.ts (middleware added)
  ~ .env.example

Next: Set SENTRY_DSN in your deployment environment
      Configure Prometheus to scrape /metrics
      Add alerts (see skill: observability)
```

## Arguments

`$ARGUMENTS` can be:
- (empty) — add all observability components
- `logging` — add structured logging only
- `metrics` — add Prometheus metrics only
- `health` — add health check endpoints only
- `sentry` — add Sentry error tracking only
