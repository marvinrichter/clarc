---
description: Run Python tests with coverage using pytest. Enforces 80%+ coverage and fails fast on the first error.
---

# Python Test

Run the full Python test suite with coverage reporting.

## What This Command Does

Enforces TDD methodology (Red → Green → Refactor) for Python:

1. **Write test first** (RED) — new test must fail before implementation
2. **Implement to pass** (GREEN) — minimal code to make test pass
3. **Run full suite** — verify nothing regressed
4. **Coverage** — measure and report line coverage (min 80%)
5. **Type Check** — run `mypy` if available
6. **Lint** — run `ruff check` if available

> Not a TDD workflow? Use this command to verify tests pass and coverage is met after the fact. For write-tests-first enforcement, the **tdd-guide** agent provides step-by-step guidance.

## Diagnostic Commands

```bash
# Run tests with coverage (fail on first error)
pytest --cov=src --cov-report=term-missing -x

# Type checking
mypy . 2>/dev/null || mypy src/ 2>/dev/null || true

# Linting
ruff check . 2>/dev/null || true

# Full check
pytest --cov=src --cov-report=term-missing --cov-fail-under=80
```

## When to Use

- Before committing Python changes
- After adding new features (verify tests pass)
- When CI reports failing tests
- To verify 80%+ coverage requirement

## Coverage Requirements

Minimum 80% line coverage on application code. Exclude:
- `tests/` directory
- Migration files
- `__init__.py` files

Configure in `pyproject.toml`:
```toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-fail-under=80"
```

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| `ImportError` | Missing dependency | `pip install -r requirements.txt` |
| `AssertionError` | Test expectation wrong | Check implementation or update test |
| `fixture 'X' not found` | Missing pytest fixture | Define fixture or import from conftest |
| Coverage < 80% | Untested code paths | Add tests for uncovered branches |

## Approval Criteria

- **Approve**: All tests pass, coverage ≥ 80%
- **Warning**: All tests pass, coverage 70–79%
- **Block**: Any test failures or coverage < 70%

## Related

- Agent: `agents/python-reviewer.md`
- Skills: `skills/python-testing/`, `skills/python-testing-advanced/`
- Use `/python-review` for a full code quality review
