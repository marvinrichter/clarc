---
name: fastapi-verification
description: "Verification loop for FastAPI projects: type checking, linting, tests with coverage, security scans, and API schema validation before release or PR."
---

# FastAPI Verification Loop

Run before PRs, after major changes, and pre-deploy to ensure FastAPI application quality and security.

## When to Activate

- Before opening a pull request for a FastAPI project
- After adding or modifying endpoints, Pydantic models, or dependencies
- Pre-deployment verification for staging or production
- Running full environment → lint → test → security → schema pipeline
- Validating Pydantic model correctness and test coverage

## Phase 1: Environment Check

```bash
# Verify Python version
python --version  # Should match project requirements (3.11+)

# Check virtual environment
which python
pip list --outdated

# Verify required env vars
python -c "
import os
required = ['DATABASE_URL', 'SECRET_KEY']
for var in required:
    status = 'SET' if os.environ.get(var) else 'MISSING'
    print(f'{status}: {var}')
"
```

If environment is misconfigured, stop and fix before proceeding.

## Phase 2: Type Checking & Linting

```bash
# Type checking with mypy
mypy app/ --strict 2>&1 | tail -20

# Linting and formatting with ruff
ruff check . --fix
ruff format . --check

# Type stubs check (Pydantic v2)
python -c "from pydantic import BaseModel; print('Pydantic OK')"
```

Common issues:
- Missing type annotations on route functions
- `Any` types in Pydantic models
- Untyped `Depends()` parameters

## Phase 3: Tests + Coverage

```bash
# Run all tests
pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

# Run only unit tests (fast)
pytest tests/unit/ -v

# Run integration tests (requires DB)
pytest tests/integration/ -v

# Coverage threshold check
pytest --cov=app --cov-fail-under=80
```

Coverage targets:

| Component | Target |
|-----------|--------|
| Routes | 85%+ |
| Services | 90%+ |
| Domain Models | 95%+ |
| Overall | 80%+ |

## Phase 4: Security Scan

```bash
# Dependency vulnerabilities
pip-audit
safety check --full-report

# Bandit security linter
bandit -r app/ -ll -f text 2>&1 | head -40

# Secret scanning
gitleaks detect --source . --verbose 2>/dev/null || echo "gitleaks not installed"

# Check for hardcoded secrets
grep -rn "secret\|password\|api_key\|token" app/ --include="*.py" | grep -v "test\|example\|env\|settings" | grep -v "\.pyc"
```

## Phase 5: API Schema Validation

```bash
# Start server and generate OpenAPI schema
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 2

# Fetch and validate OpenAPI schema
curl -s http://localhost:8000/openapi.json | python -m json.tool > /dev/null && echo "Schema: valid JSON"

# Save schema snapshot
curl -s http://localhost:8000/openapi.json > openapi-snapshot.json

# Compare with previous schema (breaking change detection)
# diff openapi-previous.json openapi-snapshot.json

# Stop server
kill %1
```

Schema checklist:
- All endpoints have summary and description
- All response models are typed (no `Any`)
- Error responses use RFC 7807 Problem Details format
- Authentication is documented (Bearer, OAuth2, etc.)

## Phase 6: Performance Spot Check

```bash
# Check for N+1 queries (requires SQLAlchemy event listener)
python -c "
import asyncio
from app.database import get_session
# Run suspicious endpoints and check query count
print('Run dev server with SQL echo=True to detect N+1')
"

# Response time spot check
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 2
curl -o /dev/null -s -w "Response time: %{time_total}s\n" http://localhost:8000/health
kill %1
```

## Phase 7: Diff Review

```bash
# Show changes
git diff --stat
git diff | grep -E "todo|fixme|hack|xxx" -i
git diff | grep "print("       # Debug statements
git diff | grep "raise Exception"  # Generic exceptions
```

Checklist:
- No `print()` debug statements — use `logging` or `structlog`
- No bare `except:` clauses
- No hardcoded secrets or credentials
- Pydantic response models cover all fields
- Background tasks have error handling

## Output Template

```
FASTAPI VERIFICATION REPORT
============================

Phase 1: Environment
  ✓ Python 3.13.x
  ✓ Virtual environment active
  ✓ DATABASE_URL set
  ✗ REDIS_URL missing (optional — feature disabled)

Phase 2: Type Checking & Linting
  ✓ mypy: No type errors
  ✓ ruff: No issues
  ✓ ruff format: Formatted correctly

Phase 3: Tests + Coverage
  Tests: 183 passed, 0 failed, 2 skipped
  Coverage:
    Overall: 86%
    routes: 88%
    services: 91%
    domain: 96%

Phase 4: Security
  ✓ pip-audit: No vulnerabilities
  ✓ bandit: No high-severity issues
  ✓ No secrets detected

Phase 5: API Schema
  ✓ Schema valid JSON
  ✓ 23 endpoints documented
  ✓ All responses typed

Phase 6: Performance
  Response time /health: 0.008s

Phase 7: Diff Review
  Files changed: 7
  +210, -45 lines
  ✓ No debug statements
  ✓ No hardcoded secrets

RECOMMENDATION: ✓ Ready to merge
```

## Pre-Deployment Checklist

- [ ] All tests passing with 80%+ coverage
- [ ] No security vulnerabilities (pip-audit clean)
- [ ] SECRET_KEY not hardcoded, set from environment
- [ ] CORS origins restricted (not `*` in production)
- [ ] Rate limiting configured on sensitive endpoints
- [ ] Database connection pooling configured
- [ ] Alembic migrations applied
- [ ] Health check endpoint returns 200
- [ ] Error monitoring (Sentry) configured
- [ ] Structured logging (structlog) enabled

## Related Skills

- **`fastapi-patterns`** — Architecture patterns, Pydantic models, dependency injection
- **`python-testing`** — pytest fixtures, HTTPX async client, factory patterns
- **`django-verification`** — Similar loop for Django projects
- **`verification-loop`** — General-purpose verification for any project
