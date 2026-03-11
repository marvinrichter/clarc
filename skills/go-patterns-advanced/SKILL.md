---
name: go-patterns-advanced
description: Advanced Go patterns — hexagonal architecture with full working examples, struct design (functional options, embedding), memory optimization, Go tooling (golangci-lint), Go 1.21+ slices/maps stdlib, and anti-patterns. Extends go-patterns.
---

# Go Advanced Patterns

> This skill extends [go-patterns](../go-patterns/SKILL.md) with architecture, struct design, memory optimization, and tooling.

## When to Activate

- Designing interface hierarchies or choosing between small and large interfaces
- Organizing packages for a Go service (hexagonal layout, naming, dependency direction)
- Designing hexagonal/clean architecture in Go
- Optimizing memory or performance
- Configuring Go tooling (golangci-lint, etc.)
- Using Go 1.21+ slices/maps stdlib
- Reviewing struct design or avoiding anti-patterns
- Structuring a new Go service with clear domain, application, and adapter layers following ports-and-adapters
- Applying functional options or embedding to avoid constructor explosion and over-specified structs
- Replacing hand-rolled slice or map utilities with the Go 1.21+ `slices` and `maps` standard library packages

## Hexagonal in Go (Ports & Adapters)

Go's core idioms ARE the hexagonal pattern — no ceremony required:

| Go Idiom | Hexagonal Concept |
|---|---|
| `Accept interfaces, return structs` | Output Port: the interface is the port |
| `Define interfaces where they're used` | Port defined in domain/app, not in repository |
| Constructor injection (`NewService(store Store)`) | Adapter injection |
| Small, focused interfaces | One interface per capability (not one giant `Repository`) |
| `internal/` package boundary | Enforced architectural boundary |

### Domain Model — Zero External Imports

```go
// internal/domain/market.go
package domain

import (
    "errors"
    "strings"
    "time"
)

// Market is the aggregate root.
type Market struct {
    ID        string
    Name      string
    Slug      string
    Status    MarketStatus
    CreatedAt time.Time
}

type MarketStatus string

const (
    MarketStatusDraft  MarketStatus = "DRAFT"
    MarketStatusActive MarketStatus = "ACTIVE"
)

var (
    ErrInvalidMarket      = errors.New("invalid market")
    ErrMarketAlreadyLive  = errors.New("market already published")
)

// NewMarket is the factory — enforces creation invariants.
func NewMarket(name, slug string) (Market, error) {
    if strings.TrimSpace(name) == "" {
        return Market{}, fmt.Errorf("%w: name required", ErrInvalidMarket)
    }
    return Market{Name: name, Slug: slug, Status: MarketStatusDraft, CreatedAt: time.Now()}, nil
}

// Publish is a behavior method — domain logic, not a setter.
func (m Market) Publish() (Market, error) {
    if m.Status != MarketStatusDraft {
        return Market{}, fmt.Errorf("%w: %s", ErrMarketAlreadyLive, m.Slug)
    }
    m.Status = MarketStatusActive
    return m, nil
}
```

### Port Interface — Defined in the Consuming Package

```go
// internal/app/market_service.go
package app

import (
    "context"
    "myproject/internal/domain"
)

// MarketStore is the output port — defined HERE in app/, not in repository/.
// The concrete Postgres implementation satisfies this interface implicitly.
type MarketStore interface {
    Save(ctx context.Context, market domain.Market) (domain.Market, error)
    FindBySlug(ctx context.Context, slug string) (domain.Market, error)
}

// MarketService is the use case — depends on the port interface, not the adapter.
type MarketService struct {
    store MarketStore
}

func NewMarketService(store MarketStore) *MarketService {
    return &MarketService{store: store}
}

func (s *MarketService) Create(ctx context.Context, name, slug string) (domain.Market, error) {
    market, err := domain.NewMarket(name, slug)  // domain logic
    if err != nil {
        return domain.Market{}, fmt.Errorf("create market: %w", err)
    }
    return s.store.Save(ctx, market)
}

func (s *MarketService) Publish(ctx context.Context, slug string) (domain.Market, error) {
    market, err := s.store.FindBySlug(ctx, slug)
    if err != nil {
        return domain.Market{}, fmt.Errorf("publish market: %w", err)
    }
    published, err := market.Publish()  // domain logic
    if err != nil {
        return domain.Market{}, err
    }
    return s.store.Save(ctx, published)
}
```

