---
name: kotlin-testing
description: "Kotlin testing with JUnit 5, Kotest, MockK, coroutine testing, and Testcontainers. Covers TDD workflow, test structure, coroutine test utilities, and Spring Boot integration testing."
---

# Kotlin Testing Skill

## When to Activate

- Writing tests for new Kotlin code
- Setting up a test framework in a Kotlin project
- Testing coroutines and Flow
- Mocking dependencies with MockK
- Writing integration tests with Testcontainers
- Configuring Kover for coverage

---

## Framework Setup

### Gradle dependencies

```kotlin
// build.gradle.kts
dependencies {
  testImplementation(kotlin("test"))
  testImplementation("org.junit.jupiter:junit-jupiter:5.11.0")
  testImplementation("io.mockk:mockk:1.13.12")
  testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")

  // Optional: Kotest
  testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
  testImplementation("io.kotest:kotest-assertions-core:5.9.1")

  // Optional: Testcontainers
  testImplementation("org.testcontainers:postgresql:1.20.1")
  testImplementation("org.testcontainers:junit-jupiter:1.20.1")
}

tasks.test {
  useJUnitPlatform()
}
```

### Kover (coverage)

```kotlin
plugins {
  id("org.jetbrains.kotlinx.kover") version "0.8.3"
}

kover {
  reports {
    verify {
      rule {
        minBound(80)  // 80% minimum line coverage
      }
    }
  }
}
```

---

## JUnit 5 + Kotlin Test

### Basic structure

```kotlin
import org.junit.jupiter.api.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OrderServiceTest {

  private lateinit var service: OrderService
  private lateinit var repo: FakeOrderRepository

  @BeforeAll
  fun setUpClass() {
    // Runs once for the class
  }

  @BeforeEach
  fun setUp() {
    repo = FakeOrderRepository()
    service = OrderService(repo)
  }

  @AfterEach
  fun tearDown() {
    repo.clear()
  }

  @Test
  fun `places order with valid items`() {
    val order = service.place(validRequest)
    assertEquals(OrderStatus.PENDING, order.status)
    assertNotNull(order.id)
  }

  @Test
  fun `throws when items list is empty`() {
    assertThrows<IllegalArgumentException> {
      service.place(emptyItemsRequest)
    }
  }
}
```

### Parameterized tests

```kotlin
@ParameterizedTest
@ValueSource(strings = ["", " ", "\t", "\n"])
fun `rejects blank name`(name: String) {
  assertThrows<ValidationException> {
    service.createUser(CreateUserRequest(name = name))
  }
}

@ParameterizedTest
@CsvSource(
  "alice@example.com, true",
  "not-an-email, false",
  "@nodomain.com, false"
)
fun `validates email format`(email: String, valid: Boolean) {
  assertEquals(valid, EmailValidator.isValid(email))
}
```

---

## Kotest Style

```kotlin
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.assertions.throwables.shouldThrowExactly

class CartSpec : DescribeSpec({
  val cart = Cart()

  describe("Cart") {
    context("when empty") {
      it("has zero total") {
        cart.total shouldBe Money.ZERO
      }

      it("has no items") {
        cart.items shouldHaveSize 0
      }
    }

    context("when adding items") {
      it("increases total") {
        cart.add(item(price = "10.00"))
        cart.total shouldBe Money.of("10.00", "EUR")
      }
    }

    context("with invalid items") {
      it("throws on negative price") {
        shouldThrowExactly<IllegalArgumentException> {
          cart.add(item(price = "-1.00"))
        }
      }
    }
  }
})
```

---

## MockK

### Basic mocking

```kotlin
val userRepo = mockk<UserRepository>()

// Stub
every { userRepo.findById(any()) } returns testUser
every { userRepo.findById(unknownId) } returns null

// Stub throwing
every { userRepo.save(any()) } throws DatabaseException("Connection lost")

// Verify call
verify(exactly = 1) { userRepo.findById(testUser.id) }
verify { userRepo.save(any()) wasNot Called }
```

### Coroutine mocks (coEvery / coVerify)

```kotlin
coEvery { userRepo.findById(any()) } returns testUser
coEvery { userRepo.save(any()) } returns savedUser

coVerify { userRepo.save(match { it.name == "Alice" }) }
```

### Capturing arguments

```kotlin
val slot = slot<User>()
coEvery { userRepo.save(capture(slot)) } returns savedUser

service.update(updateRequest)

assertEquals("Alice", slot.captured.name)
```

### Spy (partial mock)

```kotlin
val realService = spyk(UserService(mockk()))
every { realService.validate(any()) } returns true
// Other methods call real implementation
```

---

## Coroutine Testing

```kotlin
import kotlinx.coroutines.test.*

class FlowTest {

  @Test
  fun `emits values from flow`() = runTest {
    val values = mutableListOf<Int>()

    val job = backgroundScope.launch {
      counterFlow(from = 1, to = 3).collect { values.add(it) }
    }

    advanceUntilIdle()

    assertEquals(listOf(1, 2, 3), values)
  }

  @Test
  fun `respects timeout`() = runTest {
    assertFailsWith<TimeoutCancellationException> {
      withTimeout(100) {
        delay(Long.MAX_VALUE)
      }
    }
  }
}
```

### Testing StateFlow

```kotlin
@Test
fun `state updates on action`() = runTest {
  val viewModel = MyViewModel(mockRepo)
  val states = mutableListOf<UiState>()

  val job = backgroundScope.launch {
    viewModel.state.collect { states.add(it) }
  }

  viewModel.load(userId)
  advanceUntilIdle()

  assertTrue(states.last() is UiState.Success)
}
```

