---
name: sdk-design-patterns
description: "SDK design patterns — API ergonomics, backward compatibility (semantic versioning, deprecation), multi-language SDK generation (openapi-generator vs Speakeasy), error hierarchy design, SDK testing strategies, and documentation as first-class SDK artifact."
---
# Skill: SDK Design Patterns

## When to Activate

- Designing a client library for a REST, gRPC, or WebSocket API
- Evaluating whether to generate an SDK from OpenAPI or write it manually
- Reviewing an existing SDK for ergonomics, consistency, or backward compatibility
- Planning a multi-language SDK strategy
- Setting up automated SDK publishing from CI
- Designing error hierarchies for a developer-facing library
- Writing documentation for public APIs

---

## Core SDK Design Principles

### 1. Progressive Disclosure

The simplest use case must be accomplishable in 3 lines. Full control must still be possible.

```python
# Level 1 — 3 lines for the happy path
from acmecorp import Client
client = Client(api_key="sk-...")
result = client.users.create(email="user@example.com")

# Level 2 — override defaults when needed
result = client.users.create(
    email="user@example.com",
    role="admin",
    send_welcome_email=False,
)

# Level 3 — full control (raw HTTP, custom retry, custom headers)
result = client.users.create(
    email="user@example.com",
    request_options=RequestOptions(
        timeout_ms=5000,
        max_retries=1,
        additional_headers={"X-Idempotency-Key": "idem-123"},
    ),
)
```

### 2. Pit of Success

The default path must be the safe, correct path. Safe defaults are on; users opt out only when they have a reason.

```typescript
// GOOD: retries=3, timeout=30s, SSL on by default — users only set what differs
const client = new AcmeClient({ apiKey: process.env.ACME_API_KEY });
```

### 3. Discoverability — IDE is the Primary UI

Users discover SDK capabilities through autocomplete. Design types and method signatures accordingly.

```typescript
// BAD: stringly-typed — no autocomplete, easy to mistype
client.events.create("user.signup", { userId: "usr_123" });

// GOOD: typed enum — autocomplete shows valid events, typos caught at compile time
client.events.create(EventType.UserSignup, { userId: "usr_123" });

// GOOD: discriminated union — IDE shows exactly what each event type requires
type Event =
  | { type: "user.signup"; userId: string; email: string }
  | { type: "order.completed"; orderId: string; amount: number };
```

### 4. Consistency

Same concept, same name, same behavior — everywhere in the SDK.

```python
# GOOD: consistent resource.verb pattern + unified pagination
client.users.list(limit=20)   # → Page(items=[...], has_more=bool, next_cursor=str|None)
client.orders.list(limit=20)  # same shape — not client.get_orders() or client.fetch_orders()
```

### 5. Minimal Surface Area

Fewer, more powerful primitives beat many specialized methods.

```python
# BAD: method explosion
client.users.create_admin()
client.users.create_viewer()
client.users.create_with_custom_role()
client.users.create_and_send_invite()

# GOOD: single method with options
client.users.create(email=..., role="admin", send_invite=True)
```

---

## API Ergonomics

### Named Parameters and Builder Pattern

Use keyword args for complex operations (self-documenting). Use Builder in Java; object options in TypeScript/Python.

```python
# GOOD: keyword args — self-documenting
client.send_email(to="user@example.com", subject="Welcome!", track_opens=True, retry_count=3)

# GOOD: sane defaults — users override only what they need
class AcmeClient:
    def __init__(self, api_key: str, base_url="https://api.acmecorp.com",
                 timeout=30.0, max_retries=3, http_client=None): ...
```

```java
// Java — Builder for complex configuration
AcmeClient client = AcmeClient.builder()
    .apiKey(System.getenv("ACME_API_KEY"))
    .timeout(Duration.ofSeconds(30))
    .retryPolicy(RetryPolicy.exponentialBackoff(maxAttempts=3))
    .build();
```

### Fluent Interface for Queries

```python
users = (
    client.users
    .where(status="active").where(role="admin")
    .order_by("created_at", direction="desc")
    .limit(50).execute()
)
```

---

## Backward Compatibility

### Semantic Versioning Policy

| Change | Version Bump | Examples |
|--------|-------------|---------|
| Remove a method or field | MAJOR | `client.users.get()` → removed |
| Rename a method or field | MAJOR | `create_user()` → `create()` |
| Change a required param to required | MAJOR | New required field |
| Add a new method | MINOR | `client.users.bulk_create()` |
| Add an optional param | MINOR | New optional kwarg with default |
| Bug fix | PATCH | Wrong status code returned |
| Add a new optional field to response | MINOR | New JSON field (clients ignore unknown) |

### Deprecation Workflow

