---
description: Review Edge Function code for runtime compatibility, bundle size, caching opportunities, and security — supports Cloudflare Workers, Vercel Edge, and Deno Deploy
---

# Edge Review Command

Review edge function code for: $ARGUMENTS

## Your Task

Systematically audit edge function code for runtime compatibility violations, performance issues, and security gaps. Specify the target runtime (cloudflare|vercel|deno) or detect automatically.

## Step 1 — Detect Edge Runtime

```bash
# Detect from config files
ls wrangler.toml wrangler.json next.config.js next.config.ts deno.json 2>/dev/null

# Check for runtime declaration
grep -rn "export const runtime\|edge-runtime\|@cloudflare\|wrangler" . \
  --include="*.ts" --include="*.js" --include="*.json" | head -10
```

## Step 2 — Runtime Compatibility Check

### Forbidden Node.js APIs

```bash
# Find Node.js-specific imports in edge code
grep -rn "require\|from 'fs'\|from 'path'\|from 'os'\|from 'net'\|from 'child_process'\|from 'crypto'\|from 'buffer'\|from 'stream'\|from 'http'\|from 'https'" \
  src/ lib/ middleware/ functions/ --include="*.ts" --include="*.js"

# Check for process.env (should use env binding in CF Workers)
grep -rn "process\.env" src/ lib/ --include="*.ts" --include="*.js"
```

Check each import:
- [ ] `fs`, `path`, `os` → ❌ Not available in edge runtimes
- [ ] `child_process` → ❌ Not available
- [ ] `net`, `dgram`, `tls` → ❌ Not available
- [ ] `process.env.*` → ⚠️ Use `env.MY_VAR` in Cloudflare Workers
- [ ] `Buffer` → ⚠️ Use `Uint8Array` or `TextEncoder/Decoder`
- [ ] `crypto` (Node) → ⚠️ Use `globalThis.crypto` (Web Crypto API)

### Incompatible npm Packages

```bash
# Find large/incompatible packages
grep -rn "from 'moment\|from 'lodash\|from 'axios\|from 'express" \
  src/ lib/ --include="*.ts" --include="*.js"
```

- `moment` → ❌ Large, Node.js deps. Use `date-fns` or `Temporal` API
- `lodash` → ⚠️ Usually fine if tree-shaken, but check bundle size
- `axios` → ⚠️ Use native `fetch` instead (available everywhere)
- `express` → ❌ Not compatible. Use `Request`/`Response` directly

## Step 3 — Bundle Size Estimate

```bash
# Build and check size
wrangler deploy --dry-run --outdir dist 2>/dev/null && ls -la dist/*.js

# Or for Next.js edge
next build && cat .next/server/edge-chunks/*.js | wc -c

# Check individual import sizes (requires esbuild)
npx esbuild src/worker.ts --bundle --analyze 2>&1 | head -40
```

Limits:
- Cloudflare Workers: **1 MB** compressed (3 MB uncompressed)
- Vercel Edge: **4 MB**
- Deno Deploy: No enforced limit (practical ~10 MB)

## Step 4 — Cold Start Risk

```bash
# Find initialization code outside handler
grep -n "const.*=.*new\|await.*connect\|\.connect(" src/ lib/ --include="*.ts" -r
```

Check placement:
- Module-scope initialization (outside handler) → ✅ Cached between warm invocations
- Handler-scope initialization → ⚠️ Runs on every request (fine for edge, not lambda)
- Database connections at module scope → ✅ Reuse connection pool

## Step 5 — Error Handling

```bash
grep -n "fetch(" src/ lib/ --include="*.ts" --include="*.js" -r
```

For each `fetch()` call:
- [ ] Wrapped in `try/catch` or `.catch()`
- [ ] Timeout set? (`AbortSignal.timeout(5000)`)
- [ ] Response status checked (`if (!res.ok) throw new Error(...)`)
- [ ] Streaming response properly piped/closed

```typescript
// CORRECT: fetch with timeout and error handling
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
if (!res.ok) throw new Error(`Upstream ${res.status}: ${await res.text()}`);
```

## Step 6 — Caching Opportunities

```bash
# Find API calls or data fetching
grep -n "fetch(\|env\..*\.get\|kv\.get" src/ lib/ --include="*.ts" -r
```

Check for:
- [ ] Frequently read data cached in KV or Cache API?
- [ ] `Cache-Control` headers set on responses?
- [ ] `Surrogate-Control` or `CDN-Cache-Control` for CDN layer?
- [ ] Cache key collision risk (shared KV keys per tenant)?

## Step 7 — Secret Handling

```bash
grep -n "process\.env\|hardcoded\|sk-\|api_key\|secret" src/ lib/ --include="*.ts" -r | grep -v "test\|spec"
```

- [ ] Secrets accessed via `env.SECRET_NAME` (Workers) or `process.env` (Vercel — OK)
- [ ] No hardcoded API keys or tokens
- [ ] Secrets not logged (`logger.info({ env })`)
- [ ] Secrets in `wrangler.toml [vars]` only for non-sensitive values (committed to git)

## Step 8 — Cloudflare-Specific (if applicable)

```bash
grep -rn "waitUntil\|passThroughOnException" src/ --include="*.ts"
```

- [ ] Background tasks use `ctx.waitUntil()` (not `Promise` that outlives response)
- [ ] `passThroughOnException()` considered for non-critical workers?
- [ ] Durable Objects use correct class binding in `wrangler.toml`
- [ ] KV writes are eventually consistent (not used for strong consistency)

## Output Format

```markdown
## Edge Review — [Runtime]

### CRITICAL
1. **`import { readFileSync } from 'fs'`** — `fs` not available in edge runtime
   - Location: `src/handler.ts:3`
   - Fix: Replace with `fetch()` to load from URL, or bundle the file as JSON

### HIGH
1. **`moment` imported — bundle too large** — 67KB minified, likely to hit size limit
   - Location: `src/utils/date.ts:1`
   - Fix: `import { format } from 'date-fns/format'` (1.8KB tree-shaken)

2. **`fetch()` without timeout** — edge function hangs indefinitely on slow upstream
   - Location: `src/api.ts:12`
   - Fix: `fetch(url, { signal: AbortSignal.timeout(5000) })`

### MEDIUM
1. **No `Cache-Control` on expensive API responses** — re-fetches on every request
   - Location: `src/index.ts:45`
   - Fix: `response.headers.set('Cache-Control', 'public, s-maxage=60')`

### Positive Patterns
- `waitUntil()` correctly used for analytics logging
- All secrets accessed via `env.SECRET` binding
```

## Reference Skills

- `edge-patterns` — Cloudflare Workers, Vercel Edge, Deno Deploy
- `serverless-patterns` — Lambda-specific patterns (cold starts, event sources)

## After This

- `/security-review` — audit edge authentication, TLS termination, and header injection
- `/web-perf` — profile bundle size and cold start latency
