---
name: performance-profiling
description: "Performance profiling workflows: CPU profiling (pprof, py-spy, async-profiler, 0x), memory profiling (heap analysis, leak detection), flamegraph interpretation, latency analysis (P50/P99/P99.9), and profiling anti-patterns per language (Go, Python, JVM, Node.js)."
---

# Performance Profiling Skill

Load testing says "it's slow." Profiling tells you why. This skill covers profiling workflows for CPU, memory, and latency across languages — from running the profiler to reading the flamegraph.

## When to Activate

- A service is slower than its SLO and the cause is unknown
- Post-load-test: numbers are bad, now find the bottleneck
- Reviewing a pull request that touches hot code paths
- Investigating memory growth over time (leak detection)
- Optimizing before a traffic spike

---

## CPU Profiling

### Go — pprof (built-in, zero setup)

```go
// Add to your HTTP server
import _ "net/http/pprof"

func main() {
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()
    // ... rest of your server
}
```

```bash
# Profile for 30 seconds (service must be running)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Inside pprof interactive mode:
(pprof) top10          # Top 10 functions by CPU time
(pprof) top10 -cum     # Top 10 by cumulative (includes callees)
(pprof) web            # Open flamegraph in browser (requires graphviz)
(pprof) list MyFunc    # Annotated source for a specific function

# Direct flamegraph (no interactive)
go tool pprof -http=:8090 http://localhost:6060/debug/pprof/profile?seconds=30
```

```bash
# goroutine stack dump (for concurrency issues)
curl http://localhost:6060/debug/pprof/goroutine?debug=2

# Block profile (channel/lock contention)
curl "http://localhost:6060/debug/pprof/block?seconds=10" > block.pprof
go tool pprof block.pprof

# Mutex profile
curl "http://localhost:6060/debug/pprof/mutex?seconds=10" > mutex.pprof
go tool pprof mutex.pprof
```

### Python — py-spy (sampling, zero overhead, no code changes)

```bash
# Install
pip install py-spy

# Attach to running process (get PID with: ps aux | grep python)
py-spy top --pid 12345          # Live top-like view
py-spy record --pid 12345 -o profile.svg --duration 30

# Profile from start
py-spy record -- python myapp.py -o profile.svg

# Open profile.svg in browser — it's an interactive SVG flamegraph
```

```python
# cProfile (built-in, deterministic — higher overhead)
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()
# ... code to profile ...
profiler.disable()

stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)  # Top 20 functions

# snakeviz — browser-based visualization
# pip install snakeviz
# python -m cProfile -o output.prof myapp.py
# snakeviz output.prof
```

### JVM (Java/Kotlin/Scala) — async-profiler

```bash
# Download async-profiler
curl -L https://github.com/async-profiler/async-profiler/releases/latest/download/async-profiler-linux-x64.tar.gz | tar xz

# Attach to running JVM (get PID with: jps)
./profiler.sh -d 30 -f profile.html 12345
# Open profile.html in browser — interactive flamegraph

# Allocation profiling (memory allocation hot spots)
./profiler.sh -e alloc -d 30 -f alloc.html 12345

# Lock profiling
./profiler.sh -e lock -d 30 -f lock.html 12345
```

```bash
# Java Flight Recorder (JDK built-in, low overhead)
# Start recording
jcmd 12345 JFR.start duration=60s filename=recording.jfr settings=profile

# Open in JDK Mission Control (jmc)
jmc recording.jfr
```

### Node.js — 0x (flamegraph generation)

```bash
# Install
npm install -g 0x

# Profile your app
0x -- node app.js

# Or with existing app: inject --prof
node --prof app.js
# ... run load test ...
node --prof-process isolate-*.log > processed.txt

# Better: 0x for flamegraphs
0x -o profile/ -- node -r ts-node/register src/server.ts
# Opens flamegraph in browser automatically
```

### Linux — perf (system-wide, language-agnostic)

```bash
# Record CPU events
sudo perf record -g -p $(pgrep myapp) sleep 30

# Generate report
sudo perf report

# Flamegraph (requires Brendan Gregg's scripts)
sudo perf script | stackcollapse-perf.pl | flamegraph.pl > perf.svg
```

---

## Memory Profiling

### Go — heap profile

```bash
# Heap profile
curl "http://localhost:6060/debug/pprof/heap" > heap.pprof
go tool pprof heap.pprof

# Inside pprof:
(pprof) top20          # Top allocators
(pprof) inuse_objects  # Currently allocated objects (not GC'd)
(pprof) alloc_objects  # Total allocations since start
(pprof) web            # Flamegraph

# Memory escape analysis (build-time)
go build -gcflags="-m=2" ./... 2>&1 | grep "escapes to heap"
# Objects that escape to heap increase GC pressure
```

