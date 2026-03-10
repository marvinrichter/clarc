---
name: go-testing
description: Go testing patterns including table-driven tests, subtests, test helpers, and golden files. Core TDD methodology with idiomatic Go practices.
---

# Go Testing Patterns

Comprehensive Go testing patterns for writing reliable, maintainable tests following TDD methodology.

## When to Activate

- Writing new Go functions or methods
- Adding test coverage to existing code
- Creating benchmarks for performance-critical code
- Implementing fuzz tests for input validation
- Following TDD workflow in Go projects

## TDD Workflow for Go

### The RED-GREEN-REFACTOR Cycle

```
RED     → Write a failing test first
GREEN   → Write minimal code to pass the test
REFACTOR → Improve code while keeping tests green
REPEAT  → Continue with next requirement
```

### Step-by-Step TDD in Go

```go
// Step 1: Define the interface/signature
// calculator.go
package calculator

func Add(a, b int) int {
    panic("not implemented") // Placeholder
}

// Step 2: Write failing test (RED)
// calculator_test.go
package calculator

import "testing"

func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5
    if got != want {
        t.Errorf("Add(2, 3) = %d; want %d", got, want)
    }
}

// Step 3: Run test - verify FAIL
// $ go test
// --- FAIL: TestAdd (0.00s)
// panic: not implemented

// Step 4: Implement minimal code (GREEN)
func Add(a, b int) int {
    return a + b
}

// Step 5: Run test - verify PASS
// $ go test
// PASS

// Step 6: Refactor if needed, verify tests still pass
```

## Table-Driven Tests

The standard pattern for Go tests. Enables comprehensive coverage with minimal code.

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -2, -3},
        {"zero values", 0, 0, 0},
        {"mixed signs", -1, 1, 0},
        {"large numbers", 1000000, 2000000, 3000000},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

### Table-Driven Tests with Error Cases

```go
func TestParseConfig(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    *Config
        wantErr bool
    }{
        {
            name:  "valid config",
            input: `{"host": "localhost", "port": 8080}`,
            want:  &Config{Host: "localhost", Port: 8080},
        },
        {
            name:    "invalid JSON",
            input:   `{invalid}`,
            wantErr: true,
        },
        {
            name:    "empty input",
            input:   "",
            wantErr: true,
        },
        {
            name:  "minimal config",
            input: `{}`,
            want:  &Config{}, // Zero value config
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseConfig(tt.input)

            if tt.wantErr {
                if err == nil {
                    t.Error("expected error, got nil")
                }
                return
            }

            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }

            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("got %+v; want %+v", got, tt.want)
            }
        })
    }
}
```

## Subtests and Sub-benchmarks

### Organizing Related Tests

```go
func TestUser(t *testing.T) {
    // Setup shared by all subtests
    db := setupTestDB(t)

    t.Run("Create", func(t *testing.T) {
        user := &User{Name: "Alice"}
        err := db.CreateUser(user)
        if err != nil {
            t.Fatalf("CreateUser failed: %v", err)
        }
        if user.ID == "" {
            t.Error("expected user ID to be set")
        }
    })

    t.Run("Get", func(t *testing.T) {
        user, err := db.GetUser("alice-id")
        if err != nil {
            t.Fatalf("GetUser failed: %v", err)
        }
        if user.Name != "Alice" {
            t.Errorf("got name %q; want %q", user.Name, "Alice")
        }
    })

    t.Run("Update", func(t *testing.T) {
        // ...
    })

    t.Run("Delete", func(t *testing.T) {
        // ...
    })
}
```

### Parallel Subtests

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name  string
        input string
    }{
        {"case1", "input1"},
        {"case2", "input2"},
        {"case3", "input3"},
    }

    for _, tt := range tests {
        tt := tt // Capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // Run subtests in parallel
            result := Process(tt.input)
            // assertions...
            _ = result
        })
    }
}
```

## Test Helpers

### Helper Functions

```go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper() // Marks this as a helper function

    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("failed to open database: %v", err)
    }

    // Cleanup when test finishes
    t.Cleanup(func() {
        db.Close()
    })

    // Run migrations
    if _, err := db.Exec(schema); err != nil {
        t.Fatalf("failed to create schema: %v", err)
    }

    return db
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want {
        t.Errorf("got %v; want %v", got, want)
    }
}
```

### Temporary Files and Directories

```go
func TestFileProcessing(t *testing.T) {
    // Create temp directory - automatically cleaned up
    tmpDir := t.TempDir()

    // Create test file
    testFile := filepath.Join(tmpDir, "test.txt")
    err := os.WriteFile(testFile, []byte("test content"), 0644)
    if err != nil {
        t.Fatalf("failed to create test file: %v", err)
    }

    // Run test
    result, err := ProcessFile(testFile)
    if err != nil {
        t.Fatalf("ProcessFile failed: %v", err)
    }

    // Assert...
    _ = result
}
```

## Golden Files

Testing against expected output files stored in `testdata/`.

```go
var update = flag.Bool("update", false, "update golden files")

