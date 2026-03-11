---
name: api-design-advanced
description: Advanced API design — per-language implementation patterns (TypeScript/Next.js, Go/net-http), anti-patterns (200 for everything, 500 for validation, contract breaking), and full pre-ship checklist.
---

# API Design — Advanced Patterns

This skill extends `api-design` with implementation patterns and anti-patterns. Load `api-design` first.

## When to Activate

- Implementing API handlers in TypeScript (Next.js) or Go
- Reviewing code for common API anti-patterns
- Applying the full pre-ship checklist to a new endpoint

---

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

---

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

---

## API Design Checklist

Before shipping a new endpoint:

- [ ] Resource URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method used (GET for reads, POST for creates, etc.)
- [ ] Appropriate status codes returned (not 200 for everything)
- [ ] Input validated with schema (Zod, Pydantic, Bean Validation)
- [ ] Error responses use RFC 7807 Problem Details (`Content-Type: application/problem+json`)
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

## Reference

- `api-design` — core REST patterns (resource naming, status codes, response format, auth, rate limiting, versioning)
- `api-contract` — Contract-First workflow (OpenAPI spec, code generation, CI breaking-change detection)
