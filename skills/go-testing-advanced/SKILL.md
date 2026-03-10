---
name: go-testing-advanced
description: Advanced Go testing — interface-based mocking, benchmarks (basic, size-parametrized, allocation), fuzzing (Go 1.18+), test coverage, HTTP handler testing with httptest, best practices, and CI/CD integration. Extends golang-testing.
---

# Go Testing — Advanced Patterns

> This skill extends [golang-testing](../golang-testing/SKILL.md) with mocking, benchmarks, fuzzing, HTTP testing, and CI/CD.

## When to Activate

- Writing interface-based mocks without external libraries
- Benchmarking performance-critical code
- Using Go 1.18+ fuzzing for input validation
- Testing HTTP handlers with `net/http/httptest`
- Setting up CI/CD test pipelines
- Comparing benchmark results across commits using `benchstat` to detect performance regressions
- Adding a fuzz corpus and property-based assertions to a parser or input validation function
- Configuring a GitHub Actions workflow that enforces Go test coverage thresholds on every pull request

## Interface-Based Mocking

The idiomatic Go approach: define a minimal interface, write a fake that implements it, inject at the call site.

### Defining the Interface

```go
// user_service.go
package user

type EmailSender interface {
    Send(to, subject, body string) error
}

type UserRepository interface {
    FindByID(id int) (*User, error)
    Save(u *User) error
}

type UserService struct {
    repo   UserRepository
    mailer EmailSender
}

func NewUserService(repo UserRepository, mailer EmailSender) *UserService {
    return &UserService{repo: repo, mailer: mailer}
}

func (s *UserService) Register(name, email string) (*User, error) {
    u := &User{Name: name, Email: email}
    if err := s.repo.Save(u); err != nil {
        return nil, err
    }
    _ = s.mailer.Send(email, "Welcome", "Thanks for signing up!")
    return u, nil
}
```

### Writing the Fake

```go
// user_service_test.go
package user_test

type fakeMailer struct {
    calls []struct{ to, subject, body string }
    err   error
}

func (m *fakeMailer) Send(to, subject, body string) error {
    m.calls = append(m.calls, struct{ to, subject, body string }{to, subject, body})
    return m.err
}

type fakeRepo struct {
    saved []*User
    err   error
}

func (r *fakeRepo) FindByID(id int) (*User, error) {
    for _, u := range r.saved {
        if u.ID == id {
            return u, nil
        }
    }
    return nil, ErrNotFound
}

func (r *fakeRepo) Save(u *User) error {
    if r.err != nil {
        return r.err
    }
    u.ID = len(r.saved) + 1
    r.saved = append(r.saved, u)
    return nil
}

func TestUserService_Register(t *testing.T) {
    tests := []struct {
        name      string
        repoErr   error
        mailerErr error
        wantEmail bool
        wantErr   bool
    }{
        {"success", nil, nil, true, false},
        {"repo error", ErrDB, nil, false, true},
        {"mailer error silenced", nil, ErrMail, true, false}, // mailer error ignored
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := &fakeRepo{err: tt.repoErr}
            mailer := &fakeMailer{err: tt.mailerErr}
            svc := NewUserService(repo, mailer)

            user, err := svc.Register("Alice", "alice@example.com")

            if tt.wantErr {
                if err == nil {
                    t.Error("expected error, got nil")
                }
                return
            }
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if user.Name != "Alice" {
                t.Errorf("name = %q; want %q", user.Name, "Alice")
            }
            if tt.wantEmail && len(mailer.calls) == 0 {
                t.Error("expected email to be sent")
            }
        })
    }
}
```

### Spy Pattern (Record Calls)

```go
type spyLogger struct {
    mu      sync.Mutex
    entries []string
}

func (l *spyLogger) Log(msg string) {
    l.mu.Lock()
    defer l.mu.Unlock()
    l.entries = append(l.entries, msg)
}

func (l *spyLogger) Contains(s string) bool {
    l.mu.Lock()
    defer l.mu.Unlock()
    for _, e := range l.entries {
        if strings.Contains(e, s) {
            return true
        }
    }
    return false
}
```

