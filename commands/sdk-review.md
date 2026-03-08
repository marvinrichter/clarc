---
description: SDK Design Review — ergonomics, consistency, backward compatibility, error hierarchy, documentation coverage, multi-language generation, and VCR/contract test readiness. Invokes the sdk-architect agent.
---

# SDK Review

This command performs a comprehensive design review of an SDK or client library, covering ergonomics, backward compatibility, error design, documentation quality, and testing infrastructure.

## What This Command Does

1. **Ergonomics** — how many lines for the most common use case?
2. **Consistency** — same concepts, same names, same patterns everywhere?
3. **Backward Compatibility** — breaking changes correctly marked as MAJOR?
4. **Error Design** — typed, actionable error hierarchy?
5. **Documentation** — every public API with docstring and example?
6. **Multi-Language** — generated or manual? Generator config current?
7. **Testing** — VCR tests, contract tests, language matrix?

## When to Use

Use `/sdk-review` when:
- Releasing a new major or minor version of an SDK
- Onboarding a new language into a multi-language SDK suite
- After a large refactor of the SDK surface area
- Before publishing to a package registry (npm, PyPI, pkg.go.dev)
- Reviewing a generated SDK from OpenAPI Generator or Speakeasy
- Adding new API endpoints that require SDK method additions

## Review Checklist

### 1. Ergonomics Audit

**The 3-line test:** can a new user accomplish the most common task in 3 lines of copy-pasteable code?

```bash
# Find the README or Getting Started section
find . -name "README.md" -maxdepth 3 | head -5
grep -r "Quick Start\|Getting Started\|Installation" --include="*.md" -l .
```

Evaluate:
- [ ] Installation is a single command (`pip install acmecorp` / `npm install @acmecorp/sdk`)
- [ ] First example is ≤ 5 lines of real, runnable code
- [ ] No boilerplate required (no manual HTTP client setup, no verbose configuration)
- [ ] Authentication uses an environment variable by default (not hardcoded in examples)

```python
# Measure "lines to success" for the top 3 use cases
# Score: 1-3 lines = Excellent, 4-6 = Good, 7-10 = Acceptable, 10+ = Needs work

# Example audit questions:
# - How many lines to create a user?
# - How many lines to list resources with pagination?
# - How many lines to handle a rate limit error and retry?
```

### 2. Consistency Audit

```bash
# Extract all public method names across the SDK
# Python
grep -r "def " --include="*.py" src/ | grep -v "def _" | grep -v "def test_"

# TypeScript
grep -r "async\|public" --include="*.ts" src/ | grep "(" | grep -v "private\|protected\|//"

# Go
grep -r "^func " --include="*.go" .
```

Check for:
- [ ] Resource naming: `client.users`, `client.orders` — not `client.get_users()`, `client.fetchOrders()`
- [ ] Verb naming: `create`, `get`, `list`, `update`, `delete` — consistent across all resources
- [ ] Pagination: same interface (`limit`, `cursor`) for all list endpoints
- [ ] Options objects: same pattern for request options across all methods
- [ ] Response shapes: same wrapper type for all responses (not sometimes `dict`, sometimes `object`)

**Consistency score:** (consistent methods / total methods) × 100%. Target: ≥ 95%.

### 3. Backward Compatibility Check

```bash
# TypeScript — detect breaking changes with api-extractor
npx @microsoft/api-extractor run --local 2>&1 | grep -E "Error|Warning|Breaking"

# Python — compare current public API to previous release
pip install apicompat  # or use manual diffing
git diff v2.0.0..HEAD -- "*.py" | grep "^-\s*def \|^-\s*class "

# Go — gorelease
go run golang.org/x/exp/cmd/gorelease@latest -base=v2.0.0

# Check CHANGELOG.md has a Breaking Changes section for this version
grep -A20 "## \[Unreleased\]" CHANGELOG.md | grep -i "breaking"
```

Verify for each breaking change:
- [ ] Version bump is MAJOR (2.x.x → 3.0.0), not MINOR or PATCH
- [ ] Migration guide exists (`docs/migration/v3.md` or equivalent)
- [ ] Old method is `@deprecated` with a minimum 1 major version warning period
- [ ] Deprecation warning includes the replacement method name and migration guide URL

### 4. Error Design Review

```bash
# Find error classes / exception hierarchy
grep -r "class.*Error\|class.*Exception" --include="*.py" --include="*.ts" --include="*.go" src/ | grep -v "test"
```

Evaluate the error hierarchy:
- [ ] A base `SDKError` or `AcmeCorpError` class exists that all SDK errors inherit from
- [ ] HTTP status codes map to specific error types (401 → `AuthenticationError`, 429 → `RateLimitError`)
- [ ] `RateLimitError` exposes `retry_after` / `retryAfter` in seconds
- [ ] `ValidationError` exposes structured field-level errors, not just a message string
- [ ] Errors include `request_id` / `requestId` for support escalation
- [ ] Non-SDK errors (network timeouts, DNS failures) are NOT silently swallowed

```python
# Test: are all HTTP status codes handled?
EXPECTED_ERROR_MAPPING = {
    401: "AuthenticationError",
    403: "PermissionDeniedError",
    404: "NotFoundError",
    422: "ValidationError",
    429: "RateLimitError",
    500: "InternalServerError",
    503: "InternalServerError",
}

# Verify each status code has a corresponding error class
```