```python
import warnings
import functools

def deprecated(replacement: str, removed_in: str):
    """Decorator to mark a function as deprecated with migration guidance."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            warnings.warn(
                f"{func.__name__} is deprecated and will be removed in v{removed_in}. "
                f"Use {replacement} instead. "
                f"Migration guide: https://docs.acmecorp.com/migration/v{removed_in}",
                DeprecationWarning,
                stacklevel=2,
            )
            return func(*args, **kwargs)
        return wrapper
    return decorator

class UsersResource:
    @deprecated(replacement="users.list()", removed_in="3.0")
    def get_all_users(self, **kwargs):
        """Deprecated: use users.list() instead."""
        return self.list(**kwargs)

    def list(self, limit=20, cursor=None):
        """Current method."""
        ...
```

```typescript
/** @deprecated Use `users.list()` instead. Will be removed in v3.0.
 * @see https://docs.acmecorp.com/migration/v3
 */
async getAllUsers(options?: ListOptions): Promise<Page<User>> {
  console.warn("getAllUsers() is deprecated. Use users.list() instead.");
  return this.list(options);
}
```

### Breaking Change Detection

```bash
# TypeScript: api-extractor detects breaking API surface changes
npx @microsoft/api-extractor run --local

# Go: gorelease detects breaking changes vs. previous tag
go run golang.org/x/exp/cmd/gorelease@latest

# Java: revapi
mvn revapi:check

# Automate in CI — fail PR if breaking change is undocumented
# .github/workflows/api-compat.yml:
# - run: npx @microsoft/api-extractor run
#   if: breaking changes found → require MAJOR version bump or explicit override
```

---

## Multi-Language SDK Generation

### openapi-generator vs Speakeasy

| Tool | Best for | DX quality |
|------|----------|-----------|
| `openapi-generator-cli` | Open-source, broad language support | Functional but raw |
| Speakeasy / Stainless | Production-quality SDKs with better ergonomics | High |

```bash
# openapi-generator — TypeScript, Python, Go from one spec
npx openapi-generator-cli generate -i openapi/v1/openapi.yaml \
  -g typescript-axios -o sdks/typescript \
  --additional-properties=npmName=@acmecorp/sdk,npmVersion=2.1.0,supportsES6=true

# Speakeasy — generate all languages at once
speakeasy generate sdk --schema openapi/v1/openapi.yaml --lang typescript,python,go
```

```yaml
# .speakeasy/gen.yaml
generation:
  baseServerUrl: https://api.acmecorp.com
  sdkClassName: AcmeCorpSDK
languages:
  typescript: { version: 2.1.0, packageName: "@acmecorp/sdk" }
  python:     { version: 2.1.0, packageName: acmecorp }
  go:         { version: 2.1.0, packageName: acmecorp }
```

### SDK Monorepo Structure

```
sdk-monorepo/
├── openapi/v1/openapi.yaml        # Single source of truth
├── sdks/
│   ├── typescript/                # @acmecorp/sdk (npm)
│   ├── python/                    # acmecorp (PyPI)
│   └── go/                        # github.com/acmecorp/sdk-go
└── .github/workflows/
    ├── generate-sdks.yml          # On spec change: regenerate + PR
    └── publish-sdks.yml           # On tag: publish to registries
```

---

## Error Design

### Typed Error Hierarchy

Map HTTP status codes to specific error types. Users catch exact errors; IDEs show typed properties.

```python
# Python hierarchy: AcmeCorpError → APIError → specific subclasses
class AcmeCorpError(Exception):
    def __init__(self, message: str, request_id: str | None = None):
        super().__init__(message); self.request_id = request_id

class APIError(AcmeCorpError):
    def __init__(self, message: str, status_code: int, **kwargs):
        super().__init__(message, **kwargs); self.status_code = status_code

class AuthenticationError(APIError):   # 401
    def __init__(self, **kwargs): super().__init__("Invalid API key.", status_code=401, **kwargs)
class PermissionDeniedError(APIError): pass  # 403
class NotFoundError(APIError):         pass  # 404
class ValidationError(APIError):             # 422 — carries field errors list
    def __init__(self, message, errors, **kwargs):
        super().__init__(message, status_code=422, **kwargs); self.errors = errors
class RateLimitError(APIError):              # 429 — carries retry_after seconds
    def __init__(self, message, retry_after, **kwargs):
        super().__init__(message, status_code=429, **kwargs); self.retry_after = retry_after
class InternalServerError(APIError): pass   # 5xx — safe to retry
```

