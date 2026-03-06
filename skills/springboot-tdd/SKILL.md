---
name: springboot-tdd
description: Test-driven development for Spring Boot using JUnit 5, Mockito, MockMvc, Testcontainers, and JaCoCo. Use when adding features, fixing bugs, or refactoring.
---

# Spring Boot TDD Workflow

TDD guidance for Spring Boot services with 80%+ coverage (unit + integration).

## When to Use

- New features or endpoints
- Bug fixes or refactors
- Adding data access logic or security rules

## Workflow

1) Write tests first (they should fail)
2) Implement minimal code to pass
3) Refactor with tests green
4) Enforce coverage (JaCoCo)

## Unit Tests (JUnit 5 + Mockito)

In hexagonal architecture, unit-test use cases by mocking **output port interfaces** — not JPA classes:

```java
@ExtendWith(MockitoExtension.class)
class CreateMarketUseCaseTest {
  @Mock MarketRepository marketRepository;   // output port interface
  @InjectMocks CreateMarketService createMarket;

  @Test
  void create_savesMarket_andReturnsIt() {
    var command = new CreateMarketCommand("name", "name-slug");
    when(marketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Market result = createMarket.create(command);

    assertThat(result.name()).isEqualTo("name");
    verify(marketRepository).save(any());
  }

  @Test
  void create_withBlankName_throwsValidationException() {
    var command = new CreateMarketCommand("", "slug");
    assertThatThrownBy(() -> createMarket.create(command))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("name");
  }
}
```

Patterns:
- Arrange-Act-Assert
- Mock output ports (interfaces), never persistence adapters directly
- Avoid partial mocks; prefer explicit stubbing
- Use `@ParameterizedTest` for variants

## Parameterized Tests

```java
@ParameterizedTest
@ValueSource(strings = {"", " ", "\t"})
void create_rejectsBlankName(String blankName) {
    assertThatThrownBy(() -> createMarket.create(new CreateMarketCommand(blankName, "slug")))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("name");
}

@ParameterizedTest
@EnumSource(value = MarketStatus.class, names = {"SUSPENDED", "CLOSED"})
void publish_failsForNonDraftMarkets(MarketStatus status) {
    var market = marketBuilder().withStatus(status).build();
    when(marketRepository.findBySlug("slug")).thenReturn(Optional.of(market));

    assertThatThrownBy(() -> publishMarket.publish("slug"))
        .isInstanceOf(InvalidStateException.class);
}

@ParameterizedTest
@CsvSource({
    "100.0, STANDARD, 100.0",
    "100.0, SILVER,    95.0",
    "100.0, GOLD,      90.0",
})
void appliesCorrectDiscount(double price, CustomerTier tier, double expected) {
    assertThat(discountService.apply(price, tier)).isEqualTo(expected);
}
```

## ArgumentCaptor

Capture arguments passed to mocks for assertions on complex objects:

```java
@Test
void create_savesMarketWithCorrectSlug() {
    var command = new CreateMarketCommand("Test Market", "test-market");
    when(marketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    createMarket.create(command);

    var captor = ArgumentCaptor.forClass(Market.class);
    verify(marketRepository).save(captor.capture());
    assertThat(captor.getValue().slug()).isEqualTo("test-market");
    assertThat(captor.getValue().status()).isEqualTo(MarketStatus.DRAFT);
}
```

## Web Layer Tests (MockMvc)

Mock the **input port interface**, not the use case class:

```java
@WebMvcTest(MarketController.class)
class MarketControllerTest {
  @Autowired MockMvc mockMvc;
  @MockitoBean ListMarketsUseCase listMarkets;   // @MockitoBean replaces @MockBean in Spring Boot 3.4+

  @Test
  void returnsMarkets() throws Exception {
    when(listMarkets.list(any())).thenReturn(Page.empty());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }

  @Test
  void returnsMarket_bySlug() throws Exception {
    var market = new MarketDto(1L, "Test", "test", MarketStatus.ACTIVE);
    when(getMarket.findBySlug("test")).thenReturn(market);

    mockMvc.perform(get("/api/markets/test"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Test"))
        .andExpect(jsonPath("$.status").value("ACTIVE"));
  }
}
```

## Testing Error Responses

```java
@Test
void getMarket_returns404_whenNotFound() throws Exception {
    when(getMarket.findBySlug("unknown")).thenThrow(new MarketNotFoundException("unknown"));

    mockMvc.perform(get("/api/markets/unknown"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("https://api.example.com/errors/not-found"))
        .andExpect(jsonPath("$.title").value("Market Not Found"))
        .andExpect(jsonPath("$.status").value(404));
}

@Test
void createMarket_returns422_onValidationError() throws Exception {
    mockMvc.perform(post("/api/markets")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""{"name": "", "slug": "valid-slug"}"""))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.errors[?(@.field=='name')]").exists());
}
```

