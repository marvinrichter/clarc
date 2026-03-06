---
name: django-patterns-advanced
description: Advanced Django patterns — service layer, caching, signals, middleware, performance optimization (N+1, bulk ops), and DDD patterns (fat models, bounded contexts, domain events). Extends django-patterns.
origin: ECC
---

# Django Advanced Patterns

> This skill extends [django-patterns](../django-patterns/SKILL.md) with service layer, caching, signals, middleware, performance, and DDD.

## When to Activate

- Implementing business logic separation (service layer)
- Optimizing Django ORM performance
- Using Django signals or custom middleware
- Applying DDD concepts in Django (bounded contexts, domain events)
- Production performance tuning

## Service Layer Pattern

```python
# apps/orders/services.py
from typing import Optional
from django.db import transaction
from .models import Order, OrderItem

class OrderService:
    """Service layer for order-related business logic."""

    @staticmethod
    @transaction.atomic
    def create_order(user, cart: Cart) -> Order:
        """Create order from cart."""
        order = Order.objects.create(
            user=user,
            total_price=cart.total_price
        )

        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price
            )

        # Clear cart
        cart.items.all().delete()

        return order

    @staticmethod
    def process_payment(order: Order, payment_data: dict) -> bool:
        """Process payment for order."""
        payment = PaymentGateway.charge(
            amount=order.total_price,
            token=payment_data['token']
        )

        if payment.success:
            order.status = Order.Status.PAID
            order.save()
            OrderService.send_confirmation_email(order)
            return True

        return False

    @staticmethod
    def send_confirmation_email(order: Order):
        """Send order confirmation email."""
        pass
```

## Caching Strategies

### View-Level Caching

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

@method_decorator(cache_page(60 * 15), name='dispatch')  # 15 minutes
class ProductListView(generic.ListView):
    model = Product
    template_name = 'products/list.html'
    context_object_name = 'products'
```

### Template Fragment Caching

```django
{% load cache %}
{% cache 500 sidebar %}
    ... expensive sidebar content ...
{% endcache %}
```

### Low-Level Caching

```python
from django.core.cache import cache

def get_featured_products():
    """Get featured products with caching."""
    cache_key = 'featured_products'
    products = cache.get(cache_key)

    if products is None:
        products = list(Product.objects.filter(is_featured=True))
        cache.set(cache_key, products, timeout=60 * 15)  # 15 minutes

    return products
```

### QuerySet Caching

```python
from django.core.cache import cache

def get_popular_categories():
    cache_key = 'popular_categories'
    categories = cache.get(cache_key)

    if categories is None:
        categories = list(Category.objects.annotate(
            product_count=Count('products')
        ).filter(product_count__gt=10).order_by('-product_count')[:20])
        cache.set(cache_key, categories, timeout=60 * 60)  # 1 hour

    return categories
```

## Signals

### Signal Patterns

```python
# apps/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create profile when user is created."""
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save profile when user is saved."""
    instance.profile.save()

# apps/users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'

    def ready(self):
        """Import signals when app is ready."""
        import apps.users.signals
```

## Middleware

### Custom Middleware

```python
# middleware/active_user_middleware.py
import time
from django.utils.deprecation import MiddlewareMixin

class ActiveUserMiddleware(MiddlewareMixin):
    """Middleware to track active users."""

    def process_request(self, request):
        """Process incoming request."""
        if request.user.is_authenticated:
            request.user.last_active = timezone.now()
            request.user.save(update_fields=['last_active'])

class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware for logging requests."""

    def process_request(self, request):
        """Log request start time."""
        request.start_time = time.time()

    def process_response(self, request, response):
        """Log request duration."""
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            logger.info(f'{request.method} {request.path} - {response.status_code} - {duration:.3f}s')
        return response
```

## Performance Optimization

### N+1 Query Prevention

```python
# Bad - N+1 queries
products = Product.objects.all()
for product in products:
    print(product.category.name)  # Separate query for each product

# Good - Single query with select_related
products = Product.objects.select_related('category').all()
for product in products:
    print(product.category.name)

# Good - Prefetch for many-to-many
products = Product.objects.prefetch_related('tags').all()
for product in products:
    for tag in product.tags.all():
        print(tag.name)
```

### Database Indexing

```python
class Product(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey('Category', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['category', 'created_at']),
        ]
```

### Bulk Operations

```python
# Bulk create
Product.objects.bulk_create([
    Product(name=f'Product {i}', price=10.00)
    for i in range(1000)
])

# Bulk update
products = Product.objects.all()[:100]
for product in products:
    product.is_active = True
Product.objects.bulk_update(products, ['is_active'])