## Benchmarks

### Basic Benchmark

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}
```

### Reset and Stop Timers

```go
func BenchmarkWithSetup(b *testing.B) {
    data := generateLargeDataset() // Don't time this

    b.ResetTimer() // Start timing from here

    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

func BenchmarkWithTeardown(b *testing.B) {
    for i := 0; i < b.N; i++ {
        b.StopTimer()
        data := prepareData() // Not timed
        b.StartTimer()
        Process(data)
    }
}
```

### Size-Parametrized Benchmark

```go
func BenchmarkSort(b *testing.B) {
    sizes := []int{10, 100, 1000, 10000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
            data := make([]int, size)
            for i := range data {
                data[i] = rand.Intn(size)
            }

            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                b.StopTimer()
                input := make([]int, len(data))
                copy(input, data)
                b.StartTimer()
                sort.Ints(input)
            }
        })
    }
}
```

### Allocation Benchmark

```go
func BenchmarkAllocations(b *testing.B) {
    b.ReportAllocs() // Show allocs/op in output

    for i := 0; i < b.N; i++ {
        result := buildString("hello", "world")
        _ = result
    }
}

// Run with:
// go test -bench=BenchmarkAllocations -benchmem
// Output:
// BenchmarkAllocations-8    5000000    243 ns/op    48 B/op    2 allocs/op
```

### Running Benchmarks

```bash
# Run all benchmarks
go test -bench=.

# Run specific benchmark
go test -bench=BenchmarkSort

# Include memory stats
go test -bench=. -benchmem

# Run 5 seconds per benchmark
go test -bench=. -benchtime=5s

# Run 10 iterations minimum
go test -bench=. -benchtime=10x

# Compare with benchstat
go test -bench=. -count=5 > old.txt
# make changes
go test -bench=. -count=5 > new.txt
benchstat old.txt new.txt
```

## Fuzzing (Go 1.18+)

```go
// fuzz_test.go
package parser_test

import (
    "testing"
    "unicode/utf8"
)

func FuzzParseInput(f *testing.F) {
    // Seed corpus — known-good inputs
    f.Add("hello world")
    f.Add("")
    f.Add("special: !@#$%")
    f.Add("unicode: 日本語")

    f.Fuzz(func(t *testing.T, input string) {
        // The fuzzer mutates `input` automatically

        // Property: must not panic
        result, err := ParseInput(input)

        // Property: if no error, result must be valid UTF-8
        if err == nil {
            if !utf8.ValidString(result) {
                t.Errorf("ParseInput(%q) returned non-UTF-8 output", input)
            }
        }

        // Property: output length <= input length (example invariant)
        if len(result) > len(input) {
            t.Errorf("output longer than input: %d > %d", len(result), len(input))
        }
    })
}
```

```bash
# Run existing corpus only (fast)
go test -run FuzzParseInput

# Run fuzzer for 30 seconds
go test -fuzz FuzzParseInput -fuzztime=30s

# Fuzz until failure found
go test -fuzz FuzzParseInput

# Corpus is stored in testdata/fuzz/FuzzParseInput/
```

## HTTP Handler Testing with httptest

### Testing Individual Handlers

```go
package api_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestGetUserHandler(t *testing.T) {
    tests := []struct {
        name       string
        userID     string
        wantStatus int
        wantName   string
    }{
        {"existing user", "1", http.StatusOK, "Alice"},
        {"not found", "999", http.StatusNotFound, ""},
        {"invalid id", "abc", http.StatusBadRequest, ""},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodGet, "/users/"+tt.userID, nil)
            w := httptest.NewRecorder()

            handler := NewUserHandler(fakeUserRepo)
            handler.ServeHTTP(w, req)

            if w.Code != tt.wantStatus {
                t.Errorf("status = %d; want %d", w.Code, tt.wantStatus)
            }

            if tt.wantName != "" {
                var user User
                json.NewDecoder(w.Body).Decode(&user)
                if user.Name != tt.wantName {
                    t.Errorf("name = %q; want %q", user.Name, tt.wantName)
                }
            }
        })
    }
}