---

## Integration Tests with Testcontainers

```kotlin
@Testcontainers
@SpringBootTest
class UserRepositoryIntegrationTest {

  companion object {
    @Container
    @JvmStatic
    val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
      withDatabaseName("testdb")
    }

    @DynamicPropertySource
    @JvmStatic
    fun configureProperties(registry: DynamicPropertyRegistry) {
      registry.add("spring.datasource.url", postgres::getJdbcUrl)
      registry.add("spring.datasource.username", postgres::getUsername)
      registry.add("spring.datasource.password", postgres::getPassword)
    }
  }

  @Autowired
  lateinit var repository: UserRepository

  @Test
  fun `persists and retrieves user`() {
    val saved = repository.save(testUser)
    val found = repository.findById(saved.id)
    assertNotNull(found)
    assertEquals(testUser.email, found.email)
  }
}
```

---

## Fake vs Mock

Prefer **fakes** (in-memory implementations) over mocks for repositories:

```kotlin
class FakeUserRepository : UserRepository {
  private val store = mutableMapOf<UserId, User>()

  override suspend fun findById(id: UserId) = store[id]
  override suspend fun save(user: User) = user.also { store[it.id] = it }
  override suspend fun delete(id: UserId) { store.remove(id) }

  fun seed(vararg users: User) = users.forEach { store[it.id] = it }
  fun clear() = store.clear()
}
```

---

## Anti-Patterns

### Using runBlocking Instead of runTest for Coroutine Tests

**Wrong:**
```kotlin
@Test
fun `emits values from flow`() = runBlocking { // Blocks thread, ignores virtual time
    val values = mutableListOf<Int>()
    counterFlow(1, 3).collect { values.add(it) }
    assertEquals(listOf(1, 2, 3), values)
}
```

**Correct:**
```kotlin
@Test
fun `emits values from flow`() = runTest { // Controls virtual time, no real delays
    val values = mutableListOf<Int>()
    val job = backgroundScope.launch { counterFlow(1, 3).collect { values.add(it) } }
    advanceUntilIdle()
    assertEquals(listOf(1, 2, 3), values)
}
```

**Why:** `runBlocking` executes delays in real time and does not integrate with `TestCoroutineScheduler`, making tests slow and unable to control timing.

### Using every/verify for Suspend Functions Instead of coEvery/coVerify

**Wrong:**
```kotlin
every { userRepo.findById(any()) } returns testUser  // Compile error or silent failure
verify { userRepo.findById(testUser.id) }
```

**Correct:**
```kotlin
coEvery { userRepo.findById(any()) } returns testUser
coVerify { userRepo.findById(testUser.id) }
```

**Why:** `every`/`verify` do not understand suspend functions; `coEvery`/`coVerify` are the MockK equivalents that correctly stub and assert on `suspend` calls.

### Sharing Mutable State Between Tests via Class-Level Properties

**Wrong:**
```kotlin
class OrderServiceTest {
    private val repo = FakeOrderRepository() // Shared across all tests — state leaks
    private val service = OrderService(repo)

    @Test
    fun `places order`() { service.place(validRequest) }

    @Test
    fun `rejects empty items`() { /* repo may contain orders from the previous test */ }
}
```

**Correct:**
```kotlin
class OrderServiceTest {
    private lateinit var repo: FakeOrderRepository
    private lateinit var service: OrderService

    @BeforeEach
    fun setUp() {
        repo = FakeOrderRepository()       // Fresh instance per test
        service = OrderService(repo)
    }
}
```

**Why:** Class-level mutable state allows one test's side effects to pollute subsequent tests, causing order-dependent failures that are extremely difficult to diagnose.

### Using H2 In-Memory Database for Integration Tests

**Wrong:**
```kotlin
@SpringBootTest
class UserRepoTest {
    // application-test.properties: spring.datasource.url=jdbc:h2:mem:testdb
    // H2 SQL dialect differs from PostgreSQL — migrations may silently fail
}
```

**Correct:**
```kotlin
@Testcontainers
@SpringBootTest
class UserRepoTest {
    companion object {
        @Container @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")

        @DynamicPropertySource @JvmStatic
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
        }
    }
}
```

**Why:** H2's SQL dialect is not fully compatible with PostgreSQL, causing migrations and queries to behave differently in tests than in production.

### Catching CancellationException in Tests

**Wrong:**
```kotlin
@Test
fun `handles timeout`() = runTest {
    try {
        withTimeout(100) { delay(Long.MAX_VALUE) }
    } catch (e: Exception) { // Catches CancellationException — swallows coroutine cancellation
        assertTrue(e is TimeoutCancellationException)
    }
}
```

**Correct:**
```kotlin
@Test
fun `handles timeout`() = runTest {
    assertFailsWith<TimeoutCancellationException> {
        withTimeout(100) { delay(Long.MAX_VALUE) }
    }
}
```

**Why:** Catching the broad `Exception` type also catches `CancellationException`, which is the coroutine mechanism for structured concurrency; swallowing it corrupts the coroutine's cancellation state.

## Checklist

- [ ] JUnit 5 configured with `useJUnitPlatform()`
- [ ] Kover configured with 80% minimum coverage
- [ ] Backtick test names for readability
- [ ] `@BeforeEach` creates fresh dependencies (no shared mutable state)
- [ ] Coroutines tested with `runTest` (not `runBlocking`)
- [ ] `coEvery`/`coVerify` used for suspend functions
- [ ] Fakes used for repositories; MockK for external services
- [ ] Integration tests use Testcontainers (not H2)
- [ ] `CancellationException` not caught in tests
