---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
---

# API Design Patterns

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- **Before writing any implementation** — design the contract first, code second
- Designing new API endpoints or changing existing ones
- Reviewing existing API contracts for consistency
- Adding pagination, filtering, or sorting — see skill `api-pagination-filtering`
- Implementing error handling for APIs
- Planning API versioning strategy
- Building public or partner-facing APIs

> For the full Contract-First workflow (spec writing, code generation, CI breaking-change detection, Pact): see skill `api-contract`.
> For API documentation production — platform choice (Mintlify, Docusaurus, Redoc, Scalar), OpenAPI descriptions/examples, interactive playground, changelog automation, Vale prose linting, and Divio structure: see skill `api-docs-patterns`.

## Contract-First Principle

**Write the OpenAPI spec before writing any implementation code.**

```plantuml
@startuml
:Write spec\napi/v1/openapi.yaml;
note right
  REST → OpenAPI 3.1
  Events → AsyncAPI 3.0
end note
:Lint spec\nspectral lint;
:Generate types / stubs\nfrom spec;
note right
  TS: openapi-typescript
  Go: oapi-codegen
  Java: openapi-generator
  Python: datamodel-codegen
end note
:Implement business logic only;
:Validate in CI\nschemathesis + oasdiff;
@enduml
```

The spec is the public contract. Consumers depend on it. Code is a private implementation detail.

- Never generate the spec from code (annotations, reflection) — it will drift
- Never write request/response types by hand — generate them from the spec
- Any breaking change requires a new API version (`/api/v2/`)

See skill `api-contract` for the complete toolchain and CI setup.

### Write descriptions and examples from the start

OpenAPI documentation is easiest to write while you are designing the spec — not after the implementation is shipped.

**Minimum documentation requirements per operation** (add these when you write each path, not later):

```yaml
paths:
  /orders:
    post:
      summary: Create an order        # ← one-line summary
      description: |                  # ← full description with scope, side effects, notes
        Places a new order for the authenticated customer.
        The order is created in `pending` status and transitions to
        `processing` once payment is confirmed (async, webhook fired).

        **Scopes required:** `orders:write`
      operationId: createOrder        # ← stable, unique identifier
      tags: [Orders]                  # ← logical grouping
      parameters: []                  # ← every param needs description + example
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
            example:                  # ← concrete, realistic example
              customer_id: "cust_abc123"
              items:
                - product_id: "prod_xyz"
                  quantity: 2
      responses:
        '201':
          description: Order created successfully.
          headers:
            Location:
              description: URL of the newly created order.
              schema: { type: string }
        '400':
          description: Request validation failed.
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/ProblemDetails' }
```

> See skill `api-docs-patterns` for the full documentation workflow: platform setup, interactive playground, code examples in all languages, changelog automation, and CI.

---

## Resource Design

### URL Structure

```
# Resources are nouns, plural, lowercase, kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Sub-resources for relationships
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# Actions that don't map to CRUD (use verbs sparingly)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

### Naming Rules

```
# GOOD
/api/v1/team-members          # kebab-case for multi-word resources
/api/v1/orders?status=active  # query params for filtering
/api/v1/users/123/orders      # nested resources for ownership

# BAD
/api/v1/getUsers              # verb in URL
/api/v1/user                  # singular (use plural)
/api/v1/team_members          # snake_case in URLs
/api/v1/users/123/getOrders   # verb in nested resource
```

## HTTP Methods and Status Codes

### Method Semantics

| Method | Idempotent | Safe | Use For |
|--------|-----------|------|---------|
| GET | Yes | Yes | Retrieve resources |
| POST | No | No | Create resources, trigger actions |
| PUT | Yes | No | Full replacement of a resource |
| PATCH | No* | No | Partial update of a resource |
| DELETE | Yes | No | Remove a resource |

*PATCH can be made idempotent with proper implementation

### Status Code Reference

```
# Success
200 OK                    — GET, PUT, PATCH (with response body)
201 Created               — POST (include Location header)
204 No Content            — DELETE, PUT (no response body)

# Client Errors
400 Bad Request           — Validation failure, malformed JSON
401 Unauthorized          — Missing or invalid authentication
403 Forbidden             — Authenticated but not authorized
404 Not Found             — Resource doesn't exist
409 Conflict              — Duplicate entry, state conflict
422 Unprocessable Entity  — Semantically invalid (valid JSON, bad data)
429 Too Many Requests     — Rate limit exceeded

# Server Errors
500 Internal Server Error — Unexpected failure (never expose details)
502 Bad Gateway           — Upstream service failed
503 Service Unavailable   — Temporary overload, include Retry-After
```

### Common Mistakes

```
# BAD: 200 for everything
{ "status": 200, "success": false, "error": "Not found" }

# GOOD: Use HTTP status codes semantically + RFC 7807 body
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "User abc-123 not found.",
  "instance": "/api/v1/users/abc-123"
}

# BAD: 500 for validation errors
# GOOD: 400 or 422 with field-level details (RFC 7807 errors extension)

