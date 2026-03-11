---
name: debugging-workflow
description: "Systematic debugging methodology — reproduction, isolation, binary search, profiling, distributed tracing, memory leaks, and race conditions. A structured approach that prevents random guessing and finds root causes faster."
---

# Debugging Workflow

Bugs are found by narrowing the search space, not by guessing. Every technique here reduces possibilities.

## When to Activate

- A bug is not immediately obvious after reading the code
- An intermittent failure (flaky test, race condition)
- A performance regression (something got slower)
- A memory leak or out-of-memory crash
- A "works on my machine" environment mismatch
- Production incident requiring root cause analysis

---

## Universal Debugging Process

```
1. REPRODUCE        Make the bug happen reliably
2. ISOLATE          Shrink the failing case to minimum
3. HYPOTHESIZE      Form ONE specific, falsifiable hypothesis
4. VERIFY           Test the hypothesis (binary search if needed)
5. FIX              Change only what's needed
6. CONFIRM          Verify fix + run regression tests
```

Never skip steps. Jumping to "fix" before "reproduce" reliably is how you get false fixes.

---

## Step 1 — Reproduce Reliably

Before anything else, make the bug deterministic.

```bash
# Capture exact environment
node --version && npm --version
cat package-lock.json | grep '"lockfileVersion"'

# For flaky tests: run in a loop until it fails
for i in {1..50}; do npx vitest run --reporter=verbose 2>&1 | grep -E "FAIL|PASS"; done

# For flaky tests: force specific seed
npx vitest run --seed 12345

# For race conditions: stress test
go test -race -count=100 ./...
```

**If you can't reproduce, you can't debug.** Fix the environment difference first.

---

## Step 2 — Isolate (Minimal Reproduction)

Remove everything that isn't part of the bug.

```bash
# Git bisect: find the commit that introduced the bug
git bisect start
git bisect bad HEAD          # current is broken
git bisect good v1.2.0       # last known good tag/commit
# Git checks out midpoint automatically
# Run your test, then:
git bisect good   # or: git bisect bad
# Repeat until: "abc123 is the first bad commit"
git bisect reset
```

For code bugs, reduce the test case:
1. Remove unrelated modules one by one
2. Comment out code until bug disappears
3. The last removed piece is in the causal chain
4. Re-add just that piece → minimal reproduction

---

## Step 3 — Instrument Before Guessing

Add targeted logging, not random print statements everywhere.

### Node.js / TypeScript

```typescript
// Trace a specific function call chain
const DEBUG = process.env.DEBUG?.includes('orders');

function createOrder(input: CreateOrderInput) {
  DEBUG && console.log('[createOrder] input:', JSON.stringify(input));
  const validated = validate(input);
  DEBUG && console.log('[createOrder] validated:', validated);
  const result = db.insert(validated);
  DEBUG && console.log('[createOrder] result:', result);
  return result;
}

// Enable: DEBUG=orders node server.js
```

```typescript
// Node.js built-in inspector (no print statements needed)
// Start: node --inspect server.js
// Then: chrome://inspect → Sources → set breakpoints
// Or: node --inspect-brk server.js  (breaks at first line)
```

```typescript
// Async call timing
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    console.log(`[timing] ${label}: ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  } catch (err) {
    console.log(`[timing] ${label}: FAILED after ${(performance.now() - start).toFixed(2)}ms`);
    throw err;
  }
}

const result = await timed('db.findOrder', () => db.orders.findById(id));
```

### Go

```go
// Use structured logging with context
log.Printf("[createOrder] userId=%s items=%d", req.UserID, len(req.Items))

// go tool pprof: CPU profile
import "runtime/pprof"
f, _ := os.Create("cpu.prof")
pprof.StartCPUProfile(f)
defer pprof.StopCPUProfile()

// Then: go tool pprof cpu.prof → top10, web (flame graph)

// Race condition detection
go test -race ./...
go run -race main.go
```

### Python

```python
import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(name)s %(message)s')
logger = logging.getLogger(__name__)

# pdb: Python debugger
import pdb; pdb.set_trace()  # breakpoint (Python 3.7+: use breakpoint())

# Profile: find slow functions
python -m cProfile -o profile.out script.py
python -m pstats profile.out  # → sort cumulative → stats 20
```

---

## Performance Debugging

### Slow Endpoint — Systematic Approach

```bash
# 1. Measure end-to-end
curl -w "\nTotal: %{time_total}s\nConnect: %{time_connect}s\nTTFB: %{time_starttransfer}s\n" \
  -o /dev/null -s https://api.example.com/orders/123

# 2. Find which layer is slow
# Add timing headers in middleware:
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
  });
  next();
});
```

### Database Query Analysis

```sql
-- PostgreSQL: find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Explain a specific query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = '123' ORDER BY created_at DESC LIMIT 10;

