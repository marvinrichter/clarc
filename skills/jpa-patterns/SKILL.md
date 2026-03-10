---
name: jpa-patterns
description: JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagination, and pooling in Spring Boot.
---

# JPA/Hibernate Patterns

Use for persistence adapter implementation and performance tuning in Spring Boot.

> **DDD/Hexagonal context**: JPA entities in this skill live in `adapter/out/persistence/` — they are **persistence models**, not domain entities. Domain entities live in `domain/model/` and contain zero JPA annotations. A `MarketMapper` translates between the two. Never expose `MarketEntity` (JPA) outside the persistence adapter.

## When to Activate

- Designing JPA entities and table mappings
- Defining relationships (@OneToMany, @ManyToOne, @ManyToMany)
- Optimizing queries (N+1 prevention, fetch strategies, projections)
- Configuring transactions, auditing, or soft deletes
- Setting up pagination, sorting, or custom repository methods
- Tuning connection pooling (HikariCP) or second-level caching
- Debugging LazyInitializationException or slow query performance issues

## Entity Design

```java
@Entity
@Table(name = "markets", indexes = {
  @Index(name = "idx_markets_slug",       columnList = "slug",             unique = true),
  @Index(name = "idx_markets_status_ts",  columnList = "status, created_at")
})
@EntityListeners(AuditingEntityListener.class)
public class MarketEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, unique = true, length = 120)
  private String slug;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MarketStatus status = MarketStatus.DRAFT;

  @CreatedDate  private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;

  // Always initialize collection fields — prevents NullPointerException
  @OneToMany(mappedBy = "market", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<PositionEntity> positions = new ArrayList<>();
}
```

Enable auditing:
```java
@Configuration
@EnableJpaAuditing
class JpaConfig {}
```

## Relationships

### @OneToMany / @ManyToOne (Bidirectional)

```java
// Parent side
@OneToMany(mappedBy = "market", cascade = CascadeType.ALL, orphanRemoval = true)
private List<PositionEntity> positions = new ArrayList<>();

// Convenience methods to keep both sides in sync
public void addPosition(PositionEntity pos) {
    positions.add(pos);
    pos.setMarket(this);
}

public void removePosition(PositionEntity pos) {
    positions.remove(pos);
    pos.setMarket(null);
}

// Child side
@ManyToOne(fetch = FetchType.LAZY)   // Always LAZY on @ManyToOne
@JoinColumn(name = "market_id", nullable = false)
private MarketEntity market;
```

### @ManyToMany

```java
@Entity
public class UserEntity {
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<RoleEntity> roles = new HashSet<>();
}

// Use Set for @ManyToMany to avoid duplicate rows and better performance
```

### @OneToOne (Shared Primary Key)

```java
@Entity
public class UserProfileEntity {
    @Id
    private Long id;  // Same as UserEntity.id

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id")
    private UserEntity user;
}
```

## N+1 Prevention

```java
// N+1 BAD: separate query per market to load positions
List<MarketEntity> markets = repo.findAll();
markets.forEach(m -> m.getPositions().size());  // N additional queries!

// GOOD: fetch join in JPQL
@Query("select m from MarketEntity m left join fetch m.positions where m.status = :status")
List<MarketEntity> findActiveWithPositions(@Param("status") MarketStatus status);

// GOOD: @EntityGraph for selective loading
@EntityGraph(attributePaths = {"positions", "categories"})
List<MarketEntity> findByStatus(MarketStatus status);

// GOOD: DTO projection — no entity loading at all
@Query("""
    select new com.example.MarketSummaryDto(m.id, m.name, m.status, count(p))
    from MarketEntity m left join m.positions p
    where m.status = :status
    group by m.id, m.name, m.status
""")
List<MarketSummaryDto> findSummaries(@Param("status") MarketStatus status);
```

## Repository Patterns

### Spring Data Query Methods

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
    // Derived queries
    Optional<MarketEntity> findBySlug(String slug);
    List<MarketEntity> findByStatusOrderByCreatedAtDesc(MarketStatus status);
    long countByStatus(MarketStatus status);
    boolean existsBySlug(String slug);

    // JPQL — prefer over native SQL for portability
    @Query("select m from MarketEntity m where m.status = :status")
    Page<MarketEntity> findByStatus(@Param("status") MarketStatus status, Pageable pageable);

    // Bulk update — bypass entity loading
    @Modifying
    @Query("update MarketEntity m set m.status = :status where m.id in :ids")
    int updateStatusForIds(@Param("status") MarketStatus status, @Param("ids") List<Long> ids);
}
```

### Interface-Based Projections

```java
// Column projections — only fetch what you need
public interface MarketSummary {
    Long getId();
    String getName();
    MarketStatus getStatus();
    Instant getCreatedAt();
}

Page<MarketSummary> findAllProjectedBy(Pageable pageable);
```

### Record-Based Projections (Java 16+)

```java
public record MarketDto(Long id, String name, MarketStatus status) {}

