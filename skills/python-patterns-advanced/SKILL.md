---
name: python-patterns-advanced
description: Advanced Python patterns — concurrency (threading, multiprocessing, async/await), hexagonal architecture with FastAPI, RFC 7807 error handling, memory optimization, pyproject.toml tooling, and anti-patterns. Extends python-patterns.
---

# Python Advanced Patterns

> This skill extends [python-patterns](../python-patterns/SKILL.md) with concurrency, architecture, memory optimization, and tooling.

## When to Activate

- Writing concurrent or async Python code
- Designing hexagonal/clean architecture with FastAPI
- Optimizing memory usage in Python
- Configuring Python tooling (ruff, mypy, pytest)
- Reviewing anti-patterns
- Structuring a FastAPI project with domain, application, and adapter layers
- Wiring dependency injection and output port protocols without a DI framework
- Implementing RFC 7807 Problem Details error handling across all HTTP exception types

## Concurrency Patterns

### Threading for I/O-Bound Tasks

```python
import concurrent.futures
import threading

def fetch_url(url: str) -> str:
    """Fetch a URL (I/O-bound operation)."""
    import urllib.request
    with urllib.request.urlopen(url) as response:
        return response.read().decode()

def fetch_all_urls(urls: list[str]) -> dict[str, str]:
    """Fetch multiple URLs concurrently using threads."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(fetch_url, url): url for url in urls}
        results = {}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                results[url] = future.result()
            except Exception as e:
                results[url] = f"Error: {e}"
    return results
```

### Multiprocessing for CPU-Bound Tasks

```python
def process_data(data: list[int]) -> int:
    """CPU-intensive computation."""
    return sum(x ** 2 for x in data)

def process_all(datasets: list[list[int]]) -> list[int]:
    """Process multiple datasets using multiple processes."""
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = list(executor.map(process_data, datasets))
    return results
```

### Async/Await for Concurrent I/O

```python
import asyncio

async def fetch_async(url: str) -> str:
    """Fetch a URL asynchronously."""
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def fetch_all(urls: list[str]) -> dict[str, str]:
    """Fetch multiple URLs concurrently."""
    tasks = [fetch_async(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return dict(zip(urls, results))
```

## Package Organization

### Hexagonal Project Layout (FastAPI / Clean Python)

For services with real domain logic, use hexagonal structure. `Protocol` is the natural fit for ports in Python:

```
src/
  domain/
    model/          # Pure Python dataclasses — zero framework imports
      market.py     # Market, MarketStatus, create_market(), publish_market()
      money.py      # Money, add_money() — value object
    port/
      in_/          # Input port ABCs / Protocols
        use_cases.py
      out/          # Output port Protocols
        repositories.py
    event/          # Domain event dataclasses
  application/
    use_cases/      # Use case implementations
      create_market.py
  adapter/
    in_/
      http/         # FastAPI routers + Pydantic request/response models
    out/
      persistence/  # SQLAlchemy/Prisma repositories implementing output ports
      client/       # External API clients
  config/
    container.py    # DI wiring (manual or with dependency-injector)
tests/
  unit/             # Test use cases with mocked ports — no DB, no HTTP
  integration/      # Test adapters against real infrastructure
```

### Domain Model — Zero Framework Imports

```python
# domain/model/market.py
from __future__ import annotations
from dataclasses import dataclass, replace
from enum import Enum


class MarketStatus(Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"


class InvalidMarketError(Exception):
    pass


class MarketAlreadyPublishedError(Exception):
    pass


@dataclass(frozen=True)
class Market:
    id: str | None
    name: str
    slug: str
    status: MarketStatus = MarketStatus.DRAFT


def create_market(name: str, slug: str) -> Market:
    """Factory — enforces creation invariants."""
    if not name or not name.strip():
        raise InvalidMarketError("name is required")
    return Market(id=None, name=name.strip(), slug=slug)


def publish_market(market: Market) -> Market:
    """Behavior function — returns new immutable Market."""
    if market.status != MarketStatus.DRAFT:
        raise MarketAlreadyPublishedError(f"Market {market.slug} is already published")
    return replace(market, status=MarketStatus.ACTIVE)
```

### Output Port — Protocol (Structural Typing)

```python
# domain/port/out/repositories.py
from typing import Protocol
from domain.model.market import Market, MarketStatus


class MarketRepository(Protocol):
    async def save(self, market: Market) -> Market: ...
    async def find_by_slug(self, slug: str) -> Market | None: ...
    async def find_all(
        self, status: MarketStatus | None = None, limit: int = 20, offset: int = 0
    ) -> list[Market]: ...
```