func TestCreateUserHandler(t *testing.T) {
    body := `{"name":"Alice","email":"alice@example.com"}`
    req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    handler := NewUserHandler(fakeUserRepo)
    handler.ServeHTTP(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("status = %d; want %d", w.Code, http.StatusCreated)
    }

    var created User
    json.NewDecoder(w.Body).Decode(&created)
    if created.ID == 0 {
        t.Error("expected ID to be set")
    }
}
```

### Testing with a Real Server

```go
func TestWithServer(t *testing.T) {
    router := setupRouter()
    server := httptest.NewServer(router)
    defer server.Close()

    resp, err := http.Get(server.URL + "/health")
    if err != nil {
        t.Fatalf("GET /health: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusOK)
    }
}
```

## Test Coverage

```bash
# Show coverage percentage
go test ./... -cover

# Generate coverage profile
go test ./... -coverprofile=coverage.out

# View in browser
go tool cover -html=coverage.out

# Show function-level coverage
go tool cover -func=coverage.out

# Fail if coverage < 80%
go test ./... -cover -coverprofile=coverage.out
go tool cover -func=coverage.out | grep total | awk '{if ($3 < 80) exit 1}'
```

## Best Practices

### Test File Conventions

```go
// Package: use _test suffix for black-box tests
package mypackage_test  // can only use exported symbols

// Or use same package for white-box tests
package mypackage       // can access unexported symbols

// Naming: Test<FunctionName>_<Scenario>
func TestParseDate_ValidFormat(t *testing.T) {}
func TestParseDate_InvalidMonth(t *testing.T) {}
func TestParseDate_LeapYear(t *testing.T) {}
```

### Test Helper Best Practices

```go
// Always call t.Helper() in helpers
func assertJSON(t *testing.T, body *bytes.Buffer, want interface{}) {
    t.Helper()  // Makes error point to caller, not here

    var got interface{}
    if err := json.NewDecoder(body).Decode(&got); err != nil {
        t.Fatalf("decode JSON: %v", err)
    }
    if !reflect.DeepEqual(got, want) {
        t.Errorf("JSON mismatch:\ngot  %+v\nwant %+v", got, want)
    }
}
```

### Avoid Test Anti-Patterns

```go
// BAD: Shared mutable state
var globalDB *sql.DB  // leaks between tests

// GOOD: Create per-test
func TestSomething(t *testing.T) {
    db := setupTestDB(t)  // created and cleaned up per test
    ...
}

// BAD: Testing implementation details
if user.internalCache != nil { ... }

// GOOD: Test observable behavior
if user.Name != "Alice" { ... }

// BAD: time.Sleep in tests
time.Sleep(100 * time.Millisecond)

// GOOD: Synchronize explicitly
select {
case <-done:
case <-time.After(time.Second):
    t.Fatal("timed out")
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
          cache: true

      - name: Run tests
        run: go test ./... -race -coverprofile=coverage.out

      - name: Check coverage
        run: |
          go tool cover -func=coverage.out | grep total
          COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
          echo "Coverage: $COVERAGE%"

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.out
```

## Quick Reference

| Feature | Command/Usage |
|---------|--------------|
| Run tests | `go test ./...` |
| Race detector | `go test -race ./...` |
| Specific test | `go test -run TestName` |
| Verbose | `go test -v ./...` |
| Benchmark | `go test -bench=.` |
| Benchmark + mem | `go test -bench=. -benchmem` |
| Fuzz | `go test -fuzz FuzzName -fuzztime=30s` |
| Coverage | `go test -cover ./...` |
| Coverage profile | `go test -coverprofile=c.out && go tool cover -html=c.out` |
| Parallel tests | `t.Parallel()` inside test |
| Capture variable | `tt := tt` before `t.Run` (Go <1.22) |
| Skip long tests | `testing.Short()` check + `-short` flag |
