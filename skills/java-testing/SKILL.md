---
name: java-testing
description: "Java testing patterns: JUnit 5, Mockito, AssertJ, Testcontainers for integration tests, and coverage with JaCoCo. Core TDD methodology for plain Java projects (non-Spring). For Spring Boot, see springboot-tdd."
version: 1.0.0
---

# Java Testing

Core testing patterns for plain Java using JUnit 5, Mockito, AssertJ, and Testcontainers.

> **Note:** This skill covers plain Java (25+) without Spring Boot. For Spring Boot projects, use `springboot-tdd` which covers MockMvc, @SpringBootTest, and the full Spring test slice annotations.

## When to Activate

- Writing tests for plain Java, Jakarta EE, or Quarkus projects
- Setting up JUnit 5 + Mockito + AssertJ test stack
- Writing integration tests with Testcontainers
- Configuring JaCoCo coverage enforcement
- Applying TDD in Java without Spring context

## Dependencies

```xml
<!-- pom.xml -->
<dependencies>
  <!-- JUnit 5 -->
  <dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
  </dependency>
  <!-- Mockito -->
  <dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-core</artifactId>
    <version>5.12.0</version>
    <scope>test</scope>
  </dependency>
  <!-- AssertJ -->
  <dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <version>3.26.3</version>
    <scope>test</scope>
  </dependency>
  <!-- Testcontainers -->
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.20.1</version>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <plugins>
    <!-- JaCoCo coverage -->
    <plugin>
      <groupId>org.jacoco</groupId>
      <artifactId>jacoco-maven-plugin</artifactId>
      <version>0.8.12</version>
      <executions>
        <execution>
          <goals><goal>prepare-agent</goal></goals>
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
  </plugins>
</build>
```

## JUnit 5 Patterns

```java
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;

class PriceFormatterTest {

    private PriceFormatter formatter;

    @BeforeEach
    void setUp() {
        formatter = new PriceFormatter();
    }

    @Test
    void formatsUsdCorrectly() {
        assertThat(formatter.format(1000, "USD")).isEqualTo("$10.00");
    }

    @Test
    void throwsOnNegativeAmount() {
        assertThatThrownBy(() -> formatter.format(-1, "USD"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("negative");
    }

    @ParameterizedTest
    @CsvSource({
        "100, USD, $1.00",
        "100, EUR, €1.00",
        "100, GBP, £1.00",
    })
    void formatsMultipleCurrencies(int cents, String currency, String expected) {
        assertThat(formatter.format(cents, currency)).isEqualTo(expected);
    }

    @Nested
    class WhenCurrencyIsUnknown {
        @Test
        void throwsUnsupportedCurrencyException() {
            assertThatThrownBy(() -> formatter.format(100, "XYZ"))
                .isInstanceOf(UnsupportedCurrencyException.class);
        }
    }
}
```

## Mockito Patterns

```java
import org.mockito.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository repository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createsOrderAndSendsConfirmation() {
        // Arrange
        var request = new CreateOrderRequest("user-123", List.of("item-1"));
        var savedOrder = new Order("order-456", "user-123");
        when(repository.save(any())).thenReturn(savedOrder);

        // Act
        var result = orderService.createOrder(request);

        // Assert
        assertThat(result.id()).isEqualTo("order-456");
        verify(emailService).sendConfirmation("user-123", "order-456");
        verify(repository, times(1)).save(any(Order.class));
    }

    @Test
    void throwsWhenUserNotFound() {
        when(repository.save(any())).thenThrow(new UserNotFoundException("user-123"));

        assertThatThrownBy(() -> orderService.createOrder(new CreateOrderRequest("user-123", List.of())))
            .isInstanceOf(UserNotFoundException.class);

        verifyNoInteractions(emailService);
    }
}
```

## AssertJ Best Practices

```java
// Prefer fluent AssertJ over JUnit assertions
// BAD:
assertEquals("expected", actual);
assertTrue(list.contains("item"));

// GOOD:
assertThat(actual).isEqualTo("expected");
assertThat(list).contains("item");

// For collections
assertThat(users)
    .hasSize(3)
    .extracting(User::name)
    .containsExactlyInAnyOrder("Alice", "Bob", "Charlie");

// For exceptions
assertThatThrownBy(() -> service.findUser("missing"))
    .isInstanceOf(UserNotFoundException.class)
    .hasMessageContaining("missing");

// For optionals
assertThat(optional).isPresent().hasValue("expected");
```

## Integration Tests with Testcontainers

```java
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class UserRepositoryIT {

    @Container
    static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    private UserRepository repository;

    @BeforeEach
    void setUp() {
        var dataSource = createDataSource(postgres.getJdbcUrl());
        repository = new JdbcUserRepository(dataSource);
    }

    @Test
    void savesAndRetrievesUser() {
        var user = new User(null, "Alice", "alice@example.com");
        var saved = repository.save(user);

        assertThat(saved.id()).isNotNull();
        var found = repository.findById(saved.id());
        assertThat(found).isPresent().hasValue(saved);
    }
}
```

## Coverage with JaCoCo

```bash
# Run tests with coverage
mvn test jacoco:report

# Enforce 80% minimum (fails build if below)
mvn verify

# View report
open target/site/jacoco/index.html
```

## TDD Cycle

1. **RED**: Write `@Test` method with `assertThat(...)` — it fails because class/method doesn't exist yet
2. **GREEN**: Implement the minimum code (often just return a hardcoded value) to make the test pass
3. **REFACTOR**: Replace hardcoding with real logic, add edge cases, keep tests green
4. **VERIFY**: `mvn verify` — JaCoCo enforces 80%+ coverage

## Common Pitfalls

- **Don't use `@Mock` without `@ExtendWith(MockitoExtension.class)`** — mocks won't be injected
- **Avoid `new` in test bodies for slow dependencies** — use Mockito or Testcontainers
- **Don't assert on `toString()`** — use `isEqualTo()` with proper `.equals()`/records
- **Use `@Nested` for grouping** — keeps related test cases together without long method names
- **`verify()` after `assertThat()`** — verify side effects after asserting the primary result