### Use Case Implementation

```python
# application/use_cases/create_market.py
from domain.model.market import Market, create_market
from domain.port.out.repositories import MarketRepository


class CreateMarketUseCase:
    def __init__(self, repository: MarketRepository) -> None:  # output port injected
        self._repository = repository

    async def execute(self, name: str, slug: str) -> Market:
        market = create_market(name, slug)           # domain logic
        return await self._repository.save(market)  # persistence via port
```

### Inbound Adapter — FastAPI Router

```python
# adapter/in_/http/market_router.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator
from application.use_cases.create_market import CreateMarketUseCase
from domain.model.market import InvalidMarketError

router = APIRouter(prefix="/markets", tags=["markets"])


class CreateMarketRequest(BaseModel):
    name: str
    slug: str

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return v


class MarketResponse(BaseModel):
    name: str
    slug: str
    status: str


def create_market_router(use_case: CreateMarketUseCase) -> APIRouter:
    @router.post("/", status_code=status.HTTP_201_CREATED, response_model=MarketResponse)
    async def create_market(body: CreateMarketRequest) -> MarketResponse:
        # Let domain errors propagate — RFC 7807 handler catches them (registered below)
        market = await use_case.execute(body.name, body.slug)
        return MarketResponse(name=market.name, slug=market.slug, status=market.status.value)
    return router
```

### Error Handling — RFC 7807 / RFC 9457 Problem Details

All HTTP errors must use `Content-Type: application/problem+json`. Register exception handlers on app startup:

```python
# adapter/in_/http/exception_handlers.py
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from domain.model.market import InvalidMarketError, MarketAlreadyPublishedError


def problem_response(status: int, type_: str, title: str,
                     detail: str | None = None, instance: str | None = None,
                     **extensions) -> JSONResponse:
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


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        return problem_response(
            400,
            "https://api.example.com/problems/validation-failed",
            "Validation Failed",
            detail="One or more fields failed validation.",
            instance=str(request.url),
            errors=[{"field": ".".join(str(l) for l in e["loc"]), "detail": e["msg"]}
                    for e in exc.errors()],
        )

    @app.exception_handler(InvalidMarketError)
    async def handle_invalid_market(request: Request, exc: InvalidMarketError) -> JSONResponse:
        return problem_response(
            422,
            "https://api.example.com/problems/invalid-market",
            "Invalid Market",
            detail=str(exc),
            instance=str(request.url),
        )

    @app.exception_handler(MarketAlreadyPublishedError)
    async def handle_already_published(request: Request, exc: MarketAlreadyPublishedError) -> JSONResponse:
        return problem_response(
            409,
            "https://api.example.com/problems/already-published",
            "Already Published",
            detail=str(exc),
            instance=str(request.url),
        )

    @app.exception_handler(Exception)
    async def handle_generic(request: Request, exc: Exception) -> JSONResponse:
        return problem_response(500, "about:blank", "Internal Server Error")
```

See skill: `problem-details` for the full RFC 7807/9457 specification and field reference.

### DI Wiring — FastAPI Dependency Injection or Manual

```python
# config/container.py
from sqlalchemy.ext.asyncio import AsyncSession
from adapter.out.persistence.market_repo import SqlAlchemyMarketRepository
from application.use_cases.create_market import CreateMarketUseCase


def get_create_market_use_case(session: AsyncSession) -> CreateMarketUseCase:
    repo = SqlAlchemyMarketRepository(session)  # outbound adapter
    return CreateMarketUseCase(repo)            # use case with injected port


# In FastAPI app setup:
# register_exception_handlers(app)
# app.include_router(create_market_router(get_create_market_use_case(session)))
```

### Testing Use Cases (Mock the Protocol)

```python
# tests/unit/test_create_market.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from application.use_cases.create_market import CreateMarketUseCase
from domain.model.market import Market, MarketStatus, InvalidMarketError


class MockMarketRepository:
    """Inline mock satisfying MarketRepository Protocol."""
    def __init__(self):
        self.saved: list[Market] = []

    async def save(self, market: Market) -> Market:
        saved = Market(id="market-1", name=market.name, slug=market.slug, status=market.status)
        self.saved.append(saved)
        return saved

    async def find_by_slug(self, slug: str) -> Market | None:
        return None

    async def find_all(self, status=None, limit=20, offset=0) -> list[Market]:
        return []


@pytest.mark.asyncio
async def test_create_market_saves_and_returns():
    repo = MockMarketRepository()
    use_case = CreateMarketUseCase(repo)

    market = await use_case.execute("Test Market", "test-market")

    assert market.name == "Test Market"
    assert len(repo.saved) == 1


@pytest.mark.asyncio
async def test_create_market_rejects_blank_name():
    use_case = CreateMarketUseCase(MockMarketRepository())

    with pytest.raises(InvalidMarketError):
        await use_case.execute("", "slug")
```

