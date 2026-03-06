---
name: caching-patterns
description: "Caching strategy patterns: Cache-Aside, Write-Through, Write-Behind, TTL design, cache invalidation, Redis patterns, CDN caching, HTTP cache headers, and cache stampede prevention. Caching is both a performance and correctness problem."
---

# Caching Patterns Skill

## When to Activate

- Database queries are slow or overloaded
- External API calls need to be rate-limited or throttled
- High read:write ratio on any data
- Static or semi-static content being served dynamically
- Setting up CDN or HTTP caching headers
- Cache invalidation bugs causing stale data

---

## Pattern Selection

```
Read-heavy, simple data?         → Cache-Aside (Lazy Loading)
Write-heavy, consistency needed? → Write-Through
High write volume, async OK?     → Write-Behind (Write-Back)
Immutable or rarely changes?     → Cache forever, invalidate on change
Complex aggregation?             → Computed cache with explicit invalidation
```

---

## Pattern 1: Cache-Aside (Lazy Loading)

The most common pattern. Application manages the cache explicitly.

```typescript
// Redis Cache-Aside
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — fetch from DB
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new NotFoundError(`User ${userId} not found`);

  // 3. Store in cache with TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(user)); // 1 hour TTL

  return user;
}

// Invalidation: call after any write
async function invalidateUser(userId: string) {
  await redis.del(`user:${userId}`);
}
```

**Pros:** Simple, only caches what's actually read, tolerates cold starts
**Cons:** Cache miss on first read (thundering herd risk), data can be stale up to TTL

---

## Pattern 2: Write-Through

Cache and DB updated together on every write. Strong consistency.

```typescript
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // 1. Write to DB
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning();

  // 2. Update cache immediately (same transaction context)
  const cacheKey = `user:${userId}`;
  await redis.setex(cacheKey, 3600, JSON.stringify(updated));

  return updated;
}
```

**Pros:** Cache always consistent with DB
**Cons:** Every write hits both DB and cache (higher write latency), cache polluted with rarely-read data

---

## Pattern 3: Write-Behind (Write-Back)

Write to cache immediately, persist to DB asynchronously. Highest write throughput.

```typescript
// Write immediately to cache, queue DB write
async function incrementCounter(key: string, amount = 1) {
  // Atomic increment in Redis (no read-modify-write race)
  const newValue = await redis.incrby(`counter:${key}`, amount);

  // Queue DB persistence (non-blocking)
  await queue.add('persist-counter', { key, value: newValue }, {
    delay: 5000,      // Batch writes: persist after 5s of no activity
    jobId: `counter:${key}`,  // Deduplication: only 1 job per key
    removeOnComplete: true,
  });

  return newValue;
}

// Worker: flushes to DB
queue.process('persist-counter', async (job) => {
  const { key, value } = job.data;
  await db.update(counters).set({ value }).where(eq(counters.key, key));
});
```

**Pros:** Extremely fast writes, batches DB load
**Cons:** Data loss risk if cache fails before persistence, complex failure handling

---

## Cache Invalidation Strategies

```typescript
// Strategy 1: TTL-based (simplest, eventual consistency)
await redis.setex(key, ttlSeconds, value);

// Strategy 2: Event-based invalidation (strongest consistency)
// After any mutation, broadcast invalidation event
async function invalidateOnWrite(entity: string, id: string) {
  const patterns = [
    `${entity}:${id}`,           // Single item
    `${entity}:list:*`,          // All list caches for this type
    `user:${userId}:${entity}s`, // Derived caches
  ];
  await Promise.all(patterns.map(p => redis.del(p)));
}

// Strategy 3: Cache versioning (avoids stampede on deploy)
const CACHE_VERSION = process.env.DEPLOY_SHA?.slice(0, 8) ?? 'v1';
function cacheKey(key: string) {
  return `${CACHE_VERSION}:${key}`;
}
// Old version keys expire naturally; no explicit invalidation needed
```

---

## Cache Stampede Prevention

When a popular cache entry expires, thousands of concurrent requests hit the DB simultaneously.

```typescript
// Solution: Probabilistic Early Recomputation (PER)
// Recompute slightly before TTL expires to avoid thundering herd
async function getWithPER<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
  beta = 1.0   // higher = more eager recomputation
): Promise<T> {
  const raw = await redis.get(key);
  if (raw) {
    const { value, expiry } = JSON.parse(raw);
    const remainingTtl = expiry - Date.now() / 1000;
    // Recompute early with probability proportional to staleness
    if (remainingTtl > 0 && -beta * Math.log(Math.random()) < remainingTtl) {
      return value;
    }
  }

  const value = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify({
    value,
    expiry: Date.now() / 1000 + ttl,
  }));
  return value;
}

// Solution 2: Lock (simpler but blocks)
async function getWithLock<T>(
  key: string,
  lockKey: string,
  fetchFn: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Acquire lock — only 1 process fetches
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  if (!acquired) {
    // Another process is fetching — poll briefly
    await new Promise(r => setTimeout(r, 100));
    return getWithLock(key, lockKey, fetchFn, ttl);
  }

  try {
    const value = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(value));
    return value;
  } finally {
    await redis.del(lockKey);
  }
}
```

---

## HTTP Cache Headers

```typescript
// Express middleware for HTTP caching
function cacheControl(opts: {
  maxAge?: number;      // Browser cache (seconds)
  sMaxAge?: number;     // CDN cache (seconds)
  staleWhileRevalidate?: number;
  noStore?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (opts.noStore) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      const directives = [
        'public',
        opts.maxAge !== undefined && `max-age=${opts.maxAge}`,
        opts.sMaxAge !== undefined && `s-maxage=${opts.sMaxAge}`,
        opts.staleWhileRevalidate !== undefined &&
          `stale-while-revalidate=${opts.staleWhileRevalidate}`,
      ].filter(Boolean);
      res.setHeader('Cache-Control', directives.join(', '));
    }
    next();
  };
}

// Usage
app.get('/api/v1/products', cacheControl({ maxAge: 60, sMaxAge: 3600 }), handler);
app.get('/api/v1/users/me', cacheControl({ noStore: true }), handler);
// Static assets: cache for 1 year (content-addressable filenames)
app.use('/assets', cacheControl({ maxAge: 31536000, sMaxAge: 31536000 }), express.static('dist'));
```

---

## TTL Design Guide

| Data type | Recommended TTL | Reason |
|-----------|----------------|--------|
| User session | 15-30 min (sliding) | Security |
| User profile | 5-60 min | Rarely changes |
| Product catalog | 1-24 hours | Business-controlled updates |
| Search results | 5-15 min | Freshness vs. cost |
| Computed aggregates | 1-5 min | High compute cost |
| Static config | Until deploy | Version-invalidate on deploy |
| Rate limit counters | Match window (60s) | Functional requirement |
| Auth tokens | Token expiry | Must match exactly |

---

## Checklist

- [ ] Cache key includes all dimensions that affect the result (user, locale, version)
- [ ] TTL set on every key — no keys without expiry
- [ ] Cache invalidation implemented alongside every write path
- [ ] Stampede prevention for high-traffic keys (PER or lock)
- [ ] No sensitive PII or secrets stored in shared cache
- [ ] `Cache-Control: no-store` on all authenticated/personal endpoints
- [ ] CDN cache headers set on public static content
- [ ] Cache hit/miss ratio monitored via metrics
- [ ] Graceful degradation: app works if cache is down (circuit breaker)