### Inbound Adapter — HTTP Handler

```go
// internal/handler/market_handler.go
package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "myproject/internal/domain"
)

// MarketUseCase is the input port — handler depends on this interface, not *app.MarketService.
type MarketUseCase interface {
    Create(ctx context.Context, name, slug string) (domain.Market, error)
}

type MarketHandler struct {
    useCase MarketUseCase
}

func NewMarketHandler(useCase MarketUseCase) *MarketHandler {
    return &MarketHandler{useCase: useCase}
}

// ProblemDetails is the RFC 7807 / RFC 9457 error response struct.
// Always use Content-Type: application/problem+json for error responses.
type ProblemDetails struct {
    Type     string `json:"type"`
    Title    string `json:"title"`
    Status   int    `json:"status"`
    Detail   string `json:"detail,omitempty"`
    Instance string `json:"instance,omitempty"`
}

func writeProblem(w http.ResponseWriter, r *http.Request, status int, problemType, title, detail string) {
    p := ProblemDetails{Type: problemType, Title: title, Status: status, Detail: detail, Instance: r.RequestURI}
    w.Header().Set("Content-Type", "application/problem+json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(p)
}

func (h *MarketHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name string `json:"name"`
        Slug string `json:"slug"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeProblem(w, r, http.StatusBadRequest,
            "https://api.example.com/problems/bad-request", "Bad Request",
            "Request body could not be parsed.")
        return
    }

    market, err := h.useCase.Create(r.Context(), req.Name, req.Slug)
    if errors.Is(err, domain.ErrInvalidMarket) {
        writeProblem(w, r, http.StatusUnprocessableEntity,
            "https://api.example.com/problems/validation-failed", "Validation Failed",
            err.Error())
        return
    }
    if err != nil {
        writeProblem(w, r, http.StatusInternalServerError, "about:blank", "Internal Server Error", "")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(market)
}
```

### Outbound Adapter — Postgres Repository

```go
// internal/repository/market_repo.go
package repository

import (
    "context"
    "database/sql"
    "myproject/internal/domain"
)

// PostgresMarketRepo satisfies app.MarketStore implicitly — no 'implements' declaration.
type PostgresMarketRepo struct {
    db *sql.DB
}

func NewPostgresMarketRepo(db *sql.DB) *PostgresMarketRepo {
    return &PostgresMarketRepo{db: db}
}

func (r *PostgresMarketRepo) Save(ctx context.Context, market domain.Market) (domain.Market, error) {
    _, err := r.db.ExecContext(ctx,
        `INSERT INTO markets (id, name, slug, status) VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name=$2, status=$4`,
        market.ID, market.Name, market.Slug, market.Status,
    )
    if err != nil {
        return domain.Market{}, fmt.Errorf("save market: %w", err)
    }
    return market, nil
}

func (r *PostgresMarketRepo) FindBySlug(ctx context.Context, slug string) (domain.Market, error) {
    var m domain.Market
    err := r.db.QueryRowContext(ctx,
        `SELECT id, name, slug, status FROM markets WHERE slug = $1`, slug,
    ).Scan(&m.ID, &m.Name, &m.Slug, &m.Status)
    if err == sql.ErrNoRows {
        return domain.Market{}, fmt.Errorf("market %s: %w", slug, domain.ErrNotFound)
    }
    if err != nil {
        return domain.Market{}, fmt.Errorf("find market: %w", err)
    }
    return m, nil
}
```

### DI Wiring in main.go

```go
// cmd/myapp/main.go
package main

