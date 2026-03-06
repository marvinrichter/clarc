---
name: python-testing-advanced
description: Advanced Python testing — async testing with pytest-asyncio, exception/side-effect testing, test organization, common patterns (API, database, class methods), pytest configuration, and CLI reference. Extends python-testing.
origin: ECC
---

# Python Testing — Advanced Patterns

> This skill extends [python-testing](../python-testing/SKILL.md) with async testing, advanced mocking, test organization, common patterns, and configuration.

## When to Activate

- Testing async code (FastAPI, aiohttp, asyncio)
- Structuring large test suites
- Setting up pytest configuration for projects
- Testing database layers, API endpoints, or class methods in depth

## Testing Async Code

### pytest-asyncio Setup

```bash
pip install pytest-asyncio
```

```python
# pytest.ini or pyproject.toml
[pytest]
asyncio_mode = auto  # or "strict" for explicit marking
```

### Basic Async Tests

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_async_function():
    """Test async function."""
    result = await async_add(2, 3)
    assert result == 5

@pytest.mark.asyncio
async def test_async_with_timeout():
    """Test with timeout."""
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(
            slow_operation(),
            timeout=0.1
        )
```

### Async Fixtures

```python
@pytest.fixture
async def async_client():
    """Async fixture for HTTP client."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def async_db():
    """Async database fixture."""
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.mark.asyncio
async def test_async_endpoint(async_client):
    """Test with async client fixture."""
    response = await async_client.get("/users/1")
    assert response.status_code == 200
```

### Mocking Async Functions

```python
from unittest.mock import AsyncMock, patch

@patch("mypackage.fetch_data", new_callable=AsyncMock)
async def test_with_async_mock(mock_fetch):
    """Test with mocked async function."""
    mock_fetch.return_value = {"data": "result"}

    result = await process_data()

    mock_fetch.assert_called_once()
    assert result["data"] == "result"

@pytest.mark.asyncio
async def test_async_context_manager():
    """Test with async context manager mock."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)
    mock_session.query.return_value = [{"id": 1}]

    with patch("mypackage.get_session", return_value=mock_session):
        result = await fetch_users()
        assert len(result) == 1
```

### Testing FastAPI Endpoints

```python
from fastapi.testclient import TestClient
import pytest

@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)

def test_create_item(client):
    """Test POST endpoint."""
    response = client.post("/items/", json={"name": "Widget", "price": 9.99})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget"

def test_get_item_not_found(client):
    """Test 404 response."""
    response = client.get("/items/99999")
    assert response.status_code == 404

# Async FastAPI with httpx
@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_async_create_item(async_client):
    response = await async_client.post("/items/", json={"name": "Widget"})
    assert response.status_code == 201
```

## Exception and Side-Effect Testing

### Testing Exception Details

```python
def test_exception_message():
    """Test specific exception message."""
    with pytest.raises(ValueError) as exc_info:
        validate_age(-1)

    assert "Age must be positive" in str(exc_info.value)
    assert exc_info.value.args[0] == "Age must be positive, got -1"

def test_exception_type_hierarchy():
    """Test exception type hierarchy."""
    with pytest.raises(DatabaseError) as exc_info:
        query_database("INVALID SQL")

    # Check it's the right subtype
    assert isinstance(exc_info.value, ConnectionError)
    assert exc_info.value.code == 500
```

### Testing Side Effects

```python
def test_function_calls_side_effect(mocker):
    """Test that side effects happen (using pytest-mock)."""
    mock_email = mocker.patch("mypackage.send_email")
    mock_cache = mocker.patch("mypackage.cache.invalidate")

    create_user(email="alice@example.com")

    mock_email.assert_called_once_with(
        to="alice@example.com",
        subject="Welcome"
    )
    mock_cache.assert_called_once_with("users")

