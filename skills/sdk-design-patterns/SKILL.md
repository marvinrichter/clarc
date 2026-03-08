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

The default path must be the safe, correct path. Users should have to work harder to do the wrong thing.

```typescript
// BAD: unsafe by default — user must opt in to safe behavior
const client = new AcmeClient({ validateSSL: false, retryOnFailure: false });

// GOOD: safe defaults — users opt out of them only when they have a reason
const client = new AcmeClient({
  apiKey: process.env.ACME_API_KEY,
  // retries: 3 (default)
  // timeout: 30_000 (default)
  // baseURL: "https://api.acmecorp.com" (default)
});
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
# BAD: inconsistent naming
client.users.list()        # lists users
client.get_orders()        # lists orders — different pattern
client.fetch_products()    # lists products — yet another pattern

# GOOD: consistent resource.verb pattern
client.users.list()
client.orders.list()
client.products.list()

# BAD: inconsistent pagination
users = client.users.list(page=1, page_size=20)    # page-based
orders = client.orders.list(cursor=None, limit=20)  # cursor-based

# GOOD: unified pagination interface
users = client.users.list(limit=20)
orders = client.orders.list(limit=20)
# Both return: Page(items=[...], has_more=bool, next_cursor=str | None)
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

### Named Parameters for Complex Operations

```python
# BAD: positional args — what does True mean here?
client.send_email("user@example.com", "Welcome!", True, False, 3)

# GOOD: keyword args — self-documenting
client.send_email(
    to="user@example.com",
    subject="Welcome!",
    track_opens=True,
    track_clicks=False,
    retry_count=3,
)
```

### Builder Pattern for Complex Configuration

```java
// Java — Builder for complex object construction
AcmeClient client = AcmeClient.builder()
    .apiKey(System.getenv("ACME_API_KEY"))
    .baseUrl("https://api.acmecorp.com")
    .timeout(Duration.ofSeconds(30))
    .retryPolicy(RetryPolicy.exponentialBackoff(maxAttempts=3))
    .httpClient(customHttpClient)    // optional injection
    .build();
```

```typescript
// TypeScript — object options pattern (simpler than Builder for TS)
const client = new AcmeClient({
  apiKey: process.env.ACME_API_KEY!,
  timeout: 30_000,
  retries: 3,
  baseURL: "https://api.acmecorp.com",
});
```

### Fluent Interface for Queries

```python
# Fluent query building — readable, chainable
users = (
    client.users
    .where(status="active")
    .where(role="admin")
    .order_by("created_at", direction="desc")
    .limit(50)
    .execute()
)
```

### Sane Defaults — Users Override Only What They Need

```python
class AcmeClient:
    def __init__(
        self,
        api_key: str,                          # required — no sensible default
        base_url: str = "https://api.acmecorp.com",  # sane default
        timeout: float = 30.0,                 # sane default
        max_retries: int = 3,                  # sane default
        retry_on_status: list[int] = None,     # None → use [429, 500, 502, 503, 504]
        http_client: httpx.AsyncClient = None, # None → create internally
    ):
        ...
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

### OpenAPI Generator

Generate SDKs from a single OpenAPI spec — TypeScript, Python, Go, Java, C# from one source of truth.

```bash
# Generate TypeScript SDK (axios-based)
npx openapi-generator-cli generate \
  -i openapi/v1/openapi.yaml \
  -g typescript-axios \
  -o sdks/typescript \
  --additional-properties=npmName=@acmecorp/sdk,npmVersion=2.1.0,supportsES6=true

# Generate Python SDK
npx openapi-generator-cli generate \
  -i openapi/v1/openapi.yaml \
  -g python \
  -o sdks/python \
  --additional-properties=packageName=acmecorp,projectName=acmecorp-sdk,packageVersion=2.1.0

# Generate Go SDK
npx openapi-generator-cli generate \
  -i openapi/v1/openapi.yaml \
  -g go \
  -o sdks/go \
  --additional-properties=packageName=acmecorp,moduleName=github.com/acmecorp/sdk-go
```

**Custom templates** for consistent error handling:

