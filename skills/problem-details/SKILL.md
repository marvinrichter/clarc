---
name: problem-details
description: RFC 7807 / RFC 9457 Problem Details for HTTP APIs — standard error response format, Content-Type application/problem+json, extension fields, and per-language implementation patterns.
---

# Problem Details for HTTP APIs (RFC 7807 / RFC 9457)

## When to Use

Use this skill whenever you need to implement HTTP error responses. Apply it to every REST/HTTP API regardless of language or framework.

- Adding or reviewing error handling in any REST or HTTP API endpoint
- Replacing ad-hoc `{ "error": "..." }` JSON responses with the RFC 7807 standard format
- Implementing validation error aggregation using the RFC 9457 `errors` array extension
- Setting up a global error handler or middleware in Express, FastAPI, Spring Boot, or Go
- Ensuring the `Content-Type: application/problem+json` header is used consistently for all error responses

## Standard Fields

RFC 9457 defines these fields (all optional, `status` is strongly recommended):

| Field | Type | Description |
|---|---|---|
| `type` | URI string | Identifies the problem type. SHOULD be dereferenceable (docs page). Use `about:blank` when no specific type exists. |
| `title` | string | Short, human-readable summary. SHOULD NOT change between occurrences of the same type. |
| `status` | integer | HTTP status code — mirrors the response status for diagnostic convenience. |
| `detail` | string | Human-readable explanation specific to this occurrence. |
| `instance` | URI string | URI reference identifying this specific occurrence (e.g., a request ID path). |

RFC 9457 additions over RFC 7807:
- **`errors` array**: For responses that aggregate multiple sub-problems (e.g., validation errors).
- **Extension fields**: Any additional members are valid and SHOULD be documented in the problem type.

## Content-Type

```
Content-Type: application/problem+json
```

Never use `application/json` for error responses. The problem content type signals that consumers should parse the RFC 7807 fields.

## Minimal Example

```json
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-market-name",
  "title": "Invalid market name",
  "status": 422,
  "detail": "Market name must not be blank.",
  "instance": "/requests/7a8f3c12"
}
```

## Validation Error Example (RFC 9457 `errors` array)

```json
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields failed validation.",
  "instance": "/requests/abc123",
  "errors": [
    { "field": "name", "detail": "must not be blank" },
    { "field": "slug", "detail": "must match ^[a-z0-9-]+$" }
  ]
}
```

## HTTP Status → Problem Type Mapping

| Status | Typical `type` suffix | `title` |
|---|---|---|
| 400 | `/problems/bad-request` or `/problems/validation-failed` | "Bad Request" / "Validation Failed" |
| 401 | `/problems/unauthorized` | "Unauthorized" |
| 403 | `/problems/forbidden` | "Forbidden" |
| 404 | `/problems/not-found` | "Not Found" |
| 409 | `/problems/conflict` | "Conflict" |
| 422 | `/problems/unprocessable-content` | "Unprocessable Content" |
| 429 | `/problems/too-many-requests` | "Too Many Requests" |
| 500 | `/problems/internal-server-error` | "Internal Server Error" |

Use `about:blank` as `type` when no problem-type documentation exists yet — the `title` then SHOULD match the HTTP status phrase.

---

## Implementation by Language

### Spring Boot 4 (Java/Kotlin)

Spring Boot 4.x has native RFC 7807 support — no custom classes needed.

**Enable in `application.yml`:**
```yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

**Custom exception mapping:**
```java
@RestControllerAdvice
public class ProblemDetailsAdvice {

    @ExceptionHandler(MarketNotFoundException.class)
    ProblemDetail handleNotFound(MarketNotFoundException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setType(URI.create("https://api.example.com/problems/not-found"));
        pd.setTitle("Not Found");
        pd.setProperty("instance", req.getRequestURI());
        return pd;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail handleValidation(ConstraintViolationException ex) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        pd.setType(URI.create("https://api.example.com/problems/validation-failed"));
        pd.setTitle("Validation Failed");
        pd.setDetail("One or more fields failed validation.");
        pd.setProperty("errors", ex.getConstraintViolations().stream()
            .map(v -> Map.of("field", v.getPropertyPath().toString(), "detail", v.getMessage()))
            .toList());
        return pd;
    }
}
```

`spring.mvc.problemdetails.enabled=true` automatically maps Spring's built-in exceptions (e.g., `MethodArgumentNotValidException`, `NoResourceFoundException`) to `ProblemDetail`.

---

### TypeScript (Express + Zod)

```typescript
// src/adapter/in/http/problem.ts
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown; // extension fields
}

export function sendProblem(
  res: Response,
  status: number,
  type: string,
  title: string,
  detail?: string,
  extensions?: Record<string, unknown>,
): void {
  const body: ProblemDetails = {
    type,
    title,
    status,
    ...(detail && { detail }),
    ...(extensions ?? {}),
  };
  res.status(status).contentType("application/problem+json").json(body);
}