def test_database_writes(database):
    """Test database side effects."""
    create_user(name="Alice", db=database)

    user = database.query(User).filter(User.name == "Alice").first()
    assert user is not None
    assert user.name == "Alice"
```

### Testing File I/O Side Effects

```python
def test_writes_output_file(tmp_path):
    """Test file writing."""
    output_file = tmp_path / "output.csv"

    export_to_csv(data=[{"id": 1, "name": "Alice"}], path=output_file)

    assert output_file.exists()
    content = output_file.read_text()
    assert "Alice" in content
    assert "id,name" in content  # headers

def test_reads_config_file(tmp_path):
    """Test file reading."""
    config_file = tmp_path / "config.json"
    config_file.write_text('{"debug": true, "port": 8080}')

    config = load_config(config_file)

    assert config.debug is True
    assert config.port == 8080
```

## Test Organization

### Directory Structure

```
tests/
├── conftest.py              # Shared fixtures for all tests
├── unit/
│   ├── conftest.py          # Unit test fixtures
│   ├── test_models.py
│   ├── test_services.py
│   └── test_utils.py
├── integration/
│   ├── conftest.py          # Integration fixtures (DB, HTTP)
│   ├── test_api.py
│   └── test_database.py
└── e2e/
    ├── conftest.py
    └── test_user_flows.py
```

### Test Classes

```python
class TestUserService:
    """Tests for UserService class."""

    @pytest.fixture(autouse=True)
    def setup(self, database):
        """Run before each test in this class."""
        self.service = UserService(db=database)
        self.db = database

    def test_create_user(self):
        user = self.service.create(name="Alice", email="alice@example.com")
        assert user.id is not None
        assert user.name == "Alice"

    def test_create_user_duplicate_email(self):
        self.service.create(name="Alice", email="alice@example.com")
        with pytest.raises(DuplicateEmailError):
            self.service.create(name="Bob", email="alice@example.com")

    def test_get_user(self):
        created = self.service.create(name="Alice", email="alice@example.com")
        fetched = self.service.get(id=created.id)
        assert fetched.name == "Alice"

    def test_get_user_not_found(self):
        with pytest.raises(UserNotFoundError):
            self.service.get(id=99999)
```

### Organizing with Markers

```python
# Mark entire class
@pytest.mark.integration
class TestDatabaseIntegration:
    def test_connection(self, database):
        assert database.is_connected()

# Mark individual tests
@pytest.mark.slow
@pytest.mark.integration
def test_bulk_import():
    """Test importing 10000 records."""
    ...

# Conditional skip
@pytest.mark.skipif(
    not os.getenv("REDIS_URL"),
    reason="REDIS_URL not configured"
)
def test_redis_cache():
    ...