## Integration Tests (SpringBootTest)

```java
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfig.class)
@ActiveProfiles("test")
@Transactional
class MarketIntegrationTest {
  @Autowired MockMvc mockMvc;
  @Autowired MarketRepository marketRepository;

  @Test
  void createsMarket_andStoresInDb() throws Exception {
    var response = mockMvc.perform(post("/api/markets")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Test","slug":"test","endDate":"2030-01-01T00:00:00Z"}
        """))
      .andExpect(status().isCreated())
      .andReturn();

    var body = new ObjectMapper().readTree(response.getResponse().getContentAsString());
    long id = body.get("id").asLong();
    assertThat(marketRepository.findById(id)).isPresent();
  }
}
```

## Persistence Tests (DataJpaTest)

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestContainersConfig.class)
@Sql("/test-data/markets.sql")
class MarketRepositoryTest {
  @Autowired MarketRepository repo;
  @Autowired TestEntityManager em;

  @Test
  void savesAndFinds() {
    MarketEntity entity = new MarketEntity();
    entity.setName("Test");
    repo.save(entity);

    Optional<MarketEntity> found = repo.findByName("Test");
    assertThat(found).isPresent();
  }

  @Test
  void countByStatus_returnsAccurateCounts() {
    em.persist(new MarketEntity("Test", "test-slug", MarketStatus.ACTIVE));
    em.flush();
    assertThat(repo.countByStatus(MarketStatus.ACTIVE)).isGreaterThan(0);
  }
}
```

## Testcontainers (Full Setup)

```java
// TestContainersConfig.java
@TestConfiguration(proxyBeanMethods = false)
class TestContainersConfig {
    @Bean
    @ServiceConnection  // Spring Boot 3.1+: auto-configures datasource URL/credentials
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withReuse(true);  // ~/.testcontainers.properties: testcontainers.reuse.enable=true
    }
}
```

## Testing Security

```java
@WebMvcTest(MarketController.class)
class MarketControllerSecurityTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean ListMarketsUseCase listMarkets;

    @Test
    @WithMockUser(roles = "USER")
    void regularUser_cannotCreateMarket() throws Exception {
        mockMvc.perform(post("/api/markets")
            .contentType(APPLICATION_JSON)
            .content("""{"name":"test","slug":"test"}"""))
            .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/markets"))
            .andExpect(status().isUnauthorized());
    }
}
```

## Assertions

- Prefer AssertJ (`assertThat`) for readability
- For JSON responses, use `jsonPath`
- For exceptions: `assertThatThrownBy(...)`

```java
// Collection assertions
assertThat(result).hasSize(3)
    .extracting(User::name)
    .containsExactly("Alice", "Bob", "Carl");

// Optional assertions
assertThat(optional).isPresent()
    .get().extracting(User::email).isEqualTo("a@test.com");

// Exception with chained assertions
assertThatThrownBy(() -> service.create(invalidCmd))
    .isInstanceOf(ValidationException.class)
    .hasMessageContaining("name");
```

## Test Data Builders

```java
class MarketBuilder {
  private String name = "Test Market";
  private String slug = "test-market";
  private MarketStatus status = MarketStatus.DRAFT;

  MarketBuilder withName(String name) { this.name = name; return this; }
  MarketBuilder withSlug(String slug) { this.slug = slug; return this; }
  MarketBuilder withStatus(MarketStatus status) { this.status = status; return this; }
  Market build() { return new Market(null, name, slug, status); }
}

// Usage
var market = new MarketBuilder().withStatus(MarketStatus.ACTIVE).build();
```

## JaCoCo Coverage Enforcement

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.15</version>
  <executions>
    <execution><goals><goal>prepare-agent</goal></goals></execution>
    <execution>
      <id>report</id><phase>verify</phase>
      <goals><goal>report</goal></goals>
    </execution>
    <execution>
      <id>check</id>
      <goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

## Test Naming Conventions

```java
// Pattern: methodName_scenario_expectedBehavior
@Test void create_withValidCommand_savesMarket() {}
@Test void create_withBlankName_throwsValidationException() {}
@Test void findBySlug_whenMarketExists_returnsMarket() {}
@Test void findBySlug_whenMarketNotFound_returnsEmpty() {}
@Test void publish_fromDraftState_setsStatusToActive() {}
@Test void publish_fromActiveState_throwsInvalidStateException() {}
```

## CI Commands

- Maven: `mvn -T 4 test` or `mvn verify`
- Gradle: `./gradlew test jacocoTestReport`
- Run only unit tests: `mvn test -Dgroups=unit`
- Run only integration: `mvn verify -Dgroups=integration`

**Remember**: Keep tests fast, isolated, and deterministic. Test behavior, not implementation details.
