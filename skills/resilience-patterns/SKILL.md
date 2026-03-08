---
name: resilience-patterns
description: "Production resilience patterns: Circuit Breaker (Closed/Open/Half-Open), Bulkhead isolation, Retry with exponential backoff + jitter, Timeout hierarchies, Fallback strategies, Graceful Degradation, and Health Check patterns for Kubernetes and beyond."
---

# Resilience Patterns Skill

External dependencies fail. Networks partition. Databases become slow. This skill covers the patterns that keep your service running when dependencies don't.

## When to Activate

- Designing a service that calls external APIs, databases, or queues
- Adding retry logic to an HTTP client
- Implementing circuit breakers for external calls
- Reviewing architecture for single points of failure
- Preparing for a resilience audit or chaos experiment

---

## Circuit Breaker

The Circuit Breaker prevents cascading failures. When a dependency fails repeatedly, stop calling it and fail fast — don't queue up thousands of slow requests.

### States

```
CLOSED (normal)
  ├── Success → stay CLOSED
  └── Failure count > threshold → OPEN

OPEN (failing fast)
  ├── All calls rejected immediately → return fallback
  └── After recovery timeout → HALF-OPEN

HALF-OPEN (probing)
  ├── Next call succeeds → CLOSED
  └── Next call fails → OPEN
```

### Implementation by Language

**Java — Resilience4j (recommended)**
```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)              // Open at 50% failure rate
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .permittedNumberOfCallsInHalfOpenState(3)
    .slidingWindowSize(10)
    .build();

CircuitBreaker cb = CircuitBreaker.of("payment-service", config);

// Decorate your call
Supplier<String> decorated = CircuitBreaker.decorateSupplier(cb, () ->
    paymentClient.charge(amount)
);

Try.ofSupplier(decorated)
    .recover(CallNotPermittedException.class, ex -> "fallback-response");
```

**Node.js — opossum**
```javascript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,           // 3s timeout per call
  errorThresholdPercentage: 50,  // Open at 50% failures
  resetTimeout: 30000,     // Try again after 30s
};

const breaker = new CircuitBreaker(riskyOperation, options);

breaker.fallback(() => 'fallback response');
breaker.on('open', () => console.warn('Circuit OPEN'));
breaker.on('halfOpen', () => console.info('Circuit HALF-OPEN'));

await breaker.fire(args);
```

**Python — pybreaker**
```python
import pybreaker

db_breaker = pybreaker.CircuitBreaker(
    fail_max=5,           # Open after 5 consecutive failures
    reset_timeout=30,     # Reset after 30 seconds
)

@db_breaker
def query_database(sql):
    return db.execute(sql)
```

**Go — go-circuit-breaker (sony/gobreaker)**
```go
import "github.com/sony/gobreaker"

cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "payment-api",
    MaxRequests: 3,
    Interval:    10 * time.Second,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 5
    },
})

result, err := cb.Execute(func() (interface{}, error) {
    return paymentClient.Charge(ctx, amount)
})
```

---

## Bulkhead Pattern

Isolate resources by concern. Prevent one slow dependency from exhausting all threads/connections.

### Thread Pool Isolation
```java
// Resilience4j Bulkhead — limit concurrent calls to payment service
BulkheadConfig config = BulkheadConfig.custom()
    .maxConcurrentCalls(10)       // Max 10 simultaneous calls
    .maxWaitDuration(Duration.ofMillis(100))  // Fail fast if full
    .build();

Bulkhead bulkhead = Bulkhead.of("payment-service", bulkhead config);

// Inventory service gets its own bulkhead — cannot starve payment
Bulkhead inventoryBulkhead = Bulkhead.of("inventory-service", ...);
```

### Connection Pool Isolation
```javascript
// Node.js — separate pg pools per use case
const readPool = new Pool({ max: 10, idleTimeoutMillis: 30000 });
const writePool = new Pool({ max: 5, idleTimeoutMillis: 30000 });
const analyticsPool = new Pool({ max: 2, idleTimeoutMillis: 60000 });
// Analytics queries cannot exhaust write connections
```

---

## Retry with Backoff

**Naive retry** (bad — amplifies load on failing service):
```
retry immediately → retry immediately → retry immediately
```

**Exponential Backoff + Jitter** (correct):
```
attempt 1 failed → wait ~1s
attempt 2 failed → wait ~2s
attempt 3 failed → wait ~4s (+/- jitter)
attempt 4 failed → give up
```

### Decorrelated Jitter (recommended — Cloudflare/AWS pattern)

```python
import random
import time

def retry_with_decorrelated_jitter(fn, max_retries=4, base=1, cap=60):
    sleep = base
    for attempt in range(max_retries):
        try:
            return fn()
        except TransientError as e:
            if attempt == max_retries - 1:
                raise
            sleep = min(cap, random.uniform(base, sleep * 3))
            time.sleep(sleep)
```

```go
// Go — exponential backoff with jitter
func withRetry(ctx context.Context, fn func() error) error {
    b := &backoff.ExponentialBackOff{
        InitialInterval:     500 * time.Millisecond,
        RandomizationFactor: 0.5,
        Multiplier:          2,
        MaxInterval:         30 * time.Second,
        MaxElapsedTime:      2 * time.Minute,
    }
    return backoff.Retry(fn, backoff.WithContext(b, ctx))
}
```

