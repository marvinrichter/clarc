---
description: Guided profiling workflow — detects language, recommends the right profiler, starts a session, and interprets the top hotspots with concrete next steps
---

# Profile Command

Profile performance and identify bottlenecks: $ARGUMENTS

## Your Task

Guide the user through a complete profiling session: detect the language/runtime, install the right profiler, start the session, interpret results, and provide prioritized next steps.

## Step 1 — Identify Context

Ask or detect:
1. What language/runtime? (Go, Python, Node.js, Java, other)
2. What service or script to profile?
3. What's the symptom? (High CPU? High memory? Slow requests? Memory growth over time?)
4. Is the service already running or will it be started fresh?

## Step 2 — Choose Profiler

| Language | CPU | Memory | Recommended |
|----------|-----|--------|-------------|
| Go | pprof | pprof heap | pprof — built-in, zero setup |
| Python | py-spy | tracemalloc | py-spy — no code changes, attach to running process |
| Node.js | 0x / --prof | node-inspect heap | 0x — automatic flamegraph |
| Java/JVM | async-profiler | async-profiler alloc | async-profiler |
| Kotlin | async-profiler | async-profiler alloc | same as Java |
| Rust | cargo flamegraph | heaptrack | cargo flamegraph |
| C/C++ | perf | valgrind massif | perf + flamegraph.pl |
| PHP | Xdebug / Blackfire | Blackfire | Blackfire |

## Step 3 — Install Profiler

Generate exact install commands for the detected language:

**Go** — no install needed if `net/http/pprof` is imported:
```bash
# Verify pprof endpoint is available
curl -s http://localhost:6060/debug/pprof/ | head -5
# If not: add to server code:
# import _ "net/http/pprof"
# go http.ListenAndServe(":6060", nil)
```

**Python:**
```bash
pip install py-spy
# Check version
py-spy --version
```

**Node.js:**
```bash
npm install -g 0x
# or use built-in V8 profiler (no install):
# node --prof app.js
```

**Java:**
```bash
# Download async-profiler
ASPROF_VERSION=3.0
curl -L "https://github.com/async-profiler/async-profiler/releases/download/v${ASPROF_VERSION}/async-profiler-${ASPROF_VERSION}-linux-x64.tar.gz" | tar xz
# or for macOS:
curl -L "https://github.com/async-profiler/async-profiler/releases/download/v${ASPROF_VERSION}/async-profiler-${ASPROF_VERSION}-macos.zip" -o async-profiler.zip && unzip async-profiler.zip
```

## Step 4 — Start Profiling Session

Generate exact commands for the detected language and symptom:

### CPU Profile

**Go:**
```bash
# Start load test first (in separate terminal)
# k6 run script.js  OR  hey -n 10000 http://localhost:8080/api/endpoint

# Capture 30-second CPU profile
go tool pprof -http=:8090 http://localhost:6060/debug/pprof/profile?seconds=30
# Browser opens automatically — look at flamegraph tab
```

**Python:**
```bash
# Find the PID
ps aux | grep python | grep -v grep

# Attach to running process (non-invasive)
py-spy record --pid <PID> -o profile.svg --duration 30

# Or from scratch
py-spy record -- python -m myapp -o profile.svg --duration 30

# View: open profile.svg in browser
```

**Node.js:**
```bash
# With 0x (generates flamegraph automatically)
0x -- node app.js
# While running: generate load
# Stop with Ctrl+C — flamegraph opens in browser

# Or profile running process
0x --pid <PID>
```

**Java:**
```bash
# Get PID
jps -l

# 30-second CPU profile → interactive HTML
./profiler.sh -d 30 -f profile.html <PID>
open profile.html
```

### Memory Profile

**Go:**
```bash
# Heap snapshot
curl http://localhost:6060/debug/pprof/heap > heap.pprof
go tool pprof -http=:8090 heap.pprof
# In browser: change "Sample" dropdown to "inuse_space" for live allocations
# or "alloc_space" for all allocations since startup
```

**Python:**
```python
# Add to your code for leak detection:
import tracemalloc
tracemalloc.start()
# ... run for a while ...
snapshot1 = tracemalloc.take_snapshot()
# ... run more ...
snapshot2 = tracemalloc.take_snapshot()
top_stats = snapshot2.compare_to(snapshot1, 'lineno')
for stat in top_stats[:15]:
    print(stat)
```

**Node.js:**
```bash
# Take heap snapshot via Chrome DevTools Protocol
node --inspect app.js
# Open chrome://inspect → click "inspect" → Memory tab → Take snapshot
```

## Step 5 — Generate Load During Profile

Profiling without load shows nothing. Use the right load generator:

```bash
# HTTP service
hey -n 50000 -c 50 http://localhost:8080/api/endpoint
# or
k6 run --vus 50 --duration 30s script.js

# For Python/Go scripts (not HTTP servers)
# Just run the script with representative input:
python process_large_file.py --input testdata/large.json
```

## Step 6 — Interpret Results

After the profile completes, guide the user through reading the output:

**Flamegraph:**
1. Find the WIDEST bars — most CPU time spent there
2. Look at the TOP of wide towers — leaf functions are actual bottlenecks
3. If tops are `syscall`/`epoll`/`futex` → I/O-bound, not CPU-bound
4. If tops are your business logic → CPU-bound, optimize the algorithm

**Top N functions:**
```
flat%  cum%  function
12.5%  18.2%  json.Marshal         ← 12.5% of all time in this function itself
8.3%   8.3%   database/sql.(*Stmt).Query
6.1%   45.2%  myapp.HandleRequest  ← calls expensive things (high cum%)
```

**Identify the top 3 hotspots** and for each:
1. Is this expected (necessary work) or avoidable?
2. How many times is it called? (callees × call rate)
3. What's the simplest optimization?

## Step 7 — Next Steps

For each identified hotspot, provide:

1. **Root cause** — specific explanation
2. **Expected impact** — estimated % improvement
3. **Fix** — concrete code change
4. **Verification** — how to confirm the fix worked (re-profile, compare metrics)

**Always re-profile after each fix** — fixing one bottleneck reveals the next.

## Step 8 — Continuous Profiling (Optional)

For production insights:
```bash
# Continuous pprof in Go (safe for production, ~1% overhead)
# Already running if net/http/pprof is imported

# Pyroscope — continuous profiling server
docker run -d --name pyroscope -p 4040:4040 grafana/pyroscope

# Push profiles to Pyroscope from Go
# go get github.com/grafana/pyroscope-go
```

## Reference Skills

- `performance-profiling` — detailed profiling reference for each language
- `web-performance` — browser-side performance profiling
- `load-testing` — generating realistic load during profiling
- `observability` — setting up P99 latency metrics in production