# BAD: 200 for created resources
# GOOD: 201 with Location header
HTTP/1.1 201 Created
Location: /api/v1/users/abc-123
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "name": "Alice",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### Collection Response (with Pagination)

```json
{
  "data": [
    { "id": "abc-123", "name": "Alice" },
    { "id": "def-456", "name": "Bob" }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1&per_page=20",
    "next": "/api/v1/users?page=2&per_page=20",
    "last": "/api/v1/users?page=8&per_page=20"
  }
}
```

### Error Response — RFC 7807 / RFC 9457 Problem Details

All error responses MUST use `Content-Type: application/problem+json` and the standard fields:

```json
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields failed validation.",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "detail": "must be a valid email address" },
    { "field": "age",   "detail": "must be between 0 and 150" }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `type` | Recommended | URI identifying the problem type. `about:blank` if no docs exist yet. |
| `title` | Recommended | Stable, human-readable summary (don't interpolate dynamic data). |
| `status` | Yes | HTTP status code mirrored in the body. |
| `detail` | Optional | Occurrence-specific explanation for the client. |
| `instance` | Optional | URI of this specific occurrence (e.g., request path or ID). |
| `errors` | Extension | RFC 9457 array for multiple sub-problems (validation errors). |

See skill: `problem-details` for full specification and per-language implementation.

### Response Envelope Variants

```typescript
// Success responses: return the resource (or data wrapper for public APIs)
interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  links?: PaginationLinks;
}

// Error responses: always RFC 7807 ProblemDetails — never { success: false, error: "..." }
interface ProblemDetails {
  type: string;         // URI — link to docs
  title: string;        // Short, stable summary
  status: number;       // HTTP status mirrored
  detail?: string;      // Occurrence-specific detail
  instance?: string;    // URI of this occurrence
  [key: string]: unknown; // Extension fields
}
// Content-Type for errors: application/problem+json (NOT application/json)
```

> For pagination (offset/cursor), filtering, sorting, and sparse fieldsets — see skill `api-pagination-filtering`.

## Authentication and Authorization

### Token-Based Auth

```
# Bearer token in Authorization header
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API key (for server-to-server)
GET /api/v1/data
X-API-Key: sk_live_abc123
```

### Authorization Patterns

```typescript
// Resource-level: check ownership
app.get("/api/v1/orders/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: { code: "not_found" } });
  if (order.userId !== req.user.id) return res.status(403).json({ error: { code: "forbidden" } });
  return res.json({ data: order });
});

// Role-based: check permissions
app.delete("/api/v1/users/:id", requireRole("admin"), async (req, res) => {
  await User.delete(req.params.id);
  return res.status(204).send();
});
```

## Rate Limiting

### Headers

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

# When exceeded — RFC 7807 body
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60

{
  "type": "https://api.example.com/problems/too-many-requests",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

### Rate Limit Tiers

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| Anonymous | 30/min | Per IP | Public endpoints |
| Authenticated | 100/min | Per user | Standard API access |
| Premium | 1000/min | Per API key | Paid API plans |
| Internal | 10000/min | Per service | Service-to-service |

## Versioning

### URL Path Versioning (Recommended)

```
/api/v1/users
/api/v2/users
```

**Pros:** Explicit, easy to route, cacheable
**Cons:** URL changes between versions

### Header Versioning

```
GET /api/users
Accept: application/vnd.myapp.v2+json
```

**Pros:** Clean URLs
**Cons:** Harder to test, easy to forget

### Versioning Strategy

```
1. Start with /api/v1/ — don't version until you need to
2. Maintain at most 2 active versions (current + previous)
3. Deprecation timeline:
   - Announce deprecation (6 months notice for public APIs)
   - Add Sunset header: Sunset: Sat, 01 Jan 2026 00:00:00 GMT
   - Return 410 Gone after sunset date
4. Non-breaking changes don't need a new version:
   - Adding new fields to responses
   - Adding new optional query parameters
   - Adding new endpoints
5. Breaking changes require a new version:
   - Removing or renaming fields
   - Changing field types
   - Changing URL structure
   - Changing authentication method
```

## Implementation Patterns

### TypeScript (Next.js API Route)

```typescript
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const PROBLEM_CONTENT_TYPE = "application/problem+json";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({
      type: "https://api.example.com/problems/validation-failed",
      title: "Validation Failed",
      status: 422,
      detail: "One or more fields failed validation.",
      errors: parsed.error.issues.map(i => ({ field: i.path.join("."), detail: i.message })),
    }, { status: 422, headers: { "Content-Type": PROBLEM_CONTENT_TYPE } });
  }

  const user = await createUser(parsed.data);

  return NextResponse.json(
    { data: user },
    { status: 201, headers: { Location: `/api/v1/users/${user.id}` } },
  );
}
```

### Go (net/http)

```go
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeProblem(w, r, http.StatusBadRequest,
            "https://api.example.com/problems/bad-request", "Bad Request",
            "Invalid request body.")
        return
    }

    if err := req.Validate(); err != nil {
        writeProblem(w, r, http.StatusUnprocessableEntity,
            "https://api.example.com/problems/validation-failed", "Validation Failed",
            err.Error())
        return
    }

    user, err := h.service.Create(r.Context(), req)
    if err != nil {
        switch {
        case errors.Is(err, domain.ErrEmailTaken):
            writeProblem(w, r, http.StatusConflict,
                "https://api.example.com/problems/email-taken", "Email Taken",
                "This email is already registered.")
        default:
            writeProblem(w, r, http.StatusInternalServerError,
                "about:blank", "Internal Server Error", "")
        }
        return
    }

    w.Header().Set("Location", fmt.Sprintf("/api/v1/users/%s", user.ID))
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]any{"data": user})
}

