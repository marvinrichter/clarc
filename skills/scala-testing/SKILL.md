---
name: scala-testing
description: "Scala testing with ScalaTest, MUnit, and ScalaCheck: FunSpec/FlatSpec test structure, property-based testing with forAll, mocking with MockitoSugar, Cats Effect testing with munit-cats-effect (runTest/IOSuite), ZIO Test, Testcontainers-Scala for database integration tests, and CI integration with sbt. Use when writing or reviewing Scala tests."
---

# Scala Testing

## When to Activate

- Writing tests for Scala code
- Choosing a Scala test framework
- Testing Cats Effect or ZIO code
- Setting up integration tests with real databases
- Adding property-based tests with ScalaCheck to cover edge cases automatically
- Configuring Testcontainers for a PostgreSQL or other database in CI
- Reviewing test coverage and deciding between unit fakes and Mockito mocks

---

## ScalaTest

Standard, feature-rich framework. Prefer `AnyFunSpec` or `AnyFlatSpec`.

### AnyFunSpec — BDD-style

```scala
import org.scalatest.funspec.AnyFunSpec
import org.scalatest.matchers.should.Matchers

class UserServiceSpec extends AnyFunSpec with Matchers:
  describe("UserService"):
    describe("find"):
      it("returns Some when user exists"):
        val repo = InMemoryUserRepo(Map(userId -> user))
        val svc  = UserService(repo)
        svc.find(userId) shouldBe Some(user)

      it("returns None when user not found"):
        val svc = UserService(InMemoryUserRepo())
        svc.find(userId) shouldBe None
```

### AnyFlatSpec — simpler style

```scala
class UserServiceSpec extends AnyFlatSpec with Matchers:
  "UserService.find" should "return Some for existing user" in {
    UserService(repo).find(userId) shouldBe Some(user)
  }

  it should "return None for missing user" in {
    UserService(InMemoryUserRepo()).find(userId) shouldBe None
  }
```

### Matchers Reference

```scala
result shouldBe Some(user)           // equality
result should not be empty
result shouldEqual List(1, 2, 3)
name should startWith("Alice")
list should have length 3
n should be > 0
thrown.getMessage should include("not found")

// Exception testing
an [IllegalArgumentException] should be thrownBy {
  validateAge(-1)
}
```

---

## MUnit — Lightweight and Fast

Recommended for new projects. Simpler setup, compatible with Cats Effect.

```scala
import munit.FunSuite

class UserSuite extends FunSuite:
  test("find returns Some for existing user"):
    val svc = UserService(InMemoryUserRepo(Map(userId -> user)))
    assertEquals(svc.find(userId), Some(user))

  test("find returns None for missing user"):
    assertEquals(
      UserService(InMemoryUserRepo()).find(userId),
      None
    )
```

---

## Property-Based Testing — ScalaCheck

Test invariants across random inputs:

```scala
import org.scalacheck.{Gen, Prop}
import org.scalacheck.Prop.forAll

object EmailSpec extends org.scalacheck.Properties("Email"):
  val validEmail: Gen[String] =
    for
      user   <- Gen.alphaStr.suchThat(_.nonEmpty)
      domain <- Gen.alphaStr.suchThat(_.nonEmpty)
    yield s"$user@$domain.com"

  property("encode then decode roundtrip") = forAll { (s: String) =>
    Email.parse(Email.format(s)) == s
  }

  property("valid emails always parse") = forAll(validEmail) { email =>
    Email.parse(email).isRight
  }
```

### MUnit + ScalaCheck

```scala
import munit.ScalaCheckSuite
import org.scalacheck.Prop.*

class SlugSuite extends ScalaCheckSuite:
  property("slug is always lowercase"):
    forAll { (s: String) =>
      val slug = s.toSlug
      slug == slug.toLowerCase
    }
```

---

## Cats Effect Testing — munit-cats-effect

