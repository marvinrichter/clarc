---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
globs:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle{,.kts}"
  - "**/settings.gradle{,.kts}"
alwaysApply: false
---
# Java Testing

> This file extends [common/testing.md](../common/testing.md) with Java specific content.

## Framework

Use **JUnit 5** + **AssertJ** for fluent assertions + **Mockito** for mocking.

In hexagonal architecture, mock **output ports** (interfaces), not concrete JPA classes:

```java
@ExtendWith(MockitoExtension.class)
class CreateMarketUseCaseTest {

    @Mock MarketRepository marketRepository;  // output port interface, not JpaMarketRepository
    @InjectMocks CreateMarketService createMarket;

    @Test
    void create_savesMarket_andReturnsIt() {
        // given
        var command = new CreateMarketCommand("Test", "test-slug");
        given(marketRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        // when
        var result = createMarket.create(command);

        // then
        assertThat(result.name()).isEqualTo("Test");
        verify(marketRepository).save(any());
    }
}
```

## Test Naming

`methodName_expectedBehavior_whenCondition`:

```java
@Test void findBySlug_throwsNotFoundException_whenMarketDoesNotExist() {}
```

## Running Tests

```bash
# Maven
./mvnw test
./mvnw verify          # includes JaCoCo coverage

# Gradle
./gradlew test
./gradlew jacocoTestReport
```

## Coverage

- Target: **80%+ line coverage** on use case and domain classes
- Use JaCoCo; exclude generated code, config classes, and DTOs

## Integration Tests (Spring Boot)

```java
@SpringBootTest
@AutoConfigureMockMvc
class MarketControllerIntegrationTest {

    @Autowired MockMvc mockMvc;

    @Test
    void getMarket_returns200_whenExists() throws Exception {
        mockMvc.perform(get("/api/markets/test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("test"));
    }
}
```

## Rules

- No `Thread.sleep()` — use `Awaitility` for async assertions
- Avoid partial mocks (`@Spy`) unless unavoidable
- Test behavior, not implementation — mock at port boundaries (interfaces, not concrete adapters)
- Favor `@TestPropertySource` over production config in tests

## Reference

See skills: `springboot-tdd` for Spring test slice patterns (`@WebMvcTest`, `@DataJpaTest`), `hexagonal-java` for port-based testing patterns.