@Query("select new com.example.MarketDto(m.id, m.name, m.status) from MarketEntity m")
List<MarketDto> findAllAsDto();
```

## Transactions

```java
// Service layer: @Transactional on methods
@Service
@Transactional(readOnly = true)  // Default readOnly for all methods
public class MarketQueryService {

    public Page<MarketSummary> findAll(Pageable pageable) {
        return repo.findAllProjectedBy(pageable);
    }

    @Transactional  // Override for write methods
    public Market updateStatus(Long id, MarketStatus newStatus) {
        MarketEntity entity = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Market " + id));
        entity.setStatus(newStatus);  // Dirty checking — no explicit save() needed
        return mapper.toDomain(entity);
    }

    @Transactional
    public void deleteById(Long id) {
        if (!repo.existsById(id)) throw new EntityNotFoundException("Market " + id);
        repo.deleteById(id);
    }
}
```

### Transaction Propagation

```java
// REQUIRED (default): join existing or create new
@Transactional(propagation = Propagation.REQUIRED)

// REQUIRES_NEW: always create new (independent transaction)
// Use for audit logging that must persist even if outer tx rolls back
@Transactional(propagation = Propagation.REQUIRES_NEW)

// NOT_SUPPORTED: suspend outer transaction
@Transactional(propagation = Propagation.NOT_SUPPORTED)
```

## Optimistic Locking

Prevent lost updates in concurrent writes:

```java
@Entity
public class MarketEntity {
    @Version
    private Long version;  // Hibernate increments on every update
    // Throws OptimisticLockException if stale version detected
}
```

## Soft Deletes

```java
@Entity
@SQLDelete(sql = "UPDATE markets SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")  // Hibernate 6.3+; was @Where in older versions
public class MarketEntity {
    @Column(name = "deleted_at")
    private Instant deletedAt;
}

// repo.delete(entity)  → sets deleted_at, doesn't physically delete
// repo.findAll()       → automatically filters out deleted rows
```

## Pagination

```java
// Offset pagination
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<MarketEntity> result = repo.findByStatus(MarketStatus.ACTIVE, page);

// Page response metadata
result.getTotalElements();
result.getTotalPages();
result.hasNext();

// Keyset/cursor pagination for deep pages (more efficient)
@Query("""
    select m from MarketEntity m
    where m.status = :status
      and (m.createdAt < :cursor or (m.createdAt = :cursor and m.id < :lastId))
    order by m.createdAt desc, m.id desc
""")
List<MarketEntity> findPage(
    @Param("status") MarketStatus status,
    @Param("cursor") Instant cursor,
    @Param("lastId") Long lastId,
    Pageable pageable
);
```

## Batch Operations

```java
// Batch insert
@Transactional
public void bulkCreate(List<MarketEntity> entities) {
    repo.saveAll(entities);  // With hibernate.jdbc.batch_size=50
}

// Efficient bulk update — no entity loading
@Transactional
public void deactivateExpired(Instant cutoff) {
    int updated = repo.updateStatusForIds(MarketStatus.CLOSED, findExpiredIds(cutoff));
    log.info("Deactivated {} expired markets", updated);
}
```

## Indexing and Performance

```java
// Composite index matching common query patterns
@Table(name = "markets", indexes = {
    @Index(columnList = "status"),                     // filter by status
    @Index(columnList = "status, created_at DESC"),    // status + sort by date
    @Index(columnList = "user_id, status"),            // per-user filtered list
    @Index(columnList = "slug", unique = true),        // slug lookup
})
```

Config for N+1 detection in development:
```yaml
# application-dev.yml
spring.jpa.properties:
  hibernate.generate_statistics: true
logging.level:
  org.hibernate.SQL: DEBUG
  org.hibernate.orm.jdbc.bind: TRACE
```

## Connection Pooling (HikariCP)

```yaml
spring.datasource.hikari:
  maximum-pool-size: 20      # cpu_cores * 2 + disk_spindles (rule of thumb)
  minimum-idle: 5
  connection-timeout: 30000  # 30s — fail fast
  idle-timeout: 600000       # 10m
  max-lifetime: 1800000      # 30m — must be < DB timeout
  validation-timeout: 5000
  # PostgreSQL specific
  data-source-properties:
    applicationName: my-service

# PostgreSQL LOB handling
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation: true
```

## Migrations

- Use Flyway or Liquibase; never rely on `hibernate.ddl-auto=create` in production
- Name migrations: `V{version}__{description}.sql` (e.g., `V002__add_market_slug_index.sql`)
- Migrations are additive — never rename/drop columns without a plan
- Test migrations in CI against a real database (Testcontainers)

```yaml
spring.flyway:
  enabled: true
  locations: classpath:db/migration
  baseline-on-migrate: true   # For existing databases
```

## Testing Data Access

- Use `@DataJpaTest` with Testcontainers (`@ServiceConnection`)
- Assert N+1 with Hibernate statistics in tests
- Use `TestEntityManager.flush()` to flush before querying

**Remember**: JPA entities are persistence adapters — keep them separate from domain entities. Keep queries intentional, transactions short, and N+1 eliminated. Index for your actual read/write paths.

For domain entity modeling (Aggregates, Value Objects), see skill: `ddd-java`.
