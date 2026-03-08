---
paths:
  - "**/*.scala"
  - "**/*.sc"
---

# Scala Testing

> This file extends [common/testing.md](../common/testing.md) with Scala specific content.

## Test Framework

Use **ScalaTest** (AnyFunSpec or AnyFlatSpec style) or **MUnit** for new projects:

```scala
// ScalaTest — AnyFunSpec
class UserServiceSpec extends AnyFunSpec with Matchers:
  describe("UserService"):
    it("returns None when user not found"):
      val svc = UserService(InMemoryRepo())
      svc.find(UserId("missing")) shouldBe None
```

```scala
// MUnit — lightweight, recommended for new projects
class UserServiceSuite extends munit.FunSuite:
  test("returns None when user not found"):
    val svc = UserService(InMemoryRepo())
    assertEquals(svc.find(UserId("missing")), None)
```

## Property-Based Testing

Use **ScalaCheck** with `forAll` for invariant testing:

```scala
import org.scalacheck.Prop.forAll

property("encode then decode roundtrip"):
  forAll { (s: String) =>
    decode(encode(s)) == s
  }
```

## Cats Effect Testing

Use `munit-cats-effect` for IO-based tests:

```scala
import munit.CatsEffectSuite

class DbRepoSuite extends CatsEffectSuite:
  test("saves and retrieves entity"):
    for
      repo   <- IO(InMemoryRepo())
      _      <- repo.save(entity)
      result <- repo.find(entity.id)
    yield assertEquals(result, Some(entity))
```

## Mocking

Prefer **fakes** (in-memory implementations) over mocks. Use **Mockito for Scala** when mocking is needed:

```scala
import org.mockito.MockitoSugar

class PaymentServiceSpec extends AnyFlatSpec with MockitoSugar:
  val gateway = mock[PaymentGateway]
  when(gateway.charge(any)) thenReturn IO.pure(PaymentResult.Success)
```

## Testcontainers

Use `testcontainers-scala` for integration tests requiring real databases:

```scala
class PostgresRepoSuite extends munit.FunSuite with TestContainerForAll:
  override val containerDef = PostgreSQLContainer.Def()

  test("persists aggregate"):
    withContainers { pg =>
      val repo = PostgresRepo(pg.jdbcUrl, pg.username, pg.password)
      // ...
    }
```

## Test Organization

```
src/
  test/
    scala/
      com/example/
        unit/           # Pure unit tests, no I/O
        integration/    # Database, external services
        e2e/            # Full application tests
```

## Running Tests

```bash
sbt test              # all tests
sbt testOnly *UserSpec  # specific spec
sbt "testOnly -- -z 'finds user'"  # by test name
```