### 5. Documentation Coverage

```bash
# Python: check docstring coverage
pip install interrogate
interrogate src/ --fail-under=90 --verbose

# TypeScript: check JSDoc coverage with typedoc
npx typedoc --validation.notExported --validation.invalidLink src/

# Check that every public method has an example in its docstring
grep -rn "def \|async " --include="*.py" src/ | grep -v "_" | wc -l   # total public methods
grep -rn "Example:" --include="*.py" src/ | wc -l                       # methods with examples
# Target: 100% of public methods have examples
```

Verify:
- [ ] Every public class and method has a docstring
- [ ] Every docstring includes at least one runnable code example
- [ ] Getting Started guide exists and can be completed in < 5 minutes
- [ ] Cookbook exists with the top 5–10 real-world use cases
- [ ] CHANGELOG.md follows [Keep a Changelog](https://keepachangelog.com) format
- [ ] Migration guide exists for every MAJOR version

### 6. Multi-Language Generation

```bash
# Check if SDK is generated or manually written
ls .speakeasy/ .openapi-generator/ generator.yaml gen.yaml 2>/dev/null

# Find the OpenAPI spec
find . -name "openapi.yaml" -o -name "openapi.json" -o -name "swagger.yaml" | head -5

# Check if generated code is up to date
git diff HEAD -- sdks/ | wc -l   # should be 0 if recently regenerated
```

For generated SDKs:
- [ ] Generator configuration file exists and is committed to the repo
- [ ] Generation is triggered automatically when the OpenAPI spec changes (CI workflow)
- [ ] Custom templates are committed so generation is reproducible
- [ ] Typed error classes use custom templates (not the generator default)
- [ ] All supported languages are generated from the same spec (no manual divergence)

For manually written SDKs:
- [ ] Evaluate migration to OpenAPI Generator or Speakeasy — manual drift is a maintenance burden
- [ ] At minimum, confirm API contract tests run against the OpenAPI spec

### 7. Testing Infrastructure

```bash
# Check for VCR / HTTP recording
grep -r "vcr\|cassette\|nock\|httpretty\|responses\|vcrpy" --include="*.py" --include="*.ts" -l .

# Check test matrix
cat .github/workflows/test*.yml | grep -E "node:|python:|go:" | head -20

# Check for contract tests
grep -r "schemathesis\|prism\|dredd\|pact" --include="*.py" --include="*.ts" --include="*.yml" -l .

# Check for publish smoke tests
grep -r "npm pack\|pip install dist\|go test ./\.\.\." --include="*.sh" --include="*.yml" -l .
```

Verify:
- [ ] VCR / HTTP recording is used (not hand-written mocks) — prevents mock drift
- [ ] Tests pass with recorded cassettes (no network required in CI)
- [ ] Language version matrix: minimum 3 versions per language
- [ ] Contract test against staging runs in CI
- [ ] Publish smoke test (`npm pack && fresh install`) runs before publish

## Severity Classification

| Severity | Finding | SLA |
|----------|---------|-----|
| CRITICAL | Breaking change shipped as MINOR/PATCH without deprecation | Fix before release |
| CRITICAL | No base error class — SDK throws raw `Exception`/`Error` | Fix before release |
| HIGH | <80% docstring coverage | Fix in this release |
| HIGH | No VCR tests — all HTTP mocked by hand | Fix within 2 sprints |
| HIGH | Generated SDK out of sync with OpenAPI spec | Regenerate before release |
| MEDIUM | Missing deprecation warnings (< 1 major version notice) | Fix in next MINOR |
| MEDIUM | Inconsistent resource/verb naming (< 95% consistency) | Fix in next MINOR |
| LOW | Missing cookbook examples | Backlog |

## Output Report Format

```
SDK Review Report
=================
SDK: acmecorp-python v2.1.0
Date: 2026-03-08

CRITICAL (0)
HIGH (1)
  [DOCS] Public method coverage: 78% (target: 90%). Missing docstrings on 5 methods.

MEDIUM (2)
  [COMPAT] users.get_all_users() deprecated without migration guide URL in warning message
  [TEST] No language matrix — only tested against Python 3.11 (should include 3.9–3.12)

LOW (1)
  [DOCS] Cookbook missing — only Getting Started guide exists

Ergonomics Score: 5/5 (excellent — 3 lines to first API call)
Consistency Score: 98% (49/50 methods follow resource.verb pattern)
Error Hierarchy: Complete (7 typed errors, all HTTP status codes mapped)
VCR Tests: Yes (127 cassettes)
Contract Tests: Yes (schemathesis on staging)

Recommendation: Fix HIGH issue before publishing. MEDIUM issues in next MINOR release.
```

## Related

- Agent: `agents/sdk-architect.md`
- Skill: `skills/sdk-design-patterns/` — patterns and code examples
- Skill: `skills/api-contract/` — OpenAPI spec authoring
- Skill: `skills/contract-testing/` — Pact and OpenAPI contract tests
- Command: `/api-review` — review the underlying API before reviewing the SDK
