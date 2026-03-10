---
name: fastapi-patterns
description: "FastAPI architecture patterns — async endpoints, Pydantic models, dependency injection, OpenAPI, background tasks, and testing with pytest + HTTPX."
---

# FastAPI Patterns

Modern Python API development with FastAPI, Pydantic v2, and async/await.

## When to Activate

- Building or reviewing FastAPI API endpoints
- Designing Pydantic request/response schemas
- Implementing dependency injection with `Depends()`
- Writing async database queries (SQLAlchemy async, Motor)
- Setting up FastAPI testing with pytest + HTTPX
- Structuring a FastAPI project (routers, services, repositories)
- Migrating a Flask or Django REST Framework app to FastAPI
- Adding background tasks or lifespan event handlers to an existing FastAPI application
- Configuring global exception handlers to return RFC 7807 Problem Details responses

---

## Project Structure

```
app/
├── main.py                 # FastAPI app creation, middleware, lifespan
├── api/
│   ├── v1/
│   │   ├── router.py       # APIRouter aggregator
│   │   ├── users.py        # User endpoints
│   │   └── items.py        # Item endpoints
├── core/
│   ├── config.py           # Settings (pydantic-settings)
│   └── security.py         # JWT, password hashing
├── models/
│   └── db.py               # SQLAlchemy ORM models
├── schemas/
│   ├── user.py             # Pydantic request/response schemas
│   └── item.py
├── services/
│   └── user_service.py     # Business logic (no framework deps)
├── repositories/
│   └── user_repo.py        # Data access (SQLAlchemy queries)
├── dependencies/
│   └── auth.py             # Shared Depends() functions
└── tests/
    ├── conftest.py
    └── api/test_users.py
```

---

## App Setup

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.v1 import router as v1_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(v1_router, prefix="/api/v1")
```

---

## Pydantic Schemas

```python
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from uuid import UUID


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}  # ORM mode
```

---

## Async Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    service: UserService = Depends(),
) -> UserResponse:
    return await service.create(payload)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, service: UserService = Depends()) -> UserResponse:
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## Dependency Injection

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_jwt
from app.repositories.user_repo import UserRepository

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    repo: UserRepository = Depends(),
) -> UserResponse:
    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await repo.find_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

---

## Configuration (pydantic-settings)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "My API"
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
```

---

## Background Tasks

```python
from fastapi import BackgroundTasks


async def send_welcome_email(email: str) -> None:
    # heavy I/O — runs after response is sent
    await email_client.send(to=email, subject="Welcome!")


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    payload: UserCreate,
    background_tasks: BackgroundTasks,
    service: UserService = Depends(),
) -> UserResponse:
    user = await service.create(payload)
    background_tasks.add_task(send_welcome_email, user.email)
    return user
```

---

## Error Handling

```python
from fastapi import Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )
```

---

## Testing

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# test_users.py
@pytest.mark.asyncio
async def test_create_user(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/users/",
        json={"email": "test@example.com", "name": "Test User", "password": "secret"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
```

Run tests:
```bash
pip install pytest pytest-asyncio httpx
pytest -v --asyncio-mode=auto
```

---

## Key Rules

1. **Pydantic v2** — use `model_config`, `@field_validator`, `model_validate()` (not v1 API)
2. **Async all the way** — use `async def` for endpoints; avoid blocking I/O in async context
3. **`response_model`** — always declare to control serialization and OpenAPI schema
4. **`Depends()` for DI** — inject services, repos, auth via Depends; avoid global state
5. **Lifespan** — use `@asynccontextmanager lifespan` instead of deprecated `@app.on_event`
6. **Status codes** — set `status_code` explicitly on `@router.post()`, not inside the handler
7. **No business logic in endpoints** — delegate to service classes

## Related Skills

- `python-patterns` — Pythonic idioms, PEP 8, type hints
- `python-testing` — pytest fixtures, mocking, coverage
- `ddd-python` — Domain-Driven Design for Python (entities, repositories, domain events)
- `api-design` — REST API design, versioning, error formats
- `postgres-patterns` — PostgreSQL patterns for the data layer
