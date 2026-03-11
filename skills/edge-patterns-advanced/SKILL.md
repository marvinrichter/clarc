---
name: edge-patterns-advanced
description: Advanced Edge Computing patterns — streaming responses (TransformStream, Server-Sent Events), edge caching (Cache API, stale-while-revalidate), Miniflare testing, and common edge runtime mistakes (Node.js APIs, large npm packages, synchronous computation).
---

# Edge Patterns — Advanced

This skill extends `edge-patterns` with streaming, caching, testing, and anti-patterns. Load `edge-patterns` first.

## When to Activate

- Streaming large responses through a Cloudflare Worker
- Implementing edge caching with stale-while-revalidate
- Testing Workers locally with Miniflare
- Debugging "not supported in edge runtime" errors for Node.js API usage

---

## Streaming Responses

```typescript
// Cloudflare Workers — streaming from a slow upstream
export default {
  async fetch(request: Request): Promise<Response> {
    const upstream = await fetch('https://slow-api.example.com/data');

    // Transform stream (uppercase each chunk)
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        controller.enqueue(new TextEncoder().encode(text.toUpperCase()));
      },
    });

    upstream.body!.pipeTo(writable);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });
  },
};

// Server-Sent Events
function* generateEvents() {
  for (let i = 0; i < 10; i++) {
    yield `data: ${JSON.stringify({ count: i })}\n\n`;
  }
}

export default {
  fetch(): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const event of generateEvents()) {
          controller.enqueue(encoder.encode(event));
          await new Promise(r => setTimeout(r, 1000));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  },
};
```

---

## Edge Caching

```typescript
// Cloudflare Cache API
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cache = caches.default;

    // Cache key — can be different from request URL
    const cacheKey = new Request(request.url, { method: 'GET' });

    // Check cache
    const cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        ...cached,
        headers: { ...cached.headers, 'X-Cache': 'HIT' },
      });
    }

    // Fetch and cache
    const response = await fetch(request);
    const toCache = new Response(response.body, response);
    toCache.headers.set('Cache-Control', 'public, max-age=3600');
    toCache.headers.set('X-Cache', 'MISS');

    // Store in background (don't block response)
    ctx.waitUntil(cache.put(cacheKey, toCache.clone()));

    return toCache;
  },
};
```

```typescript
// Stale-While-Revalidate pattern
async function swr(
  cacheKey: Request,
  fetchFn: () => Promise<Response>,
  maxAge: number,
  staleAge: number,
  ctx: ExecutionContext
): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(cacheKey);

  if (cached) {
    const age = parseInt(cached.headers.get('X-Cache-Age') ?? '0');
    if (age < maxAge) return cached;  // Fresh

    // Stale — return cached but revalidate in background
    if (age < staleAge) {
      ctx.waitUntil(
        fetchFn().then(fresh => {
          fresh.headers.set('X-Cache-Age', '0');
          return cache.put(cacheKey, fresh);
        })
      );
      return cached;
    }
  }

  // Miss or expired
  const fresh = await fetchFn();
  const toCache = new Response(fresh.body, fresh);
  toCache.headers.set('X-Cache-Age', '0');
  ctx.waitUntil(cache.put(cacheKey, toCache.clone()));
  return toCache;
}
```

---

## Testing — Miniflare

```typescript
// test/worker.test.ts
import { Miniflare } from 'miniflare';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Worker', () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = new Miniflare({
      scriptPath: './src/index.ts',
      kvNamespaces: ['MY_KV'],
      d1Databases: ['MY_DB'],
      bindings: { MY_SECRET: 'test-secret' },
    });
  });

  afterAll(() => mf.dispose());

  it('returns health check', async () => {
    const res = await mf.dispatchFetch('http://localhost/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('reads from KV', async () => {
    const kv = await mf.getKVNamespace('MY_KV');
    await kv.put('user:1', JSON.stringify({ name: 'Alice' }));

    const res = await mf.dispatchFetch('http://localhost/api/user/1');
    expect(res.status).toBe(200);
  });
});
```

```bash
# Install
npm install -D miniflare vitest

# Run tests
vitest run
```

---

## Common Mistakes

```typescript
// WRONG: Node.js API in Edge Runtime
import { readFileSync } from 'fs';  // Not available

// CORRECT: Use fetch to load static assets
const data = await fetch(new URL('./data.json', import.meta.url)).then(r => r.json());

// WRONG: Large npm package (pulls in Node.js dependencies)
import moment from 'moment';  // Too large, Node.js APIs

// CORRECT: Web-compatible alternative
import { format } from 'date-fns/format';  // Pure JS, tree-shakeable

// WRONG: Synchronous heavy computation blocking isolate
export default {
  fetch(): Response {
    const result = heavySync(largeData);  // Hits CPU limit
    return Response.json(result);
  }
}

// CORRECT: Stream or offload to Durable Object / Queue
```

## Reference

- `edge-patterns` — runtime constraints, Cloudflare Workers (KV/D1/R2/Durable Objects), Vercel Edge Middleware, Deno Deploy
- `serverless-patterns` — cold starts, Step Functions, Lambda Powertools, idempotency
- `wasm-patterns` — run Rust WASM in Cloudflare Workers