```mustache
{{! templates/python/api_exception.mustache }}
class {{classname}}Error(AcmeCorpError):
    """{{description}}"""
    status_code: int = {{statusCode}}

    def __init__(self, message: str, request_id: str | None = None):
        super().__init__(message)
        self.request_id = request_id
```

### Speakeasy / Stainless — Commercial Generators

For production-quality SDKs with better DX than openapi-generator:

```yaml
# .speakeasy/gen.yaml
generation:
  baseServerUrl: https://api.acmecorp.com
  sdkClassName: AcmeCorpSDK
  tagNamespacingDisabled: false
languages:
  typescript:
    version: 2.1.0
    packageName: "@acmecorp/sdk"
  python:
    version: 2.1.0
    packageName: acmecorp
  go:
    version: 2.1.0
    packageName: acmecorp
```

```bash
# Generate all languages
speakeasy generate sdk --schema openapi/v1/openapi.yaml --lang typescript,python,go
```

### SDK Monorepo Structure

```
sdk-monorepo/
├── openapi/
│   └── v1/
│       └── openapi.yaml       # Single source of truth
├── sdks/
│   ├── typescript/            # @acmecorp/sdk
│   │   ├── src/
│   │   ├── package.json
│   │   └── CHANGELOG.md
│   ├── python/                # acmecorp PyPI package
│   │   ├── acmecorp/
│   │   ├── pyproject.toml
│   │   └── CHANGELOG.md
│   └── go/                    # github.com/acmecorp/sdk-go
│       ├── acmecorp/
│       ├── go.mod
│       └── CHANGELOG.md
├── .github/
│   └── workflows/
│       ├── generate-sdks.yml  # On spec change: regenerate + PR
│       └── publish-sdks.yml   # On tag: publish to npm/PyPI/pkg.go.dev
└── scripts/
    └── generate-all.sh
```

---

## Error Design

### Typed Error Hierarchy

```python
# Python error hierarchy
class AcmeCorpError(Exception):
    """Base error for all AcmeCorp SDK errors."""
    def __init__(self, message: str, request_id: str | None = None):
        super().__init__(message)
        self.request_id = request_id

class APIError(AcmeCorpError):
    """HTTP error returned by the AcmeCorp API."""
    def __init__(self, message: str, status_code: int, **kwargs):
        super().__init__(message, **kwargs)
        self.status_code = status_code

class AuthenticationError(APIError):
    """401 — Invalid or missing API key."""
    def __init__(self, **kwargs):
        super().__init__("Invalid API key. Check your ACME_API_KEY.", status_code=401, **kwargs)

class PermissionDeniedError(APIError):
    """403 — Authenticated but not authorized for this action."""
    pass

class NotFoundError(APIError):
    """404 — Resource does not exist."""
    pass

class ValidationError(APIError):
    """422 — Request body failed validation."""
    def __init__(self, message: str, errors: list[dict], **kwargs):
        super().__init__(message, status_code=422, **kwargs)
        self.errors = errors   # [{"field": "email", "message": "is required"}]

class RateLimitError(APIError):
    """429 — Too many requests."""
    def __init__(self, message: str, retry_after: int, **kwargs):
        super().__init__(message, status_code=429, **kwargs)
        self.retry_after = retry_after   # seconds until retry is safe

class InternalServerError(APIError):
    """5xx — Unexpected server error, safe to retry."""
    pass
```

```typescript
// TypeScript error hierarchy
export class AcmeCorpError extends Error {
  constructor(
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RateLimitError extends AcmeCorpError {
  constructor(
    message: string,
    public readonly retryAfter: number,  // seconds
    requestId?: string,
  ) {
    super(message, requestId);
  }
}

// Usage in user code — fully typed, IDE shows all properties
try {
  await client.users.create({ email });
} catch (error) {
  if (error instanceof RateLimitError) {
    await sleep(error.retryAfter * 1000);
    // retry
  } else if (error instanceof ValidationError) {
    console.error("Invalid input:", error.errors);
  } else if (error instanceof AcmeCorpError) {
    throw error;  // propagate unknown SDK errors
  } else {
    throw error;  // propagate non-SDK errors unchanged
  }
}
```

### Error Response Parsing (RFC 7807)

