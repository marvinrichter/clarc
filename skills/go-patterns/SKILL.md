---
name: go-patterns
description: Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications.
---

# Go Development Patterns

Idiomatic Go patterns and best practices for building robust, efficient, and maintainable applications.

## When to Activate

- Designing Go package boundaries and module structure
- Choosing an error handling strategy (sentinel errors, error wrapping, custom types)
- Structuring a service with hexagonal architecture or clean architecture in Go
- Deciding between interfaces and concrete types for a component
- Writing idiomatic Go (avoiding anti-patterns, using standard library conventions)
- Setting up dependency injection without a framework

## Core Principles

### 1. Simplicity and Clarity

Go favors simplicity over cleverness. Code should be obvious and easy to read.

```go
// Good: Clear and direct
func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// Bad: Overly clever
func GetUser(id string) (*User, error) {
    return func() (*User, error) {
        if u, e := db.FindUser(id); e == nil {
            return u, nil
        } else {
            return nil, e
        }
    }()
}
```

### 2. Make the Zero Value Useful

Design types so their zero value is immediately usable without initialization.

```go
// Good: Zero value is useful
type Counter struct {
    mu    sync.Mutex
    count int // zero value is 0, ready to use
}

func (c *Counter) Inc() {
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// Good: bytes.Buffer works with zero value
var buf bytes.Buffer
buf.WriteString("hello")

// Bad: Requires initialization
type BadCounter struct {
    counts map[string]int // nil map will panic
}
```

### 3. Accept Interfaces, Return Structs

Functions should accept interface parameters and return concrete types.

```go
// Good: Accepts interface, returns concrete type
func ProcessData(r io.Reader) (*Result, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return nil, err
    }
    return &Result{Data: data}, nil
}

// Bad: Returns interface (hides implementation details unnecessarily)
func ProcessData(r io.Reader) (io.Reader, error) {
    // ...
}
```

## Error Handling Patterns

### Error Wrapping with Context

```go
// Good: Wrap errors with context
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }

    return &cfg, nil
}
```

### Custom Error Types

```go
// Define domain-specific errors
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Sentinel errors for common cases
var (
    ErrNotFound     = errors.New("resource not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)
```

### Error Checking with errors.Is and errors.As

```go
func HandleError(err error) {
    // Check for specific error
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("No records found")
        return
    }

    // Check for error type
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        log.Printf("Validation error on field %s: %s",
            validationErr.Field, validationErr.Message)
        return
    }

    // Unknown error
    log.Printf("Unexpected error: %v", err)
}
```

### Never Ignore Errors

```go
// Bad: Ignoring error with blank identifier
result, _ := doSomething()

// Good: Handle or explicitly document why it's safe to ignore
result, err := doSomething()
if err != nil {
    return err
}

// Acceptable: When error truly doesn't matter (rare)
_ = writer.Close() // Best-effort cleanup, error logged elsewhere
```

## Concurrency Patterns

### Worker Pool

```go
func WorkerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }

    wg.Wait()
    close(results)
}
```

### Context for Cancellation and Timeouts

```go
func FetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### Graceful Shutdown

```go
func GracefulShutdown(server *http.Server) {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    <-quit
    log.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited")
}
```

### errgroup for Coordinated Goroutines

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            data, err := FetchWithTimeout(ctx, url)
            if err != nil {
                return err
            }
            results[i] = data
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Avoiding Goroutine Leaks

```go
// Bad: Goroutine leak if context is cancelled
func leakyFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte)
    go func() {
        data, _ := fetch(url)
        ch <- data // Blocks forever if no receiver
    }()
    return ch
}

