---
name: legacy-modernization
description: "Legacy code modernization: Strangler Fig Pattern, Anti-Corruption Layer, Branch-by-Abstraction, Module Strangling, inkrementeller Rewrite vs. Big Bang (Entscheidungsframework), Seams für Testbarkeit, Database Migration Strategy (Dual-Write, Read Shadow)."
---

# Legacy Modernization Skill

Every system becomes legacy. The question isn't whether to modernize — it's how to do it without breaking everything. This skill covers the patterns that let you replace legacy systems incrementally, safely, and in production.

## When to Activate

- Planning a rewrite or major architectural migration
- A module is too risky to change without breaking things
- Legacy code lacks tests and has accumulated years of hidden behavior
- Choosing between "big bang rewrite" and incremental migration
- Designing a migration from a monolith to services, or from legacy framework to modern one

---

## The Core Problem with Big Bang Rewrites

Netscape 2.0. The "next generation" platform that never shipped. The lesson: complete rewrites fail because:
1. The legacy system accumulated *behavior* (bugs, edge cases, undocumented rules) over years
2. The new system starts fresh and misses all of it
3. At "done", the systems don't behave the same — and you can't tell which is correct

**Rule**: Never rewrite from scratch if the legacy system is mission-critical. Strangle it instead.

---

## Strangler Fig Pattern

Inspired by the strangler fig tree that grows around a host tree until the host dies and the fig stands alone.

### Concept

```
           ┌─────────────┐
 Traffic → │ HTTP Proxy  │ → (routes by feature flag or path)
           └──────┬──────┘
                  │
        ┌─────────┴──────────┐
        │                    │
   [NEW SERVICE]       [LEGACY SYSTEM]
   (modern, tested)    (old, untested)
```

### Implementation Steps

**Step 1 — Install the proxy**

Add an HTTP proxy or API gateway in front of the legacy system. Initially, all traffic passes through unchanged.

```nginx
# Phase 1: all traffic to legacy
location / {
    proxy_pass http://legacy-service;
}
```

**Step 2 — Extract one capability**

Choose the smallest, most isolated capability to migrate first. Never the most important one first.

```nginx
# Phase 2: new service handles /api/v1/products, legacy handles everything else
location /api/v1/products {
    proxy_pass http://new-product-service;
}

location / {
    proxy_pass http://legacy-service;
}
```

**Step 3 — Shadow Mode (low-risk validation)**

Run both systems in parallel. Send traffic to new service, compare responses, serve legacy response to users.

```python
# Shadow mode: compare without exposing new system
async def shadow_request(request):
    legacy_response = await legacy.handle(request)
    try:
        new_response = await new_service.handle(request)
        compare_and_log(legacy_response, new_response)
    except Exception as e:
        log_comparison_failure(e)
    return legacy_response  # Always serve legacy result
```

**Step 4 — Canary (gradual traffic shift)**

```nginx
# Feature flag / percentage-based routing
upstream product_backend {
    server new-product-service weight=10;    # 10% new
    server legacy-service      weight=90;   # 90% legacy
}
```

**Step 5 — Full cutover + legacy deletion**

Monitor for 2+ weeks after 100% cutover. Then delete the legacy code. Don't leave it around "just in case" — it becomes zombie code.

---

## Anti-Corruption Layer (ACL)

When the legacy system has a different domain model (different names, concepts, structure), the ACL prevents the new system from inheriting the old model.

```
New System     ACL                    Legacy System
──────────     ───                    ─────────────
Customer   ←→  CustomerAdapter    ←→  Client
Order      ←→  OrderAdapter       ←→  SalesTransaction
Product    ←→  ProductAdapter     ←→  SKU
```

### Implementation

```java
// Legacy has "Client" with "ClientCode"; new system has "Customer" with "id"
@Component
public class CustomerAdapter {

    private final LegacyClientRepository legacyRepo;

    public Customer findById(CustomerId id) {
        LegacyClient legacyClient = legacyRepo.findByClientCode(id.value());
        return Customer.builder()
            .id(CustomerId.of(legacyClient.getClientCode()))
            .name(legacyClient.getFullName())  // legacy splits first/last, new uses fullName
            .email(legacyClient.getEmailAddress().toLowerCase()) // legacy stores mixed case
            .build();
    }
}
```

**Key principle**: The ACL translates concepts, not just data. It hides the legacy model from your new domain.

---

## Branch-by-Abstraction

Use when a module needs to be replaced but can't be cut over via proxy (e.g., library code, not a service).

### Steps