// Global error handler — register LAST in Express
export function problemDetailsMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    return sendProblem(res, 400,
      "https://api.example.com/problems/validation-failed",
      "Validation Failed",
      "One or more fields failed validation.",
      { errors: err.errors.map(e => ({ field: e.path.join("."), detail: e.message })) },
    );
  }
  if (err instanceof MarketNotFoundError) {
    return sendProblem(res, 404,
      "https://api.example.com/problems/not-found",
      "Not Found",
      err.message,
    );
  }
  // fallback
  sendProblem(res, 500,
    "about:blank",
    "Internal Server Error",
    "An unexpected error occurred.",
  );
}
```

---

### Go (net/http)

```go
// internal/handler/problem.go
package handler

import (
    "encoding/json"
    "net/http"
)

type ProblemDetails struct {
    Type     string `json:"type"`
    Title    string `json:"title"`
    Status   int    `json:"status"`
    Detail   string `json:"detail,omitempty"`
    Instance string `json:"instance,omitempty"`
}

func writeProblem(w http.ResponseWriter, r *http.Request, status int, problemType, title, detail string) {
    p := ProblemDetails{
        Type:     problemType,
        Title:    title,
        Status:   status,
        Detail:   detail,
        Instance: r.RequestURI,
    }
    w.Header().Set("Content-Type", "application/problem+json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(p)
}

// Usage in handler:
func (h *MarketHandler) GetMarket(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    market, err := h.useCase.GetMarket(r.Context(), id)
    if errors.Is(err, domain.ErrNotFound) {
        writeProblem(w, r, http.StatusNotFound,
            "https://api.example.com/problems/not-found",
            "Not Found",
            fmt.Sprintf("market %q not found", id),
        )
        return
    }
    if err != nil {
        writeProblem(w, r, http.StatusInternalServerError,
            "about:blank", "Internal Server Error", "")
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(market)
}
```

---

### Python (FastAPI)

```python
# app/adapter/in_/http/problem.py
from fastapi import Request
from fastapi.responses import JSONResponse


def problem_response(
    status: int,
    type_: str,
    title: str,
    detail: str | None = None,
    instance: str | None = None,
    **extensions,
) -> JSONResponse:
    body = {
        "type": type_,
        "title": title,
        "status": status,
        **({"detail": detail} if detail else {}),
        **({"instance": instance} if instance else {}),
        **extensions,
    }
    return JSONResponse(content=body, status_code=status,
                        headers={"Content-Type": "application/problem+json"})


# Register on app startup:
def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(MarketNotFoundError)
    async def handle_not_found(request: Request, exc: MarketNotFoundError) -> JSONResponse:
        return problem_response(
            404,
            "https://api.example.com/problems/not-found",
            "Not Found",
            str(exc),
            instance=str(request.url),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        return problem_response(
            400,
            "https://api.example.com/problems/validation-failed",
            "Validation Failed",
            "One or more fields failed validation.",
            instance=str(request.url),
            errors=[{"field": ".".join(str(l) for l in e["loc"]), "detail": e["msg"]}
                    for e in exc.errors()],
        )

    @app.exception_handler(Exception)
    async def handle_generic(request: Request, exc: Exception) -> JSONResponse:
        return problem_response(500, "about:blank", "Internal Server Error")
```

---

### Swift (Vapor)

```swift
// Sources/App/Middleware/ProblemDetailsMiddleware.swift
import Vapor

struct ProblemDetails: Content {
    var type: String
    var title: String
    var status: Int
    var detail: String?
    var instance: String?
}

struct ProblemDetailsMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        do {
            return try await next.respond(to: request)
        } catch let error as MarketError {
            let (status, type_, title, detail) = error.problemDetails
            var headers = HTTPHeaders()
            headers.contentType = HTTPMediaType(type: "application", subType: "problem+json")
            let body = ProblemDetails(type: type_, title: title, status: status.code,
                                      detail: detail, instance: request.url.string)
            let res = Response(status: status, headers: headers)
            try res.content.encode(body)
            return res
        }
    }
}

extension MarketError {
    var problemDetails: (HTTPStatus, String, String, String) {
        switch self {
        case .invalidName:
            return (.unprocessableContent,
                    "https://api.example.com/problems/invalid-market-name",
                    "Invalid Market Name",
                    "Market name must not be blank.")
        case .alreadyPublished(let slug):
            return (.conflict,
                    "https://api.example.com/problems/already-published",
                    "Already Published",
                    "Market \(slug) is already published.")
        }
    }
}
```

---

## Design Rules

1. **Always use `application/problem+json`** — never `application/json` for errors.
2. **`type` SHOULD be a URI** — link to documentation. Use `about:blank` only as a last resort.
3. **`title` is stable** — same problem type → same title. Don't interpolate dynamic data into `title`; use `detail` instead.
4. **`status` mirrors HTTP status** — include it in the body for diagnostic convenience (client logs often lose the status line).
5. **Extend freely** — `errors` array for validation, `traceId` for distributed tracing, `retryAfter` for rate limiting.
6. **Don't leak internals** — `detail` is for users/clients, not stack traces. Log stack traces server-side only.