### Python — tracemalloc + memory-profiler

```python
# tracemalloc (built-in, no overhead until enabled)
import tracemalloc

tracemalloc.start()
# ... code ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)

# Compare two snapshots to find leaks
snapshot2 = tracemalloc.take_snapshot()
top_stats = snapshot2.compare_to(snapshot1, 'lineno')
for stat in top_stats[:10]:
    print(stat)
```

```bash
# memory-profiler — line-by-line memory usage
pip install memory-profiler

# Add @profile decorator to function you want to profile
# mprof run python myapp.py
# mprof plot  # Shows memory over time graph
```

```python
# objgraph — find reference cycles and leaks
import objgraph
objgraph.show_most_common_types(20)
objgraph.show_growth()   # Objects that grew since last call
# objgraph.show_refs(obj, max_depth=3)  # Reference graph for an object
```

### Node.js — MemLab / Chrome Memory Snapshot

```bash
# MemLab (Meta — detects memory leaks in browser/Node.js)
npm install -g memlab
memlab run --scenario scenario.js
```

```javascript
// Chrome DevTools in Node.js
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();
console.log(heapStats);

// Take heap snapshot
const inspector = require('inspector');
const session = new inspector.Session();
session.connect();
session.post('HeapProfiler.takeHeapSnapshot', null, (err, r) => {
    console.log('Snapshot taken');
    session.disconnect();
});
```

---

## Flamegraph Interpretation

A flamegraph visualizes where CPU time is spent:

```
Wide bar → function spends a lot of time here (or is called often)
Tall stack → deep call chain
Flat top → leaf function where CPU is actually spent (the bottleneck)
Wide base → frequently called root function

Reading a flamegraph:
1. Find the widest bars — most time spent
2. Look at the TOP of wide towers — that's where time is actually consumed
3. Wide, flat tops = CPU-bound work (the code itself is slow)
4. Wide, tall stacks = I/O or lock wait (many layers, but nothing at top)

CPU-bound vs I/O-bound:
- CPU: top of flamegraph is full of compute (string ops, parsing, crypto)
- I/O: top has many sys_read/epoll_wait/futex calls (waiting, not computing)
```

---

## Latency Analysis

### Percentiles Matter

```
P50 (median): 50% of requests are faster than this
P95:          95% of requests are faster than this
P99:          99% of requests are faster than this
P99.9:        999 of 1000 requests are faster than this

Why tail latency matters:
- A user making 100 requests per page load will hit P99 on almost every page
- P50 being great doesn't help users who hit P99.9
- SLOs should be on P99, not P50
```

### Common Tail Latency Causes

| Cause | Symptom | Diagnosis |
|-------|---------|-----------|
| GC pauses | Intermittent spikes at P99 | `gc` in flamegraph, GC logs |
| Lock contention | Flat peaks at mutex/futex | mutex profile in pprof, lock profile in async-profiler |
| Thread pool saturation | Queuing delay | Thread pool metrics, queue depth |
| Network jitter | Variation independent of code | Separate network latency measurement |
| Database slow query | Matches DB query timing | DB slow query log |
| Connection pool exhaustion | Spikes correlate with high load | Pool wait time metrics |

---

## Profiling Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|-----------------|
| Profile in development only | Dev load != prod load | Profile under realistic traffic in staging |
| Profile cold start | JIT/warm-up biases results | Run load for 60s before profiling |
| Profile for 1 second | Too short, sampling noise | Profile for 30-60 seconds minimum |
| Profile without load | Idle profiling shows nothing | Run load test simultaneously |
| Only look at P50 | Misses tail latency | Profile P99/P99.9 tail |
| Optimize the first hotspot | May not be the bottleneck | Fix biggest, re-profile to confirm |
| Micro-benchmark without warmup | JIT not kicked in | Add warmup iterations before measuring |

---

## Quick Reference — Tool Selection

| Language | CPU Profiling | Memory Profiling | Recommended |
|----------|---------------|-----------------|-------------|
| Go | pprof (built-in) | pprof heap | pprof — zero setup |
| Python | py-spy | tracemalloc | py-spy — no code changes |
| Java | async-profiler | async-profiler alloc | async-profiler |
| Node.js | 0x / --prof | MemLab, heapdump | 0x for flamegraphs |
| Rust | cargo flamegraph | valgrind/heaptrack | cargo flamegraph |
| C/C++ | perf | valgrind massif | perf + valgrind |
| Linux (any) | perf | valgrind | perf for system-wide |

---

## Reference Commands

- `/profile` — guided profiling workflow for any language
- `load-testing` skill — generate realistic load during profiling session
- `observability` skill — set up continuous performance metrics
- `web-performance` skill — browser/frontend performance profiling