```scala
import munit.CatsEffectSuite
import cats.effect.IO

class UserRepoSuite extends CatsEffectSuite:
  test("save and retrieve user"):
    for
      repo   <- IO(InMemoryUserRepo())
      _      <- repo.save(user)
      result <- repo.find(user.id)
    yield assertEquals(result, Some(user))

  test("concurrent saves are safe"):
    for
      repo <- IO(InMemoryUserRepo())
      _    <- (1 to 100).toList.parTraverse(i => repo.save(user.copy(id = UserId(i.toString))))
      all  <- repo.findAll
    yield assertEquals(all.size, 100)
```

### Resource Fixtures

```scala
val dbRepo: Fixture[UserRepo] =
  ResourceSuiteLocalFixture("db-repo",
    Resource.make(IO(PostgresUserRepo(testPool)))(r => IO(r.close()))
  )

override def munitFixtures = List(dbRepo)

test("saves to Postgres"):
  dbRepo().save(user) >> dbRepo().find(user.id).map:
    result => assertEquals(result, Some(user))
```

---

## ZIO Test

```scala
import zio.test.*
import zio.test.Assertion.*

object UserServiceSpec extends ZIOSpecDefault:
  def spec = suite("UserService")(
    test("find returns user when exists"):
      for
        svc    <- ZIO.service[UserService]
        result <- svc.find(userId)
      yield assert(result)(isSome(equalTo(user)))
  ).provide(
    UserService.live,
    InMemoryUserRepo.layer
  )
```

---

## Mocking with MockitoSugar

Prefer **fakes** (in-memory implementations) over mocks when possible.

When mocking is necessary:

```scala
import org.mockito.MockitoSugar
import org.mockito.ArgumentMatchers.any

class PaymentServiceSpec extends AnyFunSpec with MockitoSugar:
  val gateway = mock[PaymentGateway]

  describe("charge"):
    it("calls gateway with correct amount"):
      when(gateway.charge(any[Amount])) thenReturn IO.pure(PaymentResult.Success("tx-1", amount))

      val svc = PaymentService(gateway)
      svc.charge(amount).unsafeRunSync()

      verify(gateway).charge(amount)
```

---

## Testcontainers — Integration Tests

```scala
import com.dimafeng.testcontainers.{PostgreSQLContainer, ForAllTestContainer}

class PostgresRepoSpec extends AnyFunSpec with ForAllTestContainer:
  override val container = PostgreSQLContainer("postgres:16")

  lazy val repo = PostgresUserRepo(
    jdbcUrl  = container.jdbcUrl,
    username = container.username,
    password = container.password
  )

  describe("PostgresUserRepo"):
    it("persists and retrieves user"):
      repo.save(user)
      repo.find(user.id) shouldBe Some(user)
```

### MUnit + Testcontainers

```scala
class DbSuite extends CatsEffectSuite:
  val pg = ResourceSuiteLocalFixture("postgres",
    Resource.fromAutoCloseable(IO(PostgreSQLContainer("postgres:16").tap(_.start())))
  )

  override def munitFixtures = List(pg)

  test("saves to real postgres"):
    val repo = PostgresUserRepo.fromContainer(pg())
    repo.save(user) >> repo.find(user.id).map(assertEquals(_, Some(user)))
```

---

## Test Organization

```
src/
  test/
    scala/
      com/example/
        UserServiceSpec.scala       # Unit — pure, no I/O
        UserRepoSpec.scala          # Integration — Testcontainers
        PaymentServiceProperties.scala  # ScalaCheck properties
```

## Build Configuration

```scala
// build.sbt
libraryDependencies ++= Seq(
  "org.scalameta"     %% "munit"                  % "1.0.0"  % Test,
  "org.typelevel"     %% "munit-cats-effect"       % "2.0.0"  % Test,
  "org.scalatest"     %% "scalatest"               % "3.2.18" % Test,
  "org.scalacheck"    %% "scalacheck"              % "1.17.0" % Test,
  "org.mockito"       %% "mockito-scala"           % "1.17.31"% Test,
  "com.dimafeng"      %% "testcontainers-scala-postgresql" % "0.41.4" % Test
)
```

## Running Tests

```bash
sbt test                            # all tests
sbt "testOnly *UserServiceSpec"     # single spec
sbt "testOnly -- -z 'finds user'"  # by test name pattern
sbt "Test/testOptions += Tests.Argument(\"-v\")"  # verbose output
```