-- Look for:
-- Seq Scan on large table → missing index
-- Rows Removed by Filter: high → index not selective enough
-- Hash Batches > 1 → work_mem too low
-- Nested Loop with large estimates → stale statistics (ANALYZE)
```

```bash
# Add index and verify
CREATE INDEX CONCURRENTLY idx_orders_user_id_created ON orders(user_id, created_at DESC);
EXPLAIN ANALYZE ...  # run again — should show Index Scan
```

### N+1 Query Detection

```typescript
// Log all queries to spot N+1 patterns
// Drizzle
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[SQL]', query, params);
    }
  }
});

// If you see the same query in a loop:
// SELECT * FROM posts WHERE user_id = $1 (called 50 times)
// → Missing eager load / DataLoader
```

---

## Memory Leak Debugging

### Node.js

```typescript
// Heap snapshot comparison
// 1. Start app
// 2. Run workload N times
// 3. Take heap snapshot: node --inspect → Memory → Take snapshot
// 4. Run workload N times more
// 5. Take second snapshot → Comparison → objects that grew = leak

// Command line heap monitoring
node --expose-gc server.js
// Then at intervals:
global.gc();
const { heapUsed } = process.memoryUsage();
console.log(`Heap: ${(heapUsed / 1024 / 1024).toFixed(2)} MB`);
```

**Common Node.js memory leak sources:**
```typescript
// ❌ Event listener accumulation
emitter.on('data', handler);  // never removed
// ✅ Fix: emitter.once() or explicit removeListener in cleanup

// ❌ Growing cache without eviction
const cache = new Map();  // grows forever
cache.set(key, value);
// ✅ Fix: use LRU cache (lru-cache package) with max size

// ❌ Closure holding large object
function createHandler(largeData: Buffer) {
  return () => console.log(largeData.length);  // largeData never GC'd
}
// ✅ Fix: extract only what you need from largeData
```

### Go

```go
// go tool pprof — heap profile
import "net/http/pprof"
import _ "net/http/pprof"  // registers /debug/pprof endpoints

// Then:
go tool pprof http://localhost:6060/debug/pprof/heap
# top10
# list <function-name>
# web  (flame graph, requires graphviz)
```

---

## Race Condition Debugging

```go
// Go: always run with -race
go test -race ./...

// Common patterns that cause races:
// 1. Shared map without mutex
var cache = map[string]string{}
go func() { cache[key] = value }()  // DATA RACE
// Fix: sync.RWMutex or sync.Map

// 2. Goroutine captures loop variable
for _, item := range items {
    go func() {
        process(item)  // captures loop var — all goroutines see last item
    }()
}
// Fix (Go 1.22+): loop variable is properly scoped
// Fix (Go <1.22): item := item before the goroutine
```

```typescript
// JavaScript: race in async code
let result;
fetchA().then(a => { result = a; });
fetchB().then(b => { result = b; });  // whichever resolves last wins
// Fix: Promise.all([fetchA(), fetchB()]) → both results

// Race in React (stale closure / state)
useEffect(() => {
  let cancelled = false;
  fetchOrder(id).then(order => {
    if (!cancelled) setOrder(order);  // ignore if effect cleaned up
  });
  return () => { cancelled = true; };
}, [id]);
```

---

## Distributed Tracing (Production)

> **Cross-reference:** The OpenTelemetry setup and instrumentation patterns below are also covered in depth in the `observability` skill, including collector configuration, sampling strategies, and Grafana/Jaeger dashboard setup. Use this section for debugging context; use `observability` for production rollout.

When a request is slow and you don't know which service caused it:

```typescript
// OpenTelemetry — auto-instrument Express
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://jaeger:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```typescript
// Manual span for critical sections
import { trace, SpanStatusCode } from '@opentelemetry/api';
const tracer = trace.getTracer('order-service');

async function processOrder(orderId: string) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttribute('order.id', orderId);
    try {
      const result = await doWork(orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

**Reading traces in Jaeger/Grafana Tempo:**
1. Find the slow root trace
2. Expand child spans — find the longest one
3. Drill into that service's spans
4. Repeat until you find the leaf span (usually a DB query or external call)

---

## Debugging Checklist

```
Reproduce
  □ Bug happens deterministically
  □ Minimal reproduction case created

Gather Evidence
  □ Error message + full stack trace collected
  □ Input that triggers the bug identified
  □ Environment diff checked (versions, env vars, data)
  □ git bisect run if regression

Instrument
  □ Targeted logging added at suspicious points
  □ Query explain plan checked (if DB involved)
  □ Profiler/tracer attached (if performance issue)

Hypothesis
  □ ONE specific hypothesis formed
  □ Prediction: "if X is the cause, then Y will happen when I do Z"

Verify
  □ Test confirmed or refuted hypothesis
  □ Root cause identified (not just symptom)

Fix
  □ Minimal change applied
  □ All tests pass
  □ Regression test added for this bug
  □ Debug logging removed
```