> **Note**: This hexagonal structure is for FastAPI and clean Python backends. For **Django**, do not use this structure — Django's ORM couples domain and persistence by design. See skill: `django-patterns` for Django-specific DDD patterns.

### Import Conventions

```python
# Good: Import order - stdlib, third-party, local
import os
import sys
from pathlib import Path

import requests
from fastapi import FastAPI

from mypackage.models import User
from mypackage.utils import format_name

# Good: Use isort for automatic import sorting
# pip install isort
```

### `__init__.py` for Package Exports

```python
# mypackage/__init__.py
"""mypackage - A sample Python package."""

__version__ = "1.0.0"

# Export main classes/functions at package level
from mypackage.models import User, Post
from mypackage.utils import format_name

__all__ = ["User", "Post", "format_name"]
```

## Memory and Performance

### Using `__slots__` for Memory Efficiency

```python
# Bad: Regular class uses __dict__ (more memory)
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# Good: __slots__ reduces memory usage
class Point:
    __slots__ = ['x', 'y']

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
```

### Generator for Large Data

```python
# Bad: Returns full list in memory
def read_lines(path: str) -> list[str]:
    with open(path) as f:
        return [line.strip() for line in f]

# Good: Yields lines one at a time
def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f:
            yield line.strip()
```

### Avoid String Concatenation in Loops

```python
# Bad: O(n²) due to string immutability
result = ""
for item in items:
    result += str(item)

# Good: O(n) using join
result = "".join(str(item) for item in items)

# Good: Using StringIO for building
from io import StringIO

buffer = StringIO()
for item in items:
    buffer.write(str(item))
result = buffer.getvalue()
```

## Python Tooling Integration

### Essential Commands

```bash
# Code formatting (ruff replaces black + isort)
ruff format .
ruff check --fix .

# Linting
ruff check .

# Type checking
mypy .

# Testing
pytest --cov=mypackage --cov-report=html

# Security scanning
bandit -r .

# Dependency management
pip-audit
```

### pyproject.toml Configuration

```toml
[project]
name = "mypackage"
version = "1.0.0"
requires-python = ">=3.13"
dependencies = [
    "requests>=2.32.0",
    "pydantic>=2.10.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-cov>=6.0.0",
    "ruff>=0.11.0",
    "mypy>=1.15.0",
]

[tool.ruff]
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]

[tool.ruff.format]
# ruff format replaces black — no [tool.black] needed

[tool.mypy]
python_version = "3.13"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=mypackage --cov-report=term-missing"
```

## Quick Reference: Python Idioms

| Idiom | Description |
|-------|-------------|
| EAFP | Easier to Ask Forgiveness than Permission |
| Context managers | Use `with` for resource management |
| List comprehensions | For simple transformations |
| Generators | For lazy evaluation and large datasets |
| Type hints | Annotate function signatures |
| Dataclasses | For data containers with auto-generated methods |
| `__slots__` | For memory optimization |
| f-strings | For string formatting |
| `pathlib.Path` | For path operations |
| `enumerate` | For index-element pairs in loops |

## Anti-Patterns to Avoid

```python
# Bad: Mutable default arguments
def append_to(item, items=[]):
    items.append(item)
    return items

# Good: Use None and create new list
def append_to(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

# Bad: Checking type with type()
if type(obj) == list:
    process(obj)

# Good: Use isinstance
if isinstance(obj, list):
    process(obj)

# Bad: Comparing to None with ==
if value == None:
    process()

# Good: Use is
if value is None:
    process()

# Bad: from module import *
from os.path import *

# Good: Explicit imports
from os.path import join, exists

# Bad: Bare except
try:
    risky_operation()
except:
    pass

# Good: Specific exception
try:
    risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
```

**Remember**: Python code should be readable, explicit, and follow the principle of least surprise. When in doubt, prioritize clarity over cleverness.

> **NamedTuples and Decorators** are covered in `python-patterns` base skill.
> Use `NamedTuple` over plain `tuple` for named field access; use class-based decorators for stateful wrapping.