```typescript
// TypeScript — same hierarchy, fully typed
export class AcmeCorpError extends Error {
  constructor(message: string, public readonly requestId?: string) {
    super(message); this.name = this.constructor.name;
  }
}
export class RateLimitError extends AcmeCorpError {
  constructor(message: string, public readonly retryAfter: number, requestId?: string) {
    super(message, requestId);
  }
}
// Usage — catch specific types, access typed properties
try {
  await client.users.create({ email });
} catch (e) {
  if (e instanceof RateLimitError) await sleep(e.retryAfter * 1000);
  else if (e instanceof ValidationError) console.error(e.errors);
  else throw e;
}
```

### Error Response Parsing (RFC 7807)

```python
def _parse_error(response: httpx.Response) -> APIError:
    try:
        body = response.json()
        message = body.get("detail", body.get("title", "Unknown error"))
        request_id = response.headers.get("X-Request-ID")
    except Exception:
        message = response.text or f"HTTP {response.status_code}"; request_id = None
    kw = {"request_id": request_id}
    match response.status_code:
        case 401: return AuthenticationError(**kw)
        case 422: return ValidationError(message, errors=body.get("errors", []), **kw)
        case 429: return RateLimitError(message,
            retry_after=int(response.headers.get("Retry-After", 60)), **kw)
        case s if s >= 500: return InternalServerError(message, status_code=s, **kw)
        case _:   return APIError(message, status_code=response.status_code, **kw)
```

---

## SDK Testing

### VCR / HTTP Recording

Record real HTTP interactions once, replay in tests — no mock drift, no network dependency.

```python
@pytest.mark.vcr  # records on first run, replays thereafter
def test_create_user(client):
    user = client.users.create(email="test@example.com")
    assert user.id.startswith("usr_")
```

```typescript
// TypeScript — nock replays recorded fixtures
nock("https://api.acmecorp.com").post("/v1/users")
  .reply(201, loadFixture("create_user_success.json"));
test("creates a user", async () => {
  const user = await client.users.create({ email: "test@example.com" });
  expect(user.id).toMatch(/^usr_/);
});
```

### Language Matrix + Smoke Tests

```yaml
# Test across all supported runtime versions
strategy:
  matrix:
    include:
      - { lang: typescript, node: "20" }
      - { lang: python,     python: "3.11" }
      - { lang: go,         go: "1.22" }
```

After publishing, smoke-test the actual artifact (not just source):

```bash
# TypeScript: pack + install in a fresh project
npm pack && npm install /path/to/acmecorp-sdk-2.1.0.tgz
node -e "const { AcmeCorpSDK } = require('@acmecorp/sdk'); console.log('OK')"

# Python: build wheel + install in fresh venv
python -m build && pip install dist/*.whl
python -c "import acmecorp; print('OK', acmecorp.__version__)"
```

### Contract Testing Against Staging

```python
from schemathesis import from_path
schema = from_path("openapi/v1/openapi.yaml", base_url="https://api-staging.acmecorp.com")

@schema.parametrize()
def test_api_contract(case):
    response = case.call_and_validate()  # validates request AND response against spec
    assert response.status_code != 500
```

---

## Documentation as Part of the SDK

### Docstrings with Examples

```python
def create(self, email: str, name: str | None = None, role: str = "member") -> User:
    """
    Create a new user.

    Args:
        email: The user's email address. Must be unique within your organization.
        name: The user's display name. Defaults to the part before @ in the email.
        role: Access level. One of: "admin", "member", "viewer". Defaults to "member".

    Returns:
        User: The newly created user object.

    Raises:
        ValidationError: If email format is invalid or email already exists.
        AuthenticationError: If the API key is invalid.
        RateLimitError: If the rate limit is exceeded (see `error.retry_after`).

    Example:
        >>> user = client.users.create(email="alice@example.com", role="admin")
        >>> print(user.id)
        usr_01HX4KQVNR3ZGK4FMJQB7T8C2
    """
```

### Changelog (Keep a Changelog Format)

```markdown
# Changelog

## [2.1.0] - 2026-03-08

### Added
- `client.users.bulk_create()` for creating up to 100 users in one API call
- `RateLimitError.retry_after` — seconds until retry is safe

### Deprecated
- `client.users.get_all_users()` — use `client.users.list()` instead. Removed in v3.0.
```

---

## Automated Release from CI

```yaml
# .github/workflows/publish-sdks.yml
on:
  push:
    tags:
      - "v*"   # trigger on any version tag

jobs:
  publish-typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", registry-url: "https://registry.npmjs.org" }
      - run: cd sdks/typescript && npm ci && npm run build && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: cd sdks/python && pip install build twine && python -m build
      - run: twine upload dist/*
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

---

## Related Skills

- `api-contract` — OpenAPI spec authoring before SDK generation
- `api-design` — REST API design principles (resource naming, pagination, errors)
- `problem-details` — RFC 7807 error format for SDK error parsing
- `contract-testing` — Pact and OpenAPI contract tests for SDK validation
- `release-management` — semantic versioning and changelog automation
