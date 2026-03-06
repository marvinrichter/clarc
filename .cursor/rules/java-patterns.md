---
description: "Java patterns extending common rules"
globs: ["**/*.java", "**/pom.xml", "**/build.gradle", "**/build.gradle.kts"]
alwaysApply: false
---
# Java Patterns

> This file extends the common patterns rule with Java 25+ / Spring Boot 4 specific content.

## Dependency Injection

Use constructor injection — never field injection (`@Autowired` on fields):

```java
@Service
class MarketService {
    private final MarketRepository marketRepository;

    MarketService(MarketRepository marketRepository) {
        this.marketRepository = marketRepository;
    }
}
```

## Hexagonal Architecture (Ports & Adapters)

```
domain/
  model/        # Entities, value objects, aggregates — NO framework deps
  port/
    in/         # Input port interfaces (use case contracts)
    out/        # Output port interfaces (repository, external services)
  event/        # Domain events
application/
  usecase/      # Use case implementations — orchestrate domain, call output ports
adapter/
  in/web/       # REST controllers (inbound adapter — calls input ports)
  out/persistence/ # JPA entities, repos, mappers (implements output ports)
config/         # Spring @Configuration, bean wiring only
```

### Key Rules

- **Domain has NO Spring annotations** (`@Service`, `@Component`, `@Autowired`, `@Entity` forbidden in `domain/`)
- **Controllers** depend only on input port interfaces — never on use case classes directly
- **Domain entities ≠ JPA entities** — use separate JPA entities in `adapter/out/persistence/` with mappers
- **Adapters never depend on each other** — only on domain ports

## DDD Building Blocks

- **Value Objects**: Immutable, equality by value. Use records: `public record Money(BigDecimal amount, Currency currency) {}`
- **Entities**: Identity by ID. Behavior in entity, not in use case: `market.publish()` not `service.setMarketActive()`
- **Aggregates**: One transaction = one aggregate root. Reference other aggregates by ID only
- **Domain Events**: Immutable facts raised inside aggregate: `public record MarketPublishedEvent(MarketId id, Instant occurredAt) implements DomainEvent {}`

## Optional

```java
return marketRepository.findBySlug(slug)
    .map(MarketDto::from)
    .orElseThrow(() -> new MarketNotFoundException(slug));
```

## Reference

See skills: `ddd-java`, `hexagonal-java`, `java-coding-standards`, `springboot-patterns`, `jpa-patterns` for comprehensive examples.
