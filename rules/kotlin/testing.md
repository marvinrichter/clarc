---
paths:
  - "**/*.kt"
  - "**/*.kts"
globs:
  - "**/*.{kt,kts}"
  - "**/build.gradle.kts"
  - "**/settings.gradle.kts"
alwaysApply: false
---

# Kotlin Testing Requirements

> This file extends [common/testing.md](../common/testing.md) with Kotlin specific content.

## Test Framework: JUnit 5 + Kotest

Use **JUnit 5** (Kotlin-friendly via `kotlin-test`) or **Kotest** for behavior-driven style.

### JUnit 5 + Kotlin Test

```kotlin
import kotlin.test.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class UserServiceTest {

  @Test
  fun `creates user with valid data`() {
    val service = UserService(FakeUserRepository())
    val user = service.create(CreateUserRequest(name = "Alice", email = "alice@example.com"))
    assertEquals("Alice", user.name)
  }

  @Test
  fun `throws on duplicate email`() {
    val repo = FakeUserRepository().apply { add(existingUser) }
    val service = UserService(repo)
    assertThrows<DuplicateEmailException> {
      service.create(CreateUserRequest(name = "Bob", email = existingUser.email))
    }
  }
}
```

### Kotest (behavior style)

```kotlin
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.assertions.throwables.shouldThrow

class UserServiceSpec : DescribeSpec({
  describe("UserService") {
    it("creates user with valid data") {
      val user = service.create(validRequest)
      user.name shouldBe "Alice"
    }

    it("throws on duplicate email") {
      shouldThrow<DuplicateEmailException> {
        service.create(duplicateRequest)
      }
    }
  }
})
```

## Coroutine Testing

Use `runTest` from `kotlinx-coroutines-test`:

```kotlin
import kotlinx.coroutines.test.runTest
import kotlin.test.Test

class AsyncServiceTest {
  @Test
  fun `fetches data asynchronously`() = runTest {
    val result = service.fetchData()
    assertEquals("expected", result)
  }
}
```

## Mocking with MockK

```kotlin
import io.mockk.*

val userRepo = mockk<UserRepository>()
every { userRepo.findById(any()) } returns null
coEvery { userRepo.save(any()) } returns savedUser

verify { userRepo.findById(userId) }
coVerify { userRepo.save(any()) }
```

## Test Structure

```
src/
  main/kotlin/<package>/
  test/kotlin/<package>/
    unit/           # pure unit tests (fast, no I/O)
    integration/    # tests with real DB or services
    fixtures/       # test data builders
```

## Test Naming

Use backtick names for readability:

```kotlin
@Test
fun `returns 404 when user not found`() { ... }
```

## Coverage Requirements

- 80%+ line coverage enforced by Kover or JaCoCo
- Every public function must have at least one test
- Test both happy path and error cases