```

## Common Pattern: API Endpoint Testing

```python
# tests/integration/test_products_api.py
import pytest
from fastapi.testclient import TestClient
from myapp.main import app

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers(client):
    response = client.post("/auth/login", json={
        "email": "admin@test.com",
        "password": "testpass"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestProductsEndpoints:
    def test_list_products(self, client):
        response = client.get("/products/")
        assert response.status_code == 200
        assert isinstance(response.json()["data"], list)

    def test_create_product_authenticated(self, client, auth_headers):
        payload = {"name": "Widget", "price": 9.99, "stock": 100}
        response = client.post("/products/", json=payload, headers=auth_headers)
        assert response.status_code == 201
        product = response.json()
        assert product["name"] == "Widget"

    def test_create_product_unauthenticated(self, client):
        response = client.post("/products/", json={"name": "Widget"})
        assert response.status_code == 401

    def test_create_product_invalid_price(self, client, auth_headers):
        payload = {"name": "Widget", "price": -10}
        response = client.post("/products/", json=payload, headers=auth_headers)
        assert response.status_code == 422

    def test_delete_product(self, client, auth_headers):
        # Create first
        create_response = client.post(
            "/products/",
            json={"name": "Temp", "price": 1.00},
            headers=auth_headers
        )
        product_id = create_response.json()["id"]

        # Then delete
        delete_response = client.delete(
            f"/products/{product_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 204

        # Verify gone
        get_response = client.get(f"/products/{product_id}")
        assert get_response.status_code == 404
```

## Common Pattern: Database Testing

```python
# tests/integration/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from myapp.database import Base

@pytest.fixture(scope="session")
def engine():
    """Create test database engine."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)

@pytest.fixture
def db_session(engine):
    """Provide transactional database session."""
    Session = sessionmaker(bind=engine)
    session = Session()
    session.begin_nested()  # Savepoint for rollback

    yield session

    session.rollback()
    session.close()

# tests/integration/test_user_repository.py
class TestUserRepository:
    def test_save_and_retrieve(self, db_session):
        repo = UserRepository(db_session)
        user = User(name="Alice", email="alice@example.com")

        saved = repo.save(user)
        retrieved = repo.find_by_id(saved.id)

        assert retrieved.name == "Alice"

    def test_find_by_email(self, db_session):
        repo = UserRepository(db_session)
        repo.save(User(name="Alice", email="alice@example.com"))

        user = repo.find_by_email("alice@example.com")

        assert user is not None
        assert user.name == "Alice"

    def test_find_all_returns_all(self, db_session):
        repo = UserRepository(db_session)
        repo.save(User(name="Alice", email="a@test.com"))
        repo.save(User(name="Bob", email="b@test.com"))

        users = repo.find_all()
        assert len(users) == 2
```

## pytest Configuration

### pytest.ini

```ini
[pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*

# Output
addopts =
    --strict-markers
    --tb=short
    -v
    --cov=mypackage
    --cov-report=term-missing
    --cov-fail-under=80

# Custom markers
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: requires external services
    unit: pure unit tests

# asyncio
asyncio_mode = auto
```

### pyproject.toml

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "--strict-markers",
    "--tb=short",
    "-v",
    "--cov=mypackage",
    "--cov-report=term-missing",
    "--cov-fail-under=80",
]
markers = [
    "slow: marks tests as slow",
    "integration: requires external services",
    "unit: pure unit tests",
]
asyncio_mode = "auto"

[tool.coverage.run]
source = ["mypackage"]
omit = ["tests/*", "*/migrations/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

## CLI Quick Reference

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=mypackage --cov-report=term-missing

# Run specific test file
pytest tests/test_users.py

# Run specific test
pytest tests/test_users.py::TestUserService::test_create_user

# Run by marker
pytest -m unit
pytest -m "not slow"
pytest -m "integration and not slow"

# Run failed tests from last run
pytest --lf

# Run tests that contain keyword
pytest -k "user and not delete"

# Show locals on failure
pytest -l

# Stop after first failure
pytest -x

# Stop after N failures
pytest --maxfail=3

# Verbose output
pytest -v

# Show captured output even for passing tests
pytest -s

# Parallel execution (requires pytest-xdist)
pytest -n auto

# Generate HTML report
pytest --html=report.html --self-contained-html

# Update snapshots (requires pytest-snapshot)
pytest --snapshot-update
```

## Quick Reference

| Feature | Usage |
|---------|-------|
| Async test | `@pytest.mark.asyncio async def test_...` |
| Async fixture | `@pytest.fixture async def ...` |
| Async mock | `AsyncMock` from `unittest.mock` |
| File I/O | `tmp_path` builtin fixture |
| Test class | `class TestFoo:` with `@pytest.fixture(autouse=True) def setup` |
| Skip condition | `@pytest.mark.skipif(condition, reason=...)` |
| Expected fail | `@pytest.mark.xfail` |
| Parametrize IDs | `ids=[...]` parameter on `@pytest.mark.parametrize` |
| Coverage | `pytest --cov=pkg --cov-fail-under=80` |
| Parallel | `pytest -n auto` (pytest-xdist) |
