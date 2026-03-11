---
name: django-tdd
description: Django testing strategies with pytest-django, TDD methodology, factory_boy, mocking, coverage, and testing Django REST Framework APIs.
---

# Django Testing with TDD

Test-driven development for Django applications using pytest, factory_boy, and Django REST Framework.

## When to Activate

- Writing new Django applications
- Implementing Django REST Framework APIs
- Testing Django models, views, and serializers
- Setting up testing infrastructure for Django projects
- Setting up factory_boy factories to replace manual test data creation and database fixtures
- Writing integration tests for a complete user flow through multiple Django views or API endpoints
- Configuring pytest-django with `--reuse-db` and `--nomigrations` to speed up a slow test suite

## TDD Workflow for Django

### Red-Green-Refactor Cycle

```python
# Step 1: RED - Write failing test
def test_user_creation():
    user = User.objects.create_user(email='test@example.com', password='testpass123')
    assert user.email == 'test@example.com'
    assert user.check_password('testpass123')
    assert not user.is_staff

# Step 2: GREEN - Make test pass
# Create User model or factory

# Step 3: REFACTOR - Improve while keeping tests green
```

## Setup

### pytest.ini

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
testpaths = tests
addopts = --reuse-db --nomigrations --cov=apps --cov-report=term-missing --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
```

### config/settings/test.py (key overrides)

```python
from .base import *
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
```

### conftest.py

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

@pytest.fixture
def user(db):
    return User.objects.create_user(email='test@example.com', password='testpass123', username='testuser')

@pytest.fixture
def authenticated_client(client, user):
    client.force_login(user)
    return client

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_api_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
```

## Factory Boy

```python
# tests/factories.py
import factory
from factory import fuzzy
from django.contrib.auth import get_user_model
from apps.products.models import Product, Category

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.Sequence(lambda n: f"user{n}")
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True

class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product
    name = factory.Faker('sentence', nb_words=3)
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))
    price = fuzzy.FuzzyDecimal(10.00, 1000.00, 2)
    stock = fuzzy.FuzzyInteger(0, 100)
    is_active = True
    category = factory.SubFactory(lambda: CategoryFactory())
    created_by = factory.SubFactory(UserFactory)

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if create and extracted:
            for tag in extracted:
                self.tags.add(tag)
```

Key patterns: `ProductFactory(price=99)` overrides fields, `ProductFactory.create_batch(10)` for bulk, `ProductFactory(tags=[t1, t2])` for M2M via `@post_generation`.

## Model Testing

### Model Tests

```python
# tests/test_models.py
import pytest
from django.core.exceptions import ValidationError
from tests.factories import UserFactory, ProductFactory

class TestUserModel:
    """Test User model."""

    def test_create_user(self, db):
        """Test creating a regular user."""
        user = UserFactory(email='test@example.com')
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self, db):
        """Test creating a superuser."""
        user = UserFactory(
            email='admin@example.com',
            is_staff=True,
            is_superuser=True
        )
        assert user.is_staff
        assert user.is_superuser

    def test_user_str(self, db):
        """Test user string representation."""
        user = UserFactory(email='test@example.com')
        assert str(user) == 'test@example.com'

class TestProductModel:
    """Test Product model."""

    def test_product_creation(self, db):
        """Test creating a product."""
        product = ProductFactory()
        assert product.id is not None
        assert product.is_active is True
        assert product.created_at is not None

    def test_product_slug_generation(self, db):
        """Test automatic slug generation."""
        product = ProductFactory(name='Test Product')
        assert product.slug == 'test-product'

    def test_product_price_validation(self, db):
        """Test price cannot be negative."""
        product = ProductFactory(price=-10)
        with pytest.raises(ValidationError):
            product.full_clean()

    def test_product_manager_active(self, db):
        """Test active manager method."""
        ProductFactory.create_batch(5, is_active=True)
        ProductFactory.create_batch(3, is_active=False)

        active_count = Product.objects.active().count()
        assert active_count == 5

    def test_product_stock_management(self, db):
        """Test stock management."""
        product = ProductFactory(stock=10)
        product.reduce_stock(5)
        product.refresh_from_db()
        assert product.stock == 5

        with pytest.raises(ValueError):
            product.reduce_stock(10)  # Not enough stock
```