func TestRender(t *testing.T) {
    tests := []struct {
        name  string
        input Template
    }{
        {"simple", Template{Name: "test"}},
        {"complex", Template{Name: "test", Items: []string{"a", "b"}}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Render(tt.input)

            golden := filepath.Join("testdata", tt.name+".golden")

            if *update {
                // Update golden file: go test -update
                err := os.WriteFile(golden, got, 0644)
                if err != nil {
                    t.Fatalf("failed to update golden file: %v", err)
                }
            }

            want, err := os.ReadFile(golden)
            if err != nil {
                t.Fatalf("failed to read golden file: %v", err)
            }

            if !bytes.Equal(got, want) {
                t.Errorf("output mismatch:\ngot:\n%s\nwant:\n%s", got, want)
            }
        })
    }
}
```

## Anti-Patterns

### Not Using t.Helper in Helper Functions

**Wrong:**
```go
func assertNoError(t *testing.T, err error) {
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

**Correct:**
```go
func assertNoError(t *testing.T, err error) {
    t.Helper() // Reports failure at the call site, not inside the helper
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

**Why:** Without `t.Helper()`, failure output points to the helper's line rather than the test line that called it, making failures hard to trace.

### Sharing State Across Parallel Subtests

**Wrong:**
```go
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        result := Process(tt.input) // tt captured by reference — data race
        _ = result
    })
}
```

**Correct:**
```go
for _, tt := range tests {
    tt := tt // Capture loop variable by value
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        result := Process(tt.input)
        _ = result
    })
}
```

**Why:** Without capturing `tt`, all goroutines share the same loop variable and read the last iteration's value, causing non-deterministic failures.

### Using os.MkdirTemp Instead of t.TempDir

**Wrong:**
```go
func TestFileProcessing(t *testing.T) {
    tmpDir, _ := os.MkdirTemp("", "test-*")
    defer os.RemoveAll(tmpDir) // Easy to forget or miss on test failure
    // ...
}
```

**Correct:**
```go
func TestFileProcessing(t *testing.T) {
    tmpDir := t.TempDir() // Automatically cleaned up after test
    // ...
}
```

**Why:** `t.TempDir()` is automatically cleaned up by the testing framework even when the test panics, eliminating manual cleanup and the risk of leaking temp files.

### Checking Only wantErr Without Validating the Error

**Wrong:**
```go
if tt.wantErr {
    if err == nil {
        t.Error("expected error, got nil")
    }
    return // Does not check error type or message
}
```

**Correct:**
```go
if tt.wantErr {
    if err == nil {
        t.Error("expected error, got nil")
        return
    }
    if tt.errContains != "" && !strings.Contains(err.Error(), tt.errContains) {
        t.Errorf("error %q does not contain %q", err.Error(), tt.errContains)
    }
    return
}
```

**Why:** Checking only for the presence of any error allows wrong error types and messages to pass silently, weakening the test contract.

### Using t.Log Instead of t.Errorf for Failures

**Wrong:**
```go
if got != want {
    t.Log("got:", got, "want:", want) // Test still passes!
}
```

**Correct:**
```go
if got != want {
    t.Errorf("got %v; want %v", got, want) // Marks test as failed
}
```

**Why:** `t.Log` only records output without failing the test; use `t.Errorf` (continues) or `t.Fatalf` (stops immediately) to actually mark a test as failed.

> For advanced testing — interface-based mocking, benchmarks (basic, size-parametrized, allocation), fuzzing (Go 1.18+), test coverage tools, HTTP handler testing with httptest, CLI reference, best practices, and CI/CD integration — see skill: `golang-testing-advanced`.
