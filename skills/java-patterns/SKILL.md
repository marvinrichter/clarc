---
name: java-patterns
description: "Java coding standards and idioms for Java 25+ — naming, immutability, Optional, streams, exceptions, generics, records, sealed classes. Applies to plain Java, Spring Boot, Quarkus, and Jakarta EE projects."
---

# Java Coding Standards

Standards for readable, maintainable Java (25+) code. Applies to any Java project — plain Java, Spring Boot, Quarkus, or Jakarta EE.

## When to Activate

- Writing or reviewing Java code in any Java 25+ project
- Enforcing naming, immutability, or exception handling conventions
- Working with records, sealed classes, or pattern matching (Java 25+)
- Reviewing use of Optional, streams, or generics
- Structuring packages and project layout

## Core Principles

- Prefer clarity over cleverness
- Immutable by default; minimize shared mutable state
- Fail fast with meaningful exceptions
- Consistent naming and package structure

## Naming

```java
// ✅ Classes/Records: PascalCase
public class MarketService {}
public record Money(BigDecimal amount, Currency currency) {}

// ✅ Methods/fields: camelCase
private final MarketRepository marketRepository;
public Market findBySlug(String slug) {}

// ✅ Constants: UPPER_SNAKE_CASE
private static final int MAX_PAGE_SIZE = 100;
```

## Immutability

```java
// ✅ Favor records and final fields
public record MarketDto(Long id, String name, MarketStatus status) {}

public class Market {
  private final Long id;
  private final String name;
  // getters only, no setters
}
```

## Optional Usage

```java
// ✅ Return Optional from find* methods
Optional<Market> market = marketRepository.findBySlug(slug);

// ✅ Map/flatMap instead of get()
return market
    .map(MarketResponse::from)
    .orElseThrow(() -> new EntityNotFoundException("Market not found"));
```

## Streams Best Practices

```java
// ✅ Use streams for transformations, keep pipelines short
List<String> names = markets.stream()
    .map(Market::name)
    .filter(Objects::nonNull)
    .toList();

// ❌ Avoid complex nested streams; prefer loops for clarity
```

## Exceptions

- Use unchecked exceptions for domain errors; wrap technical exceptions with context
- Create domain-specific exceptions (e.g., `MarketNotFoundException`)
- Avoid broad `catch (Exception ex)` unless rethrowing/logging centrally

```java
throw new MarketNotFoundException(slug);
```

## Generics and Type Safety

- Avoid raw types; declare generic parameters
- Prefer bounded generics for reusable utilities

```java
public <T extends Identifiable> Map<Long, T> indexById(Collection<T> items) { ... }
```

## Project Structure (Hexagonal / Ports & Adapters)

```
src/main/java/com/example/app/
  domain/
    model/          # Entities, value objects, aggregates (NO framework annotations)
    port/
      in/           # Input port interfaces (use case contracts)
      out/          # Output port interfaces (repository, external service contracts)
    event/          # Domain events
  application/
    usecase/        # Use case implementations (@Transactional here)
  adapter/
    in/
      web/          # REST controllers + request/response DTOs
      messaging/    # Message consumers
    out/
      persistence/  # JPA entities, Spring Data repos, mappers
      client/       # External API clients
  config/           # Spring @Configuration, bean wiring only
src/main/resources/
  application.yml
src/test/java/...   # mirrors main
```

## Formatting and Style

- Use 2 or 4 spaces consistently (project standard)
- One public top-level type per file
- Keep methods short and focused; extract helpers
- Order members: constants, fields, constructors, public methods, protected, private

## Code Smells to Avoid

- Long parameter lists → use DTO/builders
- Deep nesting → early returns
- Magic numbers → named constants
- Static mutable state → prefer dependency injection
- Silent catch blocks → log and act or rethrow

## Logging

```java
private static final Logger log = LoggerFactory.getLogger(MarketService.class);
log.info("fetch_market slug={}", slug);
log.error("failed_fetch_market slug={}", slug, ex);
```

## Null Handling

- Accept `@Nullable` only when unavoidable; otherwise use `@NonNull`
- Use Bean Validation (`@NotNull`, `@NotBlank`) on inputs

## Testing Expectations

- JUnit 5 + AssertJ for fluent assertions
- Mockito for mocking; avoid partial mocks where possible
- Favor deterministic tests; no hidden sleeps

## Java 25 Features to Prefer

Use these Java 25 LTS features in new code:

