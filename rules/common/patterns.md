# Common Patterns

## Skeleton Projects

When implementing new functionality:
1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:
- Define standard operations: findAll, findById, create, update, delete
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

### API Response Format

Use different shapes for success and error responses:

**Success responses** — envelope pattern:
```
{ "data": <payload>, "meta": { "total": N, "page": N, "limit": N } }
```
- `data` contains the payload (object or array)
- `meta` is included for paginated responses (total, page, limit)
- No `success` flag needed — HTTP status code communicates success

**Error responses** — RFC 7807 Problem Details (`Content-Type: application/problem+json`):
```
{ "type": "https://...", "title": "Validation Error", "status": 422, "detail": "...", "instance": "/api/v1/users/123" }
```
- Use `application/problem+json` content type, not `application/json`
- Clients can switch on `type` without string-matching `message` fields
- `detail` is human-readable; `type` URI is machine-readable

> **Why separate shapes?** Enveloping errors in `{ success: false, error: "..." }` makes client error handling fragile (string matching). RFC 7807 gives errors a stable, typed contract. See `skills/api-design` for implementation examples.

## Legacy Migration Patterns

When modifying or replacing existing systems, use these patterns to avoid big-bang rewrites:

### Strangler Fig

Gradually replace a legacy system by routing traffic through a proxy. New capability is implemented fresh; legacy handles everything else. Migrate incrementally until the legacy system is completely replaced and deleted.

```
Phase 1: All traffic → Legacy (proxy installed but transparent)
Phase 2: New feature → New System | Everything else → Legacy
Phase 3: Shadow mode — run both, compare, serve legacy
Phase 4: Canary — 5% → 10% → 50% → 100% to new
Phase 5: Delete legacy code (do not leave it around)
```

**When to use:** Component accessed via HTTP/API and can be proxied.

### Branch-by-Abstraction

Extract an interface for the component to replace. Put both old and new implementations behind it. Toggle via feature flag. Delete the old implementation.

```
1. Extract interface from legacy class
2. Wrap legacy behind interface (zero behavior change)
3. Implement new version behind same interface
4. Feature flag: route % of callers to new implementation
5. Delete legacy implementation + feature flag
```

**When to use:** Component is a class/library called directly (not via HTTP).

### Anti-Corruption Layer (ACL)

Adapter that translates between legacy and new domain concepts — prevents the new system from inheriting legacy naming, structures, or broken models.

**When to use:** Legacy and new systems have different domain concepts (e.g., "Client" vs. "Customer").

See `skills/legacy-modernization` for complete implementation examples and database migration strategy.