// Good: Properly handles cancellation
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1) // Buffered channel
    go func() {
        data, err := fetch(url)
        if err != nil {
            return
        }
        select {
        case ch <- data:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

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

type Closer interface {
    Close() error
}

// Compose interfaces as needed
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
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

// Concrete implementation can be in another package
// It doesn't need to know about this interface
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

    // Flush if supported
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
```

## Package Organization

### Hexagonal Project Layout

Go's idioms naturally align with hexagonal (ports & adapters) architecture. Use `internal/domain/` for pure business logic, `internal/app/` for use cases that orchestrate it, and `internal/handler/` + `internal/repository/` as inbound/outbound adapters:

```text
myproject/
├── cmd/
│   └── myapp/
│       └── main.go           # Entry point + DI wiring (new up all dependencies here)
├── internal/
│   ├── domain/               # Pure Go types + behavior — zero external imports
│   │   ├── market.go         # Market type, NewMarket(), Publish(), domain errors
│   │   └── order.go          # Order type, AddLine(), Place(), OrderTotal()
│   ├── app/                  # Use cases: orchestrate domain + call port interfaces
│   │   └── market_service.go # CreateMarket(), PublishMarket() — defines port interfaces here
│   ├── handler/              # Inbound adapters: HTTP, gRPC, CLI
│   │   └── market_handler.go # Depends only on app/ use case interfaces
│   ├── repository/           # Outbound adapters: Postgres, Redis, external APIs
│   │   └── market_repo.go    # Implements the MarketStore interface defined in app/
│   └── config/               # Configuration structs, no business logic
├── pkg/
│   └── client/               # Public API client (if library)
├── api/
│   └── v1/                   # API definitions (proto, OpenAPI)
├── testdata/                 # Test fixtures
├── go.mod
├── go.sum
└── Makefile
```

### Package Naming

```go
// Good: Short, lowercase, no underscores
package http
package json
package user

// Bad: Verbose, mixed case, or redundant
package httpHandler
package json_parser
package userService // Redundant 'Service' suffix
```

### Avoid Package-Level State

```go
// Bad: Global mutable state
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DATABASE_URL"))
}

// Good: Dependency injection
type Server struct {
    db *sql.DB
}

func NewServer(db *sql.DB) *Server {
    return &Server{db: db}
}
```

## Anti-Patterns

### Returning Interfaces Instead of Concrete Types

**Wrong:**
```go
// Locks callers to the interface, hides the concrete type unnecessarily
func NewUserService() UserServiceInterface {
    return &userServiceImpl{}
}
```

**Correct:**
```go
// Return the concrete type; callers define interfaces they need
func NewUserService(store UserStore) *UserService {
    return &UserService{store: store}
}
```

**Why:** Returning interfaces forces a specific abstraction on callers and prevents them from accessing concrete methods; accept interfaces, return structs.

### Using init() for Side Effects and Dependency Setup

**Wrong:**
```go
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err) // Hard to test, no error propagation
    }
}
```

**Correct:**
```go
func NewServer(databaseURL string) (*Server, error) {
    db, err := sql.Open("postgres", databaseURL)
    if err != nil {
        return nil, fmt.Errorf("open database: %w", err)
    }
    return &Server{db: db}, nil
}
```

**Why:** `init()` functions run silently at startup, cannot return errors cleanly, and make code untestable; explicit constructors with error returns are always preferable.

### Comparing Errors with == Instead of errors.Is

**Wrong:**
```go
if err == sql.ErrNoRows {
    // Misses wrapped errors
}
```

**Correct:**
```go
if errors.Is(err, sql.ErrNoRows) {
    // Works through any chain of wrapped errors
}
```

**Why:** The `==` operator only matches the exact error value and silently fails when the error has been wrapped with `fmt.Errorf("...: %w", err)`.

### Defining Large Interfaces in the Provider Package

**Wrong:**
```go
// package repository
type UserRepository interface {
    FindByID(id string) (*User, error)
    FindAll() ([]*User, error)
    Save(user *User) error
    Delete(id string) error
    // ... 10 more methods
}
```

**Correct:**
```go
// package service — define only what this service needs
type UserFinder interface {
    FindByID(id string) (*User, error)
}

type UserService struct { finder UserFinder }
```

**Why:** Large interfaces defined by the provider couple all consumers to every method; define small, consumer-side interfaces containing only the methods each caller actually uses.

### Forgetting to Cancel a Context

**Wrong:**
```go
func fetchData(url string) ([]byte, error) {
    ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
    // cancel is discarded — context leaks until timeout
    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    // ...
}
```

**Correct:**
```go
func fetchData(url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel() // Always cancel to release resources immediately
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    // ...
}
```

**Why:** Discarding the cancel function keeps the context and its resources alive until the deadline, causing resource leaks especially in high-throughput code paths.

> For advanced patterns — full hexagonal architecture with working code (domain, ports, adapters, DI wiring, tests), struct design (functional options, embedding), memory optimization, Go tooling, `slices`/`maps` stdlib (Go 1.21+), and anti-patterns — see skill: `golang-patterns-advanced`.
> For testing patterns — table-driven tests, mocks, integration tests with testcontainers, benchmarks, and fuzz testing — see skill: `go-testing`.
