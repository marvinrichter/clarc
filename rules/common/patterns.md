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