```java
// Virtual Threads (Project Loom, stable since Java 21) — for I/O-bound concurrency
// In Spring Boot 4: enable via spring.threads.virtual.enabled=true in application.yml
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> callExternalApi());
}

// Pattern matching in switch (stable since Java 21)
String describe(Object obj) {
    return switch (obj) {
        case Integer i -> "int: " + i;
        case String s when s.isBlank() -> "blank string";
        case String s -> "string: " + s;
        default -> "other";
    };
}

// Unnamed variables _ (stable since Java 22, JEP 456) — discard unused bindings
try {
    return compute();
} catch (IOException _) {   // exception variable intentionally unused
    return Optional.empty();
}

// Also in patterns — ignore fields you don't need:
if (obj instanceof Point(int x, _)) {   // y coordinate unused
    return x;
}

// Unnamed patterns in switch:
return switch (shape) {
    case Circle c -> c.area();
    case Rectangle _ -> 0;   // rectangles handled elsewhere
};

// Sequenced collections (stable since Java 21)
SequencedCollection<String> items = new ArrayList<>(List.of("a", "b", "c"));
items.getFirst(); // instead of items.get(0)
items.getLast();  // instead of items.get(items.size() - 1)
```

## Anti-Patterns

### Calling `Optional.get()` Without Checking Presence

**Wrong:**
```java
Optional<User> user = userRepository.findByEmail(email);
return user.get().getName();  // throws NoSuchElementException if empty
```

**Correct:**
```java
return userRepository.findByEmail(email)
    .map(User::getName)
    .orElseThrow(() -> new UserNotFoundException(email));
```

**Why:** `Optional.get()` on an empty Optional throws an uninformative exception; `orElseThrow` makes the failure explicit and provides a meaningful domain error.

---

### Using Raw Types Instead of Generics

**Wrong:**
```java
List users = new ArrayList();        // raw type — no compile-time safety
users.add("not a user");             // silently accepted
User u = (User) users.get(0);        // ClassCastException at runtime
```

**Correct:**
```java
List<User> users = new ArrayList<>();
users.add(new User("Alice"));
User u = users.get(0);               // no cast needed, type-safe
```

**Why:** Raw types bypass the compiler's type-checker, moving errors that could be caught at compile time to unpredictable runtime failures.

---

### Catching `Exception` Broadly and Swallowing It

**Wrong:**
```java
try {
    return orderRepository.save(order);
} catch (Exception e) {
    return null;  // hides DataAccessException, NullPointerException, everything
}
```

**Correct:**
```java
try {
    return orderRepository.save(order);
} catch (DataAccessException e) {
    throw new OrderPersistenceException("Failed to save order: " + order.id(), e);
}
```

**Why:** Catching `Exception` silently discards programming bugs and infrastructure failures; catching a specific exception and re-throwing with context preserves the stack trace and makes the failure observable.

---

### Mutable Public Fields Instead of Records or Final Fields

**Wrong:**
```java
public class Money {
    public BigDecimal amount;   // mutable, no encapsulation
    public String currency;
}

Money price = new Money();
price.amount = new BigDecimal("9.99");
price.amount = price.amount.negate();  // any caller can mutate
```

**Correct:**
```java
public record Money(BigDecimal amount, String currency) {
    public Money {
        Objects.requireNonNull(amount, "amount");
        Objects.requireNonNull(currency, "currency");
    }

    public Money negate() {
        return new Money(amount.negate(), currency);  // returns new value
    }
}
```

**Why:** Mutable public fields break encapsulation and enable uncontrolled state changes; records provide an immutable value type with built-in `equals`, `hashCode`, and `toString`.

---

### Using `instanceof` Without Pattern Matching in Java 21+

**Wrong:**
```java
if (shape instanceof Circle) {
    Circle c = (Circle) shape;    // redundant cast
    return c.area();
}
```

**Correct:**
```java
if (shape instanceof Circle c) {  // binding variable in the pattern
    return c.area();
}

// Or with sealed types, prefer switch:
return switch (shape) {
    case Circle c    -> c.area();
    case Rectangle r -> r.width() * r.height();
};
```

**Why:** The old pattern repeats the type check and cast redundantly; pattern matching in `instanceof` and `switch` (stable since Java 21) eliminates the cast and is exhaustive with sealed types.

**Remember**: Keep code intentional, typed, and observable. Optimize for maintainability over micro-optimizations unless proven necessary.