# Bulk delete
Product.objects.filter(stock=0).delete()
```

## Quick Reference

| Pattern | Description |
|---------|-------------|
| Split settings | Separate dev/prod/test settings |
| Custom QuerySet | Reusable query methods |
| Service Layer | Business logic separation |
| ViewSet | REST API endpoints |
| Serializer validation | Request/response transformation |
| select_related | Foreign key optimization |
| prefetch_related | Many-to-many optimization |
| Cache first | Cache expensive operations |
| Signals | Event-driven actions |
| Middleware | Request/response processing |

## DDD Patterns in Django

> **Why not hexagonal?** Django's ORM models intentionally couple domain and persistence — they are both the data model and the persistence model. Separating them (hexagonal) means fighting the framework: no `save()`, no querysets, manual mappers everywhere. Use DDD concepts *within* Django's conventions instead.

### Apps as Bounded Contexts

Each Django app = one Bounded Context. Apps should be self-contained with their own models, views, and services:

```
apps/
  markets/         ← Market bounded context
    models.py      # Market, MarketStatus — the aggregate root
    services.py    # Use cases (business operations)
    views.py       # Inbound adapter (HTTP)
    serializers.py # DTO mapping
  orders/          ← Order bounded context
    models.py      # Order, OrderLine — separate aggregate root
    services.py
```

Cross-app references: use IDs or signals, not direct model imports where possible.

### Fat Models — Behavior in the Model

Django models with business behavior are DDD-aligned. Logic belongs in the model, not in the view or serializer:

```python
# apps/markets/models.py
from django.db import models
from django.core.exceptions import ValidationError


class Market(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    status = models.CharField(
        max_length=20,
        choices=[("DRAFT", "Draft"), ("ACTIVE", "Active"), ("SUSPENDED", "Suspended")],
        default="DRAFT",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # ✅ Domain behavior on the model — not in the view
    def publish(self) -> None:
        """Publish the market. Raises ValidationError if not in DRAFT state."""
        if self.status != "DRAFT":
            raise ValidationError(f"Cannot publish market '{self.slug}': status is {self.status}")
        self.status = "ACTIVE"
        self.save(update_fields=["status"])

    def suspend(self, reason: str) -> None:
        if self.status != "ACTIVE":
            raise ValidationError(f"Cannot suspend market '{self.slug}': not active")
        self.status = "SUSPENDED"
        self.save(update_fields=["status"])
        MarketSuspendedEvent.objects.create(market=self, reason=reason)

    class Meta:
        db_table = "markets"
```

### Service Layer as Use Cases

Services orchestrate multi-step operations, transactions, and cross-model coordination:

```python
# apps/markets/services.py
from django.db import transaction
from .models import Market


def create_market(name: str, slug: str, created_by_id: int) -> Market:
    """Use case: create a new market and notify the creator."""
    if not name.strip():
        raise ValueError("Market name is required")

    with transaction.atomic():
        market = Market.objects.create(name=name, slug=slug)
        _notify_market_created(market, created_by_id)
    return market


def publish_market(slug: str) -> Market:
    """Use case: publish a draft market."""
    market = Market.objects.select_for_update().get(slug=slug)
    market.publish()  # domain behavior on the model
    return market


def _notify_market_created(market: Market, user_id: int) -> None:
    pass
```

### Custom QuerySet as Repository Queries

```python
# apps/markets/models.py
class MarketQuerySet(models.QuerySet):
    def active(self):
        return self.filter(status="ACTIVE")

    def draft(self):
        return self.filter(status="DRAFT")

    def by_slug(self, slug: str):
        return self.filter(slug=slug)


class Market(models.Model):
    objects = MarketQuerySet.as_manager()
    # ...


# Usage — reads like domain language
active_markets = Market.objects.active().order_by("-created_at")[:20]
```

### Domain Events via Django Signals

```python
# apps/markets/signals.py
from django.dispatch import Signal, receiver

market_published = Signal()  # custom domain event signal


@receiver(market_published)
def on_market_published(sender, market, **kwargs):
    """Listener — lives in adapter (e.g., send notification)."""
    send_notification.delay(market.id)


# In Market.publish():
def publish(self) -> None:
    if self.status != "DRAFT":
        raise ValidationError(...)
    self.status = "ACTIVE"
    self.save(update_fields=["status"])
    market_published.send(sender=self.__class__, market=self)  # raise event
```

### Violation Checklist

- [ ] Business logic in views/serializers → move to model methods or services
- [ ] Direct `Market.objects` queries in views → move to service or custom QuerySet
- [ ] `market.status = "ACTIVE"` in view without calling `market.publish()` → bypasses invariants
- [ ] Cross-app model imports without ID-based decoupling → increases coupling between contexts
- [ ] `transaction.atomic()` missing for multi-step operations → consistency risk

Remember: Django provides many shortcuts, but for production applications, structure and organization matter more than concise code. Build for maintainability.
