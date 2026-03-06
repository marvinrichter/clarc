---
description: "Java testing extending common rules"
globs: ["**/*.java", "**/pom.xml", "**/build.gradle", "**/build.gradle.kts"]
alwaysApply: false
---
# Java Testing

> This file extends the common testing rule with Java 25+ / Spring Boot 4 specific content.

## Framework

Use **JUnit 5** + **AssertJ** (fluent assertions) + **Mockito** (mocking).

Mock **output ports** (interfaces), not concrete JPA classes:

```java
@ExtendWith(MockitoExtension.class)
class CreateMarketUseCaseTest {

    @Mock MarketRepository marketRepository;  // output port interface
    @InjectMocks CreateMarketService createMarket;

    @Test
    void create_savesMarket_andReturnsIt() {
        given(marketRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        var result = createMarket.create(new CreateMarketCommand("Test", "test"));
        assertThat(result.name()).isEqualTo("Test");
    }
}
```

## Spring Boot 4 Test Slices

```java
// Web layer only — fast, no full context
@WebMvcTest(MarketController.class)
class MarketControllerTest {
    @MockitoBean CreateMarketUseCase createMarket;  // @MockitoBean replaces @MockBean in Spring Boot 4
    @Autowired MockMvc mockMvc;
}

// Persistence layer only
@DataJpaTest
class MarketRepositoryTest { ... }
```

## Test Naming

`methodName_expectedBehavior_whenCondition`:
```java
@Test void findBySlug_throwsNotFoundException_whenMarketDoesNotExist() {}
```

## Running Tests

```bash
./mvnw test
./mvnw verify          # includes JaCoCo coverage
./gradlew test
./gradlew jacocoTestReport
```

## Coverage

- Target: **80%+ line coverage** on use case and domain classes
- Use JaCoCo; exclude generated code, config classes, and DTOs

## Rules

- No `Thread.sleep()` — use `Awaitility` for async assertions
- Test behavior, not implementation — mock at port boundaries
- Favor `@TestPropertySource` over production config in tests

## Reference

See skills: `springboot-tdd`, `hexagonal-java` for port-based testing patterns.