### What to Retry

| Error Type | Retry? | Why |
|------------|--------|-----|
| HTTP 429 Too Many Requests | Yes | With respect for `Retry-After` header |
| HTTP 500 Internal Server Error | Yes | Transient server error |
| HTTP 502/503/504 | Yes | Gateway/upstream issue |
| Network timeout | Yes | Transient |
| HTTP 400 Bad Request | **No** | Client bug — retrying won't help |
| HTTP 401/403 | **No** | Auth issue — retrying won't help |
| HTTP 404 Not Found | **No** | Resource missing |

**Idempotency:** Only retry operations that are safe to repeat. POST requests that create resources must be idempotent (use idempotency keys) before adding retry.

---

## Timeout Hierarchies

Every external call needs a timeout. Multiple layers, inner ones tighter:

```
User Request Deadline: 5000ms (Context deadline in Go)
  └── Payment Service Call: 3000ms
        └── Payment Provider API: 2000ms (HTTP client timeout)
              ├── Connect Timeout: 500ms
              └── Read Timeout: 1500ms
```

### By Language

**Go — context-based deadlines (idiomatic)**
```go
// Outer: propagate context from HTTP request
ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
defer cancel()

resp, err := paymentClient.Charge(ctx, amount)
if errors.Is(err, context.DeadlineExceeded) {
    // Return 504 to caller
}
```

**Java — HttpClient with timeout**
```java
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofMillis(500))
    .build();

HttpRequest request = HttpRequest.newBuilder()
    .timeout(Duration.ofSeconds(3))
    .uri(URI.create(url))
    .build();
```

**Python — httpx (preferred over requests for timeouts)**
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.get(
        url,
        timeout=httpx.Timeout(connect=0.5, read=2.0, write=1.0, pool=0.5)
    )
```

---

## Fallback Strategies

When the dependency is unavailable, what do you return?

| Strategy | Example | Use When |
|----------|---------|----------|
| **Static default** | `{ "recommendations": [] }` | Empty is acceptable |
| **Cached value** | Last successful response from cache | Stale data is better than nothing |
| **Degraded mode** | Show prices without personalization | Core feature must continue |
| **Queue for later** | Write to local queue, process when recovered | Eventual consistency acceptable |
| **Fail fast + user message** | "Feature temporarily unavailable" | No meaningful fallback exists |

```javascript
// Node.js — Redis cache fallback pattern
async function getUserProfile(userId) {
    try {
        const profile = await profileService.get(userId);
        await cache.set(`profile:${userId}`, profile, 'EX', 300);
        return profile;
    } catch (err) {
        // Service unavailable — try cache
        const cached = await cache.get(`profile:${userId}`);
        if (cached) return { ...JSON.parse(cached), _stale: true };
        // Cache miss — return minimal profile
        return { userId, name: 'User', _degraded: true };
    }
}
```

---

## Graceful Degradation

Emergency shutoff via feature flags:

```javascript
// Emergency: disable recommendation engine during incident
if (await featureFlags.isEnabled('recommendations', userId)) {
    recommendations = await recommendationService.get(userId);
} else {
    recommendations = await getTopSellers(); // always works, no ML
}
```

**Read-Only Mode** — when writes fail, serve reads:
```go
var readOnlyMode atomic.Bool

func handleWrite(w http.ResponseWriter, r *http.Request) {
    if readOnlyMode.Load() {
        http.Error(w, "Service in read-only mode", http.StatusServiceUnavailable)
        return
    }
    // ... normal write logic
}
```

---

## Health Check Patterns (Kubernetes)

```yaml
livenessProbe:    # Is the process healthy? Restart if fails.
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3   # Restart after 3 consecutive failures

readinessProbe:   # Is the service ready for traffic? Remove from LB if fails.
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 2   # Remove from LB faster than we restart

startupProbe:     # Give slow-starting apps time to initialize.
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30  # Allow 5 minutes (30 * 10s) for startup
  periodSeconds: 10
```

**Health check implementation:**
```go
// /health/live — is the process running?
func livenessHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
}

// /health/ready — can we serve traffic?
func readinessHandler(w http.ResponseWriter, r *http.Request) {
    if err := db.PingContext(r.Context()); err != nil {
        http.Error(w, "db unhealthy", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Retry without jitter | Thundering herd after outage | Add decorrelated jitter |
| Infinite retries | Never gives up, cascades | Set max retries + circuit breaker |
| Same timeout for all dependencies | DB needs different timeout than cache | Per-dependency timeouts |
| Circuit breaker on every error | Opens on expected errors (404, 400) | Only count transient errors |
| No fallback in circuit open state | Error instead of degraded response | Always define fallback |
| Health check queries database | DB slow → all pods removed from LB → thundering herd | Separate liveness (process) from readiness (deps) |

---

## Reference Skills

- `chaos-engineering` — testing that these patterns work
- `observability` — monitoring circuit breaker state and retry rates
- `load-testing` — validating behavior under load
