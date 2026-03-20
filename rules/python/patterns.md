---
paths:
  - "**/*.py"
  - "**/*.pyi"
globs:
  - "**/*.py"
  - "**/*.pyi"
alwaysApply: false
---
# Python Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Python specific content.

## Protocol as Output Port

`Protocol` is the Python port interface — structural typing means any class with matching signatures satisfies it without explicit inheritance:

```python
from typing import Protocol
from domain.model.market import Market, MarketStatus


class MarketRepository(Protocol):
    async def save(self, market: Market) -> Market: ...
    async def find_by_slug(self, slug: str) -> Market | None: ...
```

## Hexagonal Package Structure (FastAPI)

```
src/
  domain/model/      # @dataclass(frozen=True) — zero framework imports
  domain/port/out/   # Protocol output ports (defined in domain, not in adapter)
  application/       # Use case classes — inject output ports via __init__
  adapter/in_/http/  # FastAPI routers + Pydantic request/response schemas
  adapter/out/       # SQLAlchemy/psycopg implementations of output ports
```

## Domain Model — Frozen Dataclass

```python
@dataclass(frozen=True)  # immutable = value object behavior
class Market:
    id: str | None
    name: str
    slug: str
    status: MarketStatus = MarketStatus.DRAFT

def create_market(name: str, slug: str) -> Market:
    if not name.strip():
        raise InvalidMarketError("name is required")
    return Market(id=None, name=name, slug=slug)

def publish_market(market: Market) -> Market:  # returns new instance, no mutation
    if market.status != MarketStatus.DRAFT:
        raise MarketAlreadyPublishedError(market.slug)
    from dataclasses import replace
    return replace(market, status=MarketStatus.ACTIVE)
```

## Django: DDD Subset (not hexagonal)

For Django, use behavior in models + service layer. Do NOT use hexagonal — Django ORM couples domain and persistence by design:

```python
# Model with domain behavior (fat model)
class Market(models.Model):
    def publish(self) -> None:
        if self.status != "DRAFT":
            raise ValidationError("not a draft")
        self.status = "ACTIVE"
        self.save(update_fields=["status"])

# Service as use case
def publish_market(slug: str) -> Market:
    with transaction.atomic():
        market = Market.objects.select_for_update().get(slug=slug)
        market.publish()  # domain behavior on the model
    return market
```

## Dataclasses as DTOs

```python
from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
```

## Context Managers & Generators

- Use context managers (`with` statement) for resource management
- Use generators for lazy evaluation and memory-efficient iteration

## Reference

See skill: `python-patterns` for hexagonal FastAPI patterns, and `django-patterns` for Django DDD patterns.