```python
def _parse_error(response: httpx.Response) -> APIError:
    """Parse RFC 7807 Problem Details into typed SDK errors."""
    try:
        body = response.json()
        message = body.get("detail", body.get("title", "Unknown error"))
        request_id = response.headers.get("X-Request-ID")
    except Exception:
        message = response.text or f"HTTP {response.status_code}"
        request_id = None

    kwargs = {"request_id": request_id}
    match response.status_code:
        case 401: return AuthenticationError(**kwargs)
        case 403: return PermissionDeniedError(message, status_code=403, **kwargs)
        case 404: return NotFoundError(message, status_code=404, **kwargs)
        case 422: return ValidationError(message, errors=body.get("errors", []), **kwargs)
        case 429: return RateLimitError(
            message,
            retry_after=int(response.headers.get("Retry-After", 60)),
            **kwargs
        )
        case _ if response.status_code >= 500:
            return InternalServerError(message, status_code=response.status_code, **kwargs)
        case _:
            return APIError(message, status_code=response.status_code, **kwargs)
```

---

## SDK Testing

### VCR / HTTP Recording

Record real HTTP interactions once and replay in tests — no mock drift, no network dependency.

```python
# Python with pytest-recording (VCR.py)
import pytest

@pytest.mark.vcr           # records on first run, replays on subsequent runs
def test_create_user(client):
    user = client.users.create(email="test@example.com", name="Test User")
    assert user.id.startswith("usr_")
    assert user.email == "test@example.com"
```

```typescript
// TypeScript with nock or jest-nock
import nock from "nock";
import { loadFixture } from "./helpers";

beforeEach(() => {
  // Replay recorded HTTP fixture
  nock("https://api.acmecorp.com")
    .post("/v1/users")
    .reply(201, loadFixture("create_user_success.json"));
});

test("creates a user", async () => {
  const user = await client.users.create({ email: "test@example.com" });
  expect(user.id).toMatch(/^usr_/);
});
```

### Language Matrix Testing

```yaml
# .github/workflows/test-matrix.yml
strategy:
  matrix:
    language:
      - { name: typescript, node: "18" }
      - { name: typescript, node: "20" }
      - { name: typescript, node: "22" }
      - { name: python, python: "3.9" }
      - { name: python, python: "3.10" }
      - { name: python, python: "3.11" }
      - { name: python, python: "3.12" }
      - { name: go, go: "1.21" }
      - { name: go, go: "1.22" }
```

### Publish Smoke Test

Test the actual published artifact — not just the source.

```bash
# TypeScript: pack and install in a fresh project
cd sdks/typescript
npm pack
mkdir /tmp/sdk-smoke-test && cd /tmp/sdk-smoke-test
npm init -y
npm install /path/to/acmecorp-sdk-2.1.0.tgz
node -e "const { AcmeCorpSDK } = require('@acmecorp/sdk'); console.log('OK', AcmeCorpSDK)"

# Python: build wheel and install in a fresh venv
cd sdks/python
python -m build
python -m venv /tmp/sdk-smoke-venv
/tmp/sdk-smoke-venv/bin/pip install dist/*.whl
/tmp/sdk-smoke-venv/bin/python -c "import acmecorp; print('OK', acmecorp.__version__)"
```

### Contract Testing Against Staging

```python
# Verify SDK generates requests that match the OpenAPI spec
from schemathesis import from_path

schema = from_path("openapi/v1/openapi.yaml", base_url="https://api-staging.acmecorp.com")

@schema.parametrize()
def test_api_contract(case):
    response = case.call_and_validate()   # validates request AND response against spec
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

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

## [2.1.0] - 2026-03-08

### Added
- `client.users.bulk_create()` for creating up to 100 users in one API call
- `RateLimitError.retry_after` property — seconds until retry is safe

### Deprecated
- `client.users.get_all_users()` — use `client.users.list()` instead. Will be removed in v3.0.

## [2.0.0] - 2026-01-15

### Breaking Changes
- Renamed `client.create_user()` to `client.users.create()` (resource-namespaced API)
- `ValidationError.message` renamed to `ValidationError.detail`

### Migration Guide
See [docs/migration/v2.md](https://docs.acmecorp.com/migration/v2)
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
