---
name: ddd-python
description: "Domain-Driven Design tactical patterns for Python — entities, value objects, aggregates, repositories, domain events, and application services using dataclasses and Pydantic."
---

# DDD Python

Tactical Domain-Driven Design patterns for Python projects. Uses dataclasses or Pydantic for value objects and entities, ABCs for ports, and SQLAlchemy for the repository implementation.

## When to Activate

- Structuring a Python service with complex business rules
- Implementing entities, value objects, or aggregates in Python
- Defining repository interfaces and SQLAlchemy implementations
- Adding domain events and application service layers
- Refactoring Django/FastAPI code towards hexagonal architecture
- Deciding how to model a domain concept as an entity vs. a value object in Python
- Wiring DDD patterns into a FastAPI or Django project without leaking domain logic into views

---

## Entities

Entities have identity (an `id` field) that persists over time. Equality is by identity, not value.

```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4
from datetime import datetime


@dataclass
class User:
    id: UUID
    email: str
    name: str
    created_at: datetime

    @classmethod
    def create(cls, email: str, name: str) -> "User":
        return cls(
            id=uuid4(),
            email=email.lower().strip(),
            name=name.strip(),
            created_at=datetime.utcnow(),
        )

    def rename(self, new_name: str) -> "User":
        if not new_name.strip():
            raise ValueError("Name must not be blank")
        from dataclasses import replace
        return replace(self, name=new_name.strip())

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return NotImplemented
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)
```

---

## Value Objects

Value objects have no identity — equality is by value. Always immutable.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    amount: int   # store in minor units (cents)
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Amount must not be negative")
        if len(self.currency) != 3:
            raise ValueError("Currency must be a 3-letter ISO code")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

    def __str__(self) -> str:
        return f"{self.amount / 100:.2f} {self.currency}"


@dataclass(frozen=True)
class EmailAddress:
    value: str

    def __post_init__(self) -> None:
        if "@" not in self.value:
            raise ValueError(f"Invalid email: {self.value!r}")
        object.__setattr__(self, "value", self.value.lower().strip())
```

---

## Aggregates

Aggregates group entities and value objects under a single root. External code only interacts with the root. Invariants are enforced inside the aggregate.

```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4
from typing import List


@dataclass
class OrderLine:
    product_id: UUID
    quantity: int
    unit_price: Money


@dataclass
class Order:
    id: UUID
    customer_id: UUID
    lines: List[OrderLine] = field(default_factory=list)
    _events: List["DomainEvent"] = field(default_factory=list, repr=False, compare=False)

    @classmethod
    def create(cls, customer_id: UUID) -> "Order":
        order = cls(id=uuid4(), customer_id=customer_id)
        order._events.append(OrderCreated(order_id=order.id, customer_id=customer_id))
        return order

    def add_line(self, product_id: UUID, quantity: int, unit_price: Money) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        self.lines.append(OrderLine(product_id, quantity, unit_price))

    @property
    def total(self) -> Money:
        if not self.lines:
            return Money(0, "USD")
        result = Money(0, self.lines[0].unit_price.currency)
        for line in self.lines:
            result = result.add(Money(line.quantity * line.unit_price.amount, line.unit_price.currency))
        return result

    def collect_events(self) -> List["DomainEvent"]:
        events, self._events = self._events, []
        return events
```

---

## Domain Events

```python
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class DomainEvent:
    occurred_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class OrderCreated(DomainEvent):
    order_id: UUID
    customer_id: UUID


@dataclass(frozen=True)
class OrderShipped(DomainEvent):
    order_id: UUID
    tracking_number: str
```

---

## Repository Interface (Port)

```python
from abc import ABC, abstractmethod
from uuid import UUID
from typing import Optional


class OrderRepository(ABC):
    @abstractmethod
    async def find_by_id(self, order_id: UUID) -> Optional[Order]:
        ...

    @abstractmethod
    async def save(self, order: Order) -> None:
        ...

    @abstractmethod
    async def delete(self, order_id: UUID) -> None:
        ...
```

---

## SQLAlchemy Repository (Adapter)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional


class SqlAlchemyOrderRepository(OrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, order_id: UUID) -> Optional[Order]:
        row = await self._session.get(OrderModel, order_id)
        return _to_domain(row) if row else None

    async def save(self, order: Order) -> None:
        model = _to_model(order)
        await self._session.merge(model)

    async def delete(self, order_id: UUID) -> None:
        row = await self._session.get(OrderModel, order_id)
        if row:
            await self._session.delete(row)


def _to_domain(row: "OrderModel") -> Order:
    return Order(id=row.id, customer_id=row.customer_id)


def _to_model(order: Order) -> "OrderModel":
    return OrderModel(id=order.id, customer_id=order.customer_id)
```

---

## Application Service

Application services orchestrate domain objects. They have no business logic — they coordinate reads, aggregate calls, event dispatch, and persistence.

```python
class CreateOrderUseCase:
    def __init__(
        self,
        order_repo: OrderRepository,
        event_bus: EventBus,
    ) -> None:
        self._orders = order_repo
        self._events = event_bus

    async def execute(self, customer_id: UUID) -> UUID:
        order = Order.create(customer_id)
        await self._orders.save(order)

        for event in order.collect_events():
            await self._events.publish(event)

        return order.id
```

---

## Key Rules

1. **Entities**: identity-based equality; always create via class method, not `__init__` directly
2. **Value objects**: `@dataclass(frozen=True)`; validate in `__post_init__`; return new instances for "mutations"
3. **Aggregates**: protect invariants inside; expose domain events via `collect_events()`
4. **Repositories**: define as ABC (port); implement with SQLAlchemy or any ORM (adapter)
5. **Application services**: no domain logic; orchestrate + commit + publish events
6. **Domain layer**: zero framework imports; no FastAPI, Django, or SQLAlchemy in domain models

## Related Skills

- `ddd-typescript` — Same patterns in TypeScript
- `ddd-java` — Same patterns in Java/Spring Boot
- `fastapi-patterns` — Wiring DDD layers into FastAPI
- `django-patterns` — Wiring DDD layers into Django
- `postgres-patterns` — PostgreSQL patterns for the repository layer