**1. Extract interface**
```java
// Before: code depends directly on LegacyPaymentGateway
public class OrderService {
    private LegacyPaymentGateway gateway;  // direct dependency

// After: extract interface
public interface PaymentGateway {
    PaymentResult charge(Money amount, PaymentMethod method);
    void refund(String transactionId);
}

// Legacy wrapped behind interface
public class LegacyPaymentGatewayAdapter implements PaymentGateway { ... }

// New implementation
public class StripePaymentGateway implements PaymentGateway { ... }
```

**2. Route via feature flag**
```java
// Inject based on configuration
@Bean
public PaymentGateway paymentGateway(FeatureFlags flags) {
    return flags.isEnabled("stripe-gateway")
        ? new StripePaymentGateway(...)
        : new LegacyPaymentGatewayAdapter(...);
}
```

**3. Run both in shadow mode (optional)**
**4. Graduate to 100% new**
**5. Delete old implementation and the feature flag**

---

## Seams for Testability (Michael Feathers)

Legacy code is often untestable because everything is hardwired. A *seam* is a place where you can change behavior without editing existing code.

### Object Seams (dependency injection)
```java
// Before: hardwired, untestable
public class OrderProcessor {
    private Database db = new MySQLDatabase(); // can't mock

// After: object seam via constructor injection
public class OrderProcessor {
    private final Database db;
    public OrderProcessor(Database db) { this.db = db; } // injectable
```

### Extract and Override (subclass seam)
When you can't inject — temporarily override in tests:
```java
// Subclass to control external call
class TestableOrderProcessor extends OrderProcessor {
    @Override
    protected void sendConfirmationEmail(Order order) {
        // Do nothing in tests
    }
}
```

### Sprout Class
When a method is too tangled to test — grow a new testable class:
```java
// Instead of modifying untested processOrder():
// 1. Write new TaxCalculator class with tests
// 2. Call it from processOrder()
// processOrder() itself still untested, but new logic is
```

---

## Incremental Rewrite vs. Big Bang — Decision Framework

| Factor | Favor Incremental | Favor Big Bang |
|--------|------------------|----------------|
| System size | Large (>100k LOC) | Small (<10k LOC) |
| Business criticality | High (revenue critical) | Low (internal tool) |
| Test coverage | Low (<20%) | High (>80%) |
| Team knowledge | Incomplete (key people gone) | Complete |
| Technology constraint | Greenfield available | Same stack possible |
| Time pressure | Low | Very high |
| Stakeholder tolerance | Low risk tolerance | High risk tolerance |

**Default**: If in doubt, choose incremental. The risk asymmetry favors it strongly.

---

## Module Strangling (Monolith to Modular)

Not just services — you can strangle within a monolith:

```
Phase 1: Extract interfaces for each domain module
Phase 2: Move implementations behind interfaces (with dependency injection)
Phase 3: Enforce module boundaries (ArchUnit, architecture-fitness functions)
Phase 4: Move each module to its own package or deployment unit
```

```java
// ArchUnit: enforce no cross-module dependencies
@AnalyzeClasses(packages = "com.myapp")
public class ArchitectureTest {
    @ArchTest
    static final ArchRule noOrderToUserDependency = noClasses()
        .that().resideInPackage("com.myapp.order..")
        .should().dependOnClassesThat()
        .resideInPackage("com.myapp.user.impl..");
        // user domain accessible only via user API package
}
```

---

## Database Migration Strategy

The hardest part of the Strangler Fig is the shared database.

### Dual-Write
New system writes to both old and new schema. Old system reads from old schema. Backfill complete → old system reads from new.

```python
def save_order(order):
    # Write to both schemas simultaneously
    legacy_db.save(to_legacy_format(order))
    new_db.save(order)
    # Verify both succeeded
```

### Read Shadow
New system reads from new DB but compares with legacy reads:
```python
def get_customer(id):
    new = new_db.find_customer(id)
    legacy = legacy_db.find_client(id)
    if not matches(new, legacy):
        log_discrepancy(id, new, legacy)
    return new  # serve new system's result
```

### Expand-Contract Pattern
1. **Expand**: Add new column (nullable), backfill
2. **Migrate**: Switch reads to new column
3. **Contract**: Remove old column

---

## Reference Skills

- `technical-debt` — quantifying and prioritizing what to modernize
- `resilience-patterns` — adding circuit breakers during migration to protect new services
- `/modernize` command — step-by-step modernization plan for a specific component
- `/debt-audit` command — inventory technical debt before deciding what to modernize