## View Testing

### Django View Testing

```python
# tests/test_views.py
import pytest
from django.urls import reverse
from tests.factories import ProductFactory, UserFactory

class TestProductViews:
    """Test product views."""

    def test_product_list(self, client, db):
        """Test product list view."""
        ProductFactory.create_batch(10)

        response = client.get(reverse('products:list'))

        assert response.status_code == 200
        assert len(response.context['products']) == 10

    def test_product_detail(self, client, db):
        """Test product detail view."""
        product = ProductFactory()

        response = client.get(reverse('products:detail', kwargs={'slug': product.slug}))

        assert response.status_code == 200
        assert response.context['product'] == product

    def test_product_create_requires_login(self, client, db):
        """Test product creation requires authentication."""
        response = client.get(reverse('products:create'))

        assert response.status_code == 302
        assert response.url.startswith('/accounts/login/')

    def test_product_create_authenticated(self, authenticated_client, db):
        """Test product creation as authenticated user."""
        response = authenticated_client.get(reverse('products:create'))

        assert response.status_code == 200

    def test_product_create_post(self, authenticated_client, db, category):
        """Test creating a product via POST."""
        data = {
            'name': 'Test Product',
            'description': 'A test product',
            'price': '99.99',
            'stock': 10,
            'category': category.id,
        }

        response = authenticated_client.post(reverse('products:create'), data)

        assert response.status_code == 302
        assert Product.objects.filter(name='Test Product').exists()
```

## DRF API Testing

### Serializer Testing

```python
def test_serialize_product(self, db):
    product = ProductFactory()
    data = ProductSerializer(product).data
    assert data['id'] == product.id and data['name'] == product.name

def test_invalid_price(self, db):
    serializer = ProductSerializer(data={'name': 'X', 'price': '-10', 'stock': 5})
    assert not serializer.is_valid()
    assert 'price' in serializer.errors
```

### API ViewSet Testing

```python
# tests/test_api.py
import pytest
from rest_framework import status
from django.urls import reverse
from tests.factories import ProductFactory

class TestProductAPI:

    def test_list_products(self, api_client, db):
        ProductFactory.create_batch(10)
        response = api_client.get(reverse('api:product-list'))
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 10

    def test_create_product_unauthorized(self, api_client, db):
        response = api_client.post(reverse('api:product-list'), {'name': 'X', 'price': '9.99'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_product_authorized(self, authenticated_api_client, db):
        data = {'name': 'Test Product', 'price': '99.99', 'stock': 10}
        response = authenticated_api_client.post(reverse('api:product-list'), data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Product'

    def test_update_product(self, authenticated_api_client, db):
        product = ProductFactory(created_by=authenticated_api_client.user)
        response = authenticated_api_client.patch(
            reverse('api:product-detail', kwargs={'pk': product.id}), {'name': 'Updated'}
        )
        assert response.status_code == status.HTTP_200_OK

    def test_delete_product(self, authenticated_api_client, db):
        product = ProductFactory(created_by=authenticated_api_client.user)
        response = authenticated_api_client.delete(
            reverse('api:product-detail', kwargs={'pk': product.id})
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_price(self, api_client, db):
        ProductFactory(price=50); ProductFactory(price=150)
        response = api_client.get(reverse('api:product-list'), {'price_min': 100})
        assert response.data['count'] == 1
```

## Mocking and Patching

### Mocking External Services