// writeProblem writes an RFC 7807 Problem Details response.
func writeProblem(w http.ResponseWriter, r *http.Request, status int,
                  type_, title, detail string) {
    w.Header().Set("Content-Type", "application/problem+json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]any{
        "type": type_, "title": title, "status": status,
        "detail": detail, "instance": r.RequestURI,
    })
}
```

## Anti-Patterns

### Using 200 OK for Every Response

**Wrong:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{ "success": false, "error": "User not found" }
```

**Correct:**
```json
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "User abc-123 not found.",
  "instance": "/api/v1/users/abc-123"
}
```

**Why:** Returning 200 for errors forces clients to parse the body to detect failure, breaks HTTP caches and load balancers, and defeats the purpose of the status code system.

---

### Generating the OpenAPI Spec from Code Annotations

**Wrong:**
```typescript
// Spec is auto-generated from decorators at runtime — drifts silently
@ApiOperation({ summary: 'Create user' })
@Post('/users')
async createUser(@Body() dto: CreateUserDto) { ... }
```

**Correct:**
```yaml
# api/v1/openapi.yaml — written first, before any implementation
paths:
  /users:
    post:
      summary: Create a user
      operationId: createUser
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created successfully.
```

**Why:** Annotation-driven spec generation inverts the contract-first principle — the spec becomes a trailing artifact that drifts from what clients actually depend on.

---

### Putting Verbs in URLs

**Wrong:**
```
POST /api/v1/cancelOrder/42
GET  /api/v1/getUsers
PUT  /api/v1/updateUser/7
```

**Correct:**
```
POST   /api/v1/orders/42/cancel
GET    /api/v1/users
PUT    /api/v1/users/7
```

**Why:** URLs identify resources (nouns); HTTP methods express actions (verbs) — mixing both makes APIs unpredictable and breaks REST semantics for caching and idempotency.

---

### Returning 500 for Validation Errors

**Wrong:**
```json
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{ "error": "Invalid email format" }
```

**Correct:**
```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "errors": [
    { "field": "email", "detail": "must be a valid email address" }
  ]
}
```

**Why:** Validation errors are client mistakes (4xx), not server failures (5xx) — misusing 500 triggers false alerts, hides real server errors, and confuses API consumers.

---

### Breaking the API Contract Without a Version Bump

**Wrong:**
```yaml
# v1 response — field renamed in-place, silently breaking all clients
responses:
  '200':
    content:
      application/json:
        schema:
          properties:
            full_name: { type: string }  # was "name" — breaking change without /v2/
```

**Correct:**
```yaml
# /api/v1/ keeps "name" intact; /api/v2/ introduces "full_name"
# Deprecate v1 with Sunset header over a 6-month notice period
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
```

**Why:** Renaming, removing, or retyping fields in an existing version silently breaks all existing clients; any breaking change must be introduced under a new API version.

## API Design Checklist

Before shipping a new endpoint:

- [ ] Resource URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method used (GET for reads, POST for creates, etc.)
- [ ] Appropriate status codes returned (not 200 for everything)
- [ ] Input validated with schema (Zod, Pydantic, Bean Validation)
- [ ] Error responses use RFC 7807 Problem Details (`Content-Type: application/problem+json`, `type`/`title`/`status` fields)
- [ ] Pagination implemented for list endpoints (cursor or offset)
- [ ] Authentication required (or explicitly marked as public)
- [ ] Authorization checked (user can only access their own resources)
- [ ] Rate limiting configured
- [ ] Response does not leak internal details (stack traces, SQL errors)
- [ ] Consistent naming with existing endpoints (camelCase vs snake_case)
- [ ] OpenAPI spec written **before** implementation (`api/v1/openapi.yaml`)
- [ ] Spec linted (`spectral lint`) with zero errors
- [ ] Types/stubs generated from spec — not hand-written
- [ ] Breaking change detection configured in CI (`oasdiff`)
- [ ] Every operation has non-empty `description` (not just `summary`)
- [ ] Every parameter has `description` + realistic `example`
- [ ] Every schema property has `description` + `example`
- [ ] `x-codeSamples` added for curl + TypeScript + Python + Go
- [ ] `x-stability` set (stable / beta / experimental)
- [ ] CHANGELOG.md updated for new/changed/deprecated endpoints
