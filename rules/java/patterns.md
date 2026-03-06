---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
---
# Java Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Java specific content.

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

## Builder Pattern

Use for objects with many optional fields. Prefer Lombok `@Builder` or Java records with static factories:

```java
@Builder
public class CreateMarketRequest {
    @NonNull private final String name;
    private final String description;
    private final MarketStatus status;
}

// Usage
CreateMarketRequest.builder().name("Test").status(ACTIVE).build();
```

## Records for Data Transfer

Use Java records (25+) for immutable DTOs and value objects:

```java
public record MarketDto(Long id, String name, MarketStatus status) {
    public static MarketDto from(Market market) {
        return new MarketDto(market.getId(), market.getName(), market.getStatus());
    }
}
```

## Hexagonal Architecture (Ports & Adapters)

```
domain/
  model/        # Entities, value objects, aggregates — NO framework dependencies
  port/
    in/         # Input ports: use case interfaces (driven by the outside world)
    out/         # Output ports: interfaces for persistence, external services
  event/         # Domain events

application/
  usecase/       # Use case implementations — orchestrate domain, call output ports

adapter/
  in/
    web/         # REST controllers (inbound adapter — calls input ports)
    messaging/   # Message consumers (Kafka, SQS, etc.)
  out/
    persistence/ # JPA repositories, entities, mappers (implements output ports)
    client/      # External API clients (implements output ports)

config/           # Spring configuration, bean wiring
```

### Key Rules

- **Domain has NO Spring annotations** (`@Service`, `@Component`, `@Autowired`, `@Entity` all forbidden in `domain/`)
- **Input ports** (`domain/port/in/`) are interfaces; implemented in `application/usecase/`
- **Output ports** (`domain/port/out/`) are interfaces; implemented in `adapter/out/`
- **Controllers** depend only on input port interfaces — never on use case classes directly
- **Domain entities ≠ JPA entities** — use separate JPA entities in `adapter/out/persistence/` with mappers
- **Adapters never depend on each other** — only on domain ports

### Example

```java
// domain/port/in/CreateMarketUseCase.java
public interface CreateMarketUseCase {
    Market create(CreateMarketCommand command);
}

// domain/port/out/MarketRepository.java
public interface MarketRepository {
    Market save(Market market);
    Optional<Market> findBySlug(String slug);
}

// application/usecase/CreateMarketService.java
@Transactional
public class CreateMarketService implements CreateMarketUseCase {
    private final MarketRepository marketRepository;  // output port — no JPA leak

    CreateMarketService(MarketRepository marketRepository) {
        this.marketRepository = marketRepository;
    }

    public Market create(CreateMarketCommand command) {
        var market = Market.create(command.name(), command.slug());
        return marketRepository.save(market);
    }
}

// adapter/in/web/MarketController.java
@RestController
@RequestMapping("/api/markets")
class MarketController {
    private final CreateMarketUseCase createMarket;  // input port only

    MarketController(CreateMarketUseCase createMarket) {
        this.createMarket = createMarket;
    }

    @PostMapping
    ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest req) {
        var market = createMarket.create(new CreateMarketCommand(req.name(), req.slug()));
        return ResponseEntity.status(CREATED).body(MarketResponse.from(market));
    }
}

// adapter/out/persistence/JpaMarketRepository.java
@Repository
class JpaMarketRepository implements MarketRepository {  // output port implementation
    private final MarketJpaRepository jpaRepo;

    JpaMarketRepository(MarketJpaRepository jpaRepo) {
        this.jpaRepo = jpaRepo;
    }

    public Market save(Market market) {
        MarketEntity entity = MarketMapper.toEntity(market);
        return MarketMapper.toDomain(jpaRepo.save(entity));
    }

    public Optional<Market> findBySlug(String slug) {
        return jpaRepo.findBySlug(slug).map(MarketMapper::toDomain);
    }
}
```

## DDD Building Blocks

### Value Objects
Immutable, equality by value, no identity. Use records:
```java
public record Money(BigDecimal amount, Currency currency) {
    public Money { Objects.requireNonNull(amount); Objects.requireNonNull(currency); }
    public Money add(Money other) { /* validate same currency, return new Money */ }
}
public record MarketId(Long value) {}   // typed ID — never pass raw Long as ID
```

### Entities
Identity by ID. **Behavior in entity, not in use case**:
```java
public class Market {
    public void publish() {
        if (status != DRAFT) throw new MarketAlreadyPublishedException(id);
        this.status = ACTIVE;
        domainEvents.add(new MarketPublishedEvent(id));
    }
}
// ❌ Never: use case sets market.setStatus("ACTIVE") directly
```

### Aggregate Rules
- **One transaction = one aggregate**
- **Reference other aggregates by ID only** — never by object reference
- **Repository per Aggregate Root** — no repository for child entities
- Invariants enforced inside aggregate; external code never bypasses the root

### Domain Services
Stateless domain logic that doesn't fit a single entity. Lives in `domain/service/`. No Spring annotations:
```java
// domain/service/PricingPolicy.java — pure Java, no @Service
public class PricingPolicy {
    public Money calculateFinalPrice(Order order, DiscountCode code) { ... }
}
```

### Domain Events
Immutable facts raised inside aggregate, dispatched by use case after save:
```java
public record MarketPublishedEvent(MarketId marketId, Instant occurredAt) implements DomainEvent {}
// Aggregate raises: domainEvents.add(new MarketPublishedEvent(id))
// Use case dispatches: market.pullDomainEvents().forEach(publisher::publishEvent)
```

### Ubiquitous Language
Class and method names must match domain expert vocabulary exactly:
- `market.publish()` not `market.setStatusToActive()`
- `order.place()` not `order.processOrder()`

## Optional Usage

```java
// Return Optional from find* methods
Optional<Market> findBySlug(String slug);

// Consume safely
return marketRepository.findBySlug(slug)
    .map(MarketDto::from)
    .orElseThrow(() -> new MarketNotFoundException(slug));
```

## Streams

Keep pipelines short and readable; prefer loops for complex multi-step logic:

```java
List<String> names = markets.stream()
    .filter(m -> m.status() == ACTIVE)
    .map(Market::name)
    .toList();
```

## Reference

See skills: `ddd-java`, `hexagonal-java`, `java-coding-standards`, `springboot-patterns`, `jpa-patterns` for comprehensive examples.