```python
# tests/test_views.py
from unittest.mock import patch, Mock
import pytest

class TestPaymentView:
    """Test payment view with mocked payment gateway."""

    @patch('apps.payments.services.stripe')
    def test_successful_payment(self, mock_stripe, client, user, product):
        """Test successful payment with mocked Stripe."""
        # Configure mock
        mock_stripe.Charge.create.return_value = {
            'id': 'ch_123',
            'status': 'succeeded',
            'amount': 9999,
        }

        client.force_login(user)
        response = client.post(reverse('payments:process'), {
            'product_id': product.id,
            'token': 'tok_visa',
        })

        assert response.status_code == 302
        mock_stripe.Charge.create.assert_called_once()

    @patch('apps.payments.services.stripe')
    def test_failed_payment(self, mock_stripe, client, user, product):
        """Test failed payment."""
        mock_stripe.Charge.create.side_effect = Exception('Card declined')

        client.force_login(user)
        response = client.post(reverse('payments:process'), {
            'product_id': product.id,
            'token': 'tok_visa',
        })

        assert response.status_code == 302
        assert 'error' in response.url
```

### Mocking Email Sending

```python
# tests/test_email.py
from django.core import mail
from django.test import override_settings

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
def test_order_confirmation_email(db, order):
    """Test order confirmation email."""
    order.send_confirmation_email()

    assert len(mail.outbox) == 1
    assert order.user.email in mail.outbox[0].to
    assert 'Order Confirmation' in mail.outbox[0].subject
```

## Integration Testing

### Full Flow Testing

Integration tests exercise a complete user journey across multiple views. Use `client` (Django test client) and mock only external I/O (payment gateways, emails).

```python
def test_guest_to_purchase_flow(self, client, db):
    # Register → Login → Browse → Add to cart → Checkout
    client.post(reverse('users:register'), {'email': 'test@example.com', 'password': 'testpass123', 'password_confirm': 'testpass123'})
    client.post(reverse('users:login'), {'email': 'test@example.com', 'password': 'testpass123'})
    product = ProductFactory(price=100)
    client.post(reverse('cart:add'), {'product_id': product.id, 'quantity': 1})
    response = client.get(reverse('checkout:review'))
    assert product.name in response.content.decode()

    with patch('apps.checkout.services.process_payment', return_value=True):
        response = client.post(reverse('checkout:complete'))
    assert response.status_code == 302
    assert Order.objects.filter(user__email='test@example.com').exists()
```

## Testing Best Practices

### DO

- **Use factories**: Instead of manual object creation
- **One assertion per test**: Keep tests focused
- **Descriptive test names**: `test_user_cannot_delete_others_post`
- **Test edge cases**: Empty inputs, None values, boundary conditions
- **Mock external services**: Don't depend on external APIs
- **Use fixtures**: Eliminate duplication
- **Test permissions**: Ensure authorization works
- **Keep tests fast**: Use `--reuse-db` and `--nomigrations`

### DON'T

- **Don't test Django internals**: Trust Django to work
- **Don't test third-party code**: Trust libraries to work
- **Don't ignore failing tests**: All tests must pass
- **Don't make tests dependent**: Tests should run in any order
- **Don't over-mock**: Mock only external dependencies
- **Don't test private methods**: Test public interface
- **Don't use production database**: Always use test database

## Coverage

### Coverage Configuration

```bash
# Run tests with coverage
pytest --cov=apps --cov-report=html --cov-report=term-missing

# Generate HTML report
open htmlcov/index.html
```

### Coverage Goals

| Component | Target Coverage |
|-----------|-----------------|
| Models | 90%+ |
| Serializers | 85%+ |
| Views | 80%+ |
| Services | 90%+ |
| Utilities | 80%+ |
| Overall | 80%+ |

## Quick Reference

| Pattern | Usage |
|---------|-------|
| `@pytest.mark.django_db` | Enable database access |
| `client` | Django test client |
| `api_client` | DRF API client |
| `factory.create_batch(n)` | Create multiple objects |
| `patch('module.function')` | Mock external dependencies |
| `override_settings` | Temporarily change settings |
| `force_authenticate()` | Bypass authentication in tests |
| `assertRedirects` | Check for redirects |
| `assertTemplateUsed` | Verify template usage |
| `mail.outbox` | Check sent emails |

Remember: Tests are documentation. Good tests explain how your code should work. Keep them simple, readable, and maintainable.
