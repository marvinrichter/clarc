---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
  - "**/settings.gradle"
  - "**/settings.gradle.kts"
---
# Java Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Java specific content.

## Formatting

- **google-java-format** or **Spotless** are mandatory — no style debates
- 2 or 4 spaces consistently (align with existing project standard)
- One public top-level type per file; filename matches class name

## Naming

```java
// Classes/Records/Interfaces/Enums: PascalCase
public class MarketService {}
public record Money(BigDecimal amount, Currency currency) {}

// Methods and fields: camelCase
private final MarketRepository marketRepository;
public Market findBySlug(String slug) {}

// Constants: UPPER_SNAKE_CASE
private static final int MAX_PAGE_SIZE = 100;

// Packages: lowercase, no underscores
package com.example.market.service;
```

## Immutability

- Prefer `record` for pure data carriers (Java 17+)
- Use `final` fields; no setters unless framework requires it
- Collections: return unmodifiable views (`List.copyOf`, `Collections.unmodifiableList`)

```java
public record MarketDto(Long id, String name, MarketStatus status) {}
```

## Error Handling

- Use unchecked exceptions for domain errors; wrap technical exceptions with context
- Create domain-specific exceptions (`MarketNotFoundException`)
- Avoid broad `catch (Exception ex)` unless logging centrally and rethrowing

```java
throw new MarketNotFoundException("Market not found: " + slug);
```

## Null Handling

- Use `@NonNull` / `@Nullable` annotations at API boundaries
- Prefer `Optional<T>` for return values that may be absent — never return `null` from public methods
- Use Bean Validation (`@NotNull`, `@NotBlank`) on inputs

## Project Structure (Hexagonal / Ports & Adapters)

```
src/main/java/com/example/app/
  domain/
    model/          # Entities, value objects, aggregates (no framework deps)
    port/
      in/           # Input port interfaces (use case contracts)
      out/          # Output port interfaces (repository, external service contracts)
    event/          # Domain events
  application/
    usecase/        # Use case implementations (@Transactional here, not in domain)
  adapter/
    in/
      web/          # REST controllers, request/response DTOs
      messaging/    # Message consumers
    out/
      persistence/  # JPA entities, Spring Data repos, mappers
      client/       # External API clients
  config/           # Spring @Configuration classes
src/main/resources/
  application.yml
src/test/java/...   # mirrors main
```

## Member Ordering

1. Constants (`static final`)
2. Fields
3. Constructors
4. Public methods
5. Package-private / protected methods
6. Private methods

## Code Smells to Avoid

- Long parameter lists → use DTOs or builders
- Deep nesting → early returns
- Magic numbers → named constants
- Static mutable state → prefer dependency injection
- Silent catch blocks → log and act or rethrow

## Reference

See skill: `java-coding-standards` for comprehensive Java idioms and patterns.
