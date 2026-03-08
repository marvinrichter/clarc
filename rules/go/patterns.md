---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
globs:
  - "**/*.go"
  - "**/go.{mod,sum}"
alwaysApply: false
---
# Go Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Go specific content.

## Functional Options

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Small Interfaces

Define interfaces where they are **used** (in the consuming package), not where they are implemented. This is the Go port pattern:

```go
// internal/app/market_service.go — interface defined here, in the consumer
type MarketStore interface {
    Save(ctx context.Context, market domain.Market) (domain.Market, error)
    FindBySlug(ctx context.Context, slug string) (domain.Market, error)
}
// internal/repository/postgres.go satisfies MarketStore implicitly — no 'implements' declaration
```

## Hexagonal Package Structure

```
internal/
  domain/      # Pure Go types + behavior — zero external imports
  app/         # Use cases: define port interfaces + orchestrate domain logic
  handler/     # Inbound adapters: HTTP, gRPC (depend on use case interfaces)
  repository/  # Outbound adapters: Postgres, Redis (satisfy port interfaces from app/)
cmd/myapp/
  main.go      # DI wiring: new up everything, inject dependencies
```

## Domain Types with Behavior

```go
// internal/domain/market.go — behavior in the type, not in the service
type Market struct { ID, Name, Slug string; Status MarketStatus }

func NewMarket(name, slug string) (Market, error) { /* validate + create */ }
func (m Market) Publish() (Market, error)         { /* domain rule here */ }
```

## Dependency Injection

Use constructor functions to inject dependencies. Wire everything in `main.go`:

```go
func NewMarketService(store MarketStore) *MarketService {
    return &MarketService{store: store}
}
```

## Reference

See skill: `go-patterns` for comprehensive Go patterns including hexagonal architecture, concurrency, error handling, and package organization.