func main() {
    db := mustOpenDB(os.Getenv("DATABASE_URL"))

    // Outbound adapters (implement port interfaces defined in app/)
    marketRepo := repository.NewPostgresMarketRepo(db)

    // Use cases (depend on port interfaces, not concrete adapters)
    marketSvc := app.NewMarketService(marketRepo)

    // Inbound adapters (depend on use case interfaces)
    marketHandler := handler.NewMarketHandler(marketSvc)

    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/markets", marketHandler.Create)

    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

### Testing Use Cases (Mock the Port Interface)

```go
// internal/app/market_service_test.go
package app_test

import (
    "context"
    "testing"
    "myproject/internal/app"
    "myproject/internal/domain"
)

// Inline mock — no mocking library needed thanks to Go interfaces
type mockMarketStore struct {
    saved []domain.Market
}

func (m *mockMarketStore) Save(ctx context.Context, market domain.Market) (domain.Market, error) {
    m.saved = append(m.saved, market)
    return market, nil
}

func (m *mockMarketStore) FindBySlug(ctx context.Context, slug string) (domain.Market, error) {
    return domain.Market{}, domain.ErrNotFound
}

func TestMarketService_Create(t *testing.T) {
    store := &mockMarketStore{}
    svc := app.NewMarketService(store)

    market, err := svc.Create(context.Background(), "Test Market", "test-market")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if market.Name != "Test Market" {
        t.Errorf("got name %q, want %q", market.Name, "Test Market")
    }
    if len(store.saved) != 1 {
        t.Errorf("expected 1 saved market, got %d", len(store.saved))
    }
}

func TestMarketService_Create_BlankName(t *testing.T) {
    svc := app.NewMarketService(&mockMarketStore{})
    _, err := svc.Create(context.Background(), "", "slug")
    if !errors.Is(err, domain.ErrInvalidMarket) {
        t.Errorf("expected ErrInvalidMarket, got %v", err)
    }
}
```

## Struct Design

### Functional Options Pattern

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *log.Logger
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l *log.Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        timeout: 30 * time.Second, // default
        logger:  log.Default(),    // default
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer(":8080",
    WithTimeout(60*time.Second),
    WithLogger(customLogger),
)
```

### Embedding for Composition

```go
type Logger struct {
    prefix string
}

func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

type Server struct {
    *Logger // Embedding - Server gets Log method
    addr    string
}

func NewServer(addr string) *Server {
    return &Server{
        Logger: &Logger{prefix: "SERVER"},
        addr:   addr,
    }
}

// Usage
s := NewServer(":8080")
s.Log("Starting...") // Calls embedded Logger.Log
```

## Memory and Performance

### Preallocate Slices When Size is Known

```go
// Bad: Grows slice multiple times
func processItems(items []Item) []Result {
    var results []Result
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}

// Good: Single allocation
func processItems(items []Item) []Result {
    results := make([]Result, 0, len(items))
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}
```

### Use sync.Pool for Frequent Allocations

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func ProcessRequest(data []byte) []byte {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufferPool.Put(buf)
    }()

    buf.Write(data)
    // Process...
    return buf.Bytes()
}
```

### Avoid String Concatenation in Loops

```go
// Bad: Creates many string allocations
func join(parts []string) string {
    var result string
    for _, p := range parts {
        result += p + ","
    }
    return result
}

// Good: Single allocation with strings.Builder
func join(parts []string) string {
    var sb strings.Builder
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}

// Best: Use standard library
func join(parts []string) string {
    return strings.Join(parts, ",")
}
```

## Go Tooling Integration

### Essential Commands

```bash
# Build and run
go build ./...
go run ./cmd/myapp

# Testing
go test ./...
go test -race ./...
go test -cover ./...

# Static analysis
go vet ./...
staticcheck ./...
golangci-lint run

# Module management
go mod tidy
go mod verify

# Formatting
gofmt -w .
goimports -w .
```

### Recommended Linter Configuration (.golangci.yml)

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert
    - unparam

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    check-shadowing: true

issues:
  exclude-use-default: false
```

## Standard Library: slices and maps (Go 1.21+)

The `slices` and `maps` packages replace most hand-rolled slice/map utilities. Prefer these over manual loops.

```go
import (
    "cmp"
    "maps"
    "slices"
)

// --- slices ---

// Contains (replaces manual loop)
if slices.Contains(ids, targetID) { ... }

// Sort (type-safe, no less-func boilerplate)
slices.Sort(names)                              // ordered types
slices.SortFunc(users, func(a, b User) int {   // custom comparator
    return cmp.Compare(a.Name, b.Name)
})

// Binary search on sorted slice
i, found := slices.BinarySearch(sorted, "target")

// Deduplicate (requires sorted input)
unique := slices.Compact(slices.Clone(items))

// Filter in-place (Go 1.23+)
items = slices.DeleteFunc(items, func(x Item) bool { return x.Expired() })

// Reverse
slices.Reverse(items)

// Max / Min
max := slices.Max(scores)

// --- maps ---

// Collect all keys or values
keys := slices.Collect(maps.Keys(m))     // order not guaranteed — sort if needed
vals := slices.Collect(maps.Values(m))

// Shallow clone
clone := maps.Clone(original)

// Delete matching entries
maps.DeleteFunc(m, func(k string, v int) bool { return v == 0 })
```

> **Note**: `maps.Keys` / `maps.Values` return iterators (Go 1.23 range-over-func). Use `slices.Collect` to materialise them into a slice, or range over them directly:
> ```go
> for k := range maps.Keys(m) { ... }
> ```

## Interface Design

### Small, Focused Interfaces

```go
// Good: Single-method interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// Compose interfaces as needed
type ReadWriteCloser interface {
    Reader
    Writer
    io.Closer
}
```

### Define Interfaces Where They're Used

```go
// In the consumer package, not the provider
package service

// UserStore defines what this service needs
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type Service struct {
    store UserStore
}
// Concrete implementation lives in another package — it doesn't know about this interface
```

### Optional Behavior with Type Assertions

```go
type Flusher interface {
    Flush() error
}

func WriteAndFlush(w io.Writer, data []byte) error {
    if _, err := w.Write(data); err != nil {
        return err
    }
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
```

## Package Organization

### Hexagonal Project Layout

Go's idioms naturally align with hexagonal (ports & adapters) architecture:

```text
myproject/
├── cmd/
│   └── myapp/
│       └── main.go           # Entry point + DI wiring
├── internal/
│   ├── domain/               # Pure Go types + behavior — zero external imports
│   ├── app/                  # Use cases: orchestrate domain + call port interfaces
│   ├── handler/              # Inbound adapters: HTTP, gRPC, CLI
│   ├── repository/           # Outbound adapters: Postgres, Redis, external APIs
│   └── config/               # Configuration structs, no business logic
├── pkg/
│   └── client/               # Public API client (if library)
├── api/
│   └── v1/                   # API definitions (proto, OpenAPI)
├── go.mod
└── Makefile
```

### Package Naming

```go
// Good: Short, lowercase, no underscores
package user

// Bad: Verbose, mixed case, or redundant
package httpHandler
package json_parser
package userService // Redundant 'Service' suffix
```

### Avoid Package-Level State

```go
// Bad: Global mutable state in init()
var db *sql.DB
func init() { db, _ = sql.Open("postgres", os.Getenv("DATABASE_URL")) }

// Good: Dependency injection via constructor
type Server struct { db *sql.DB }
func NewServer(db *sql.DB) *Server { return &Server{db: db} }
```

## Quick Reference: Go Idioms

| Idiom | Rule |
|-------|------|
| Accept interfaces, return structs | Functions accept interface params, return concrete types |
| Errors are values | Treat errors as first-class values, not exceptions |
| Don't communicate by sharing memory | Use channels for goroutine coordination |
| Make the zero value useful | Types should work without explicit initialization |
| Clear is better than clever | Prioritize readability over cleverness |
| Return early | Handle errors first, keep happy path unindented |

> For anti-patterns (naked returns, panic for control flow, mixed receivers, context in struct), see the core `go-patterns` skill.
