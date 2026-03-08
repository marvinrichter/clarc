---
name: scala-patterns
description: "Idiomatic Scala patterns: ADTs with sealed traits and case classes, typeclass pattern, Option/Either/Try error handling, for-comprehensions, Cats Effect (IO, Resource, Ref, Fiber), ZIO fundamentals, Scala 3 features (given/using, enums, extension methods, opaque types, union types). Covers both Scala 2.13 and Scala 3. Use when writing Scala, reviewing Scala code, or designing Scala domain models."
---

# Scala Patterns

## When to Activate

- Writing any Scala source (`.scala`, `.sc`, `build.sbt`)
- Designing domain models or error handling strategies
- Choosing between Future, Cats Effect IO, and ZIO
- Migrating Scala 2 code to Scala 3

---

## ADTs — Algebraic Data Types

Model domain states exhaustively. Compiler enforces completeness.

### Scala 2 — Sealed Trait + Case Classes

```scala
sealed trait PaymentResult
case class Success(transactionId: String, amount: BigDecimal) extends PaymentResult
case class Declined(reason: String)                           extends PaymentResult
case class Error(cause: Throwable)                            extends PaymentResult

// Exhaustive pattern match — compiler warns on missing cases
def describe(result: PaymentResult): String = result match
  case Success(id, amount) => s"Paid $amount (tx: $id)"
  case Declined(reason)    => s"Declined: $reason"
  case Error(cause)        => s"Error: ${cause.getMessage}"
```

### Scala 3 — Enum (preferred)

```scala
enum PaymentResult:
  case Success(transactionId: String, amount: BigDecimal)
  case Declined(reason: String)
  case Error(cause: Throwable)
```

---

## Option / Either / Try

### Option — presence or absence

```scala
def findUser(id: UserId): Option[User] = users.get(id)

// Chain without null checks
val greeting: String =
  findUser(id)
    .map(u => s"Hello, ${u.name}")
    .getOrElse("Hello, stranger")

// Fail fast with toRight
val user: Either[NotFound, User] =
  findUser(id).toRight(NotFound(id))
```

### Either — expected failures with typed errors

```scala
sealed trait AppError
case class NotFound(id: String)     extends AppError
case class ValidationError(msg: String) extends AppError

def validateAge(n: Int): Either[ValidationError, Int] =
  if n >= 0 && n <= 150 then Right(n)
  else Left(ValidationError(s"Invalid age: $n"))

// Chain with for-comprehension
val result: Either[AppError, Profile] =
  for
    user    <- findUser(id).toRight(NotFound(id.value))
    age     <- validateAge(user.rawAge)
    profile <- buildProfile(user, age)
  yield profile
```

### Try — wrapping exceptions from Java/legacy code

```scala
import scala.util.{Try, Success, Failure}

def readConfig(path: String): Try[Config] =
  Try(ConfigFactory.parseFile(new File(path)))

// Convert to Either for composition
readConfig("app.conf")
  .toEither
  .left.map(e => ConfigError(e.getMessage))
```

---

## Typeclass Pattern

Separate behavior from data. Enables ad-hoc polymorphism.

```scala
// 1. Define the typeclass trait
trait JsonEncoder[A]:
  def encode(value: A): Json

// 2. Instances in companion object
object JsonEncoder:
  given JsonEncoder[String] = Json.Str(_)
  given JsonEncoder[Int]    = Json.Num(_)
  given [A: JsonEncoder] JsonEncoder[List[A]] =
    xs => Json.Arr(xs.map(summon[JsonEncoder[A]].encode))

  // 3. Syntax extension
  extension [A: JsonEncoder](value: A)
    def toJson: Json = summon[JsonEncoder[A]].encode(value)

// Usage — no explicit import needed if instances are in scope
42.toJson          // Json.Num(42)
List("a").toJson   // Json.Arr(...)
```

---

## For-Comprehensions

Use for-comprehensions instead of nested `flatMap` chains:

```scala
// Avoid — nested, hard to read
fetchUser(id)
  .flatMap(u => fetchOrders(u.id)
  .flatMap(orders => computeTotal(orders)
  .map(total => Invoice(u, total))))

// Preferred
for
  user   <- fetchUser(id)
  orders <- fetchOrders(user.id)
  total  <- computeTotal(orders)
yield Invoice(user, total)
```

For-comprehensions work with any monadic type: `Future`, `IO`, `Either`, `Option`.

---

## Cats Effect

### IO — pure effect type

```scala
import cats.effect.IO

def readFile(path: String): IO[String] =
  IO.blocking(scala.io.Source.fromFile(path).mkString)

def writeFile(path: String, content: String): IO[Unit] =
  IO.blocking(Files.write(Paths.get(path), content.getBytes))

// Compose
val program: IO[Unit] =
  for
    content   <- readFile("input.txt")
    processed <- IO(process(content))
    _         <- writeFile("output.txt", processed)
  yield ()
```

### Resource — safe acquisition and release

```scala
import cats.effect.Resource

def dbPool(config: DbConfig): Resource[IO, HikariDataSource] =
  Resource.make(
    IO(new HikariDataSource(config))
  )(pool => IO(pool.close()))

// Use and automatically release
dbPool(config).use { pool =>
  IO(pool.getConnection()).flatMap(doWork)
}
```

### Ref — concurrent mutable state

```scala
import cats.effect.Ref

def counter: IO[Unit] =
  for
    ref <- Ref.of[IO, Int](0)
    _   <- (ref.update(_ + 1)).replicateA(100).parSequence
    n   <- ref.get
    _   <- IO.println(s"Count: $n")
  yield ()
```

### Blocking vs compute

```scala
// Blocking I/O — runs on dedicated blocking thread pool
IO.blocking(Files.readAllBytes(path))

// CPU-bound — runs on compute pool
IO(computeHash(data))

// Never: Thread.sleep, blocking calls on compute pool
```

---

## ZIO Basics

```scala
import zio.*

// Define effect with environment, error, and result types
def findUser(id: UserId): ZIO[UserRepo, DatabaseError, Option[User]] =
  ZIO.serviceWithZIO[UserRepo](_.find(id))

// Provide dependencies via layers
val live: ZLayer[Any, Nothing, UserRepo] =
  ZLayer.succeed(PostgresUserRepo(pool))

val program = findUser(id).provide(live)
```

---

## Scala 3 — Key Features

### Opaque Types — zero-cost domain wrappers

```scala
opaque type UserId = String
object UserId:
  def apply(s: String): UserId = s
  extension (id: UserId)
    def value: String = id
    def show: String  = s"UserId($id)"
```

### Extension Methods

```scala
extension (s: String)
  def toSlug: String =
    s.toLowerCase.replaceAll("[^a-z0-9]+", "-").trim('-')

extension [A](opt: Option[A])
  def orFail(msg: String): Either[String, A] =
    opt.toRight(msg)
```

### Given / Using (Scala 3 implicits)

```scala
given Ordering[User] = Ordering.by(_.name)

def sortUsers(users: List[User])(using ord: Ordering[User]): List[User] =
  users.sorted

// Compiler resolves `given Ordering[User]` automatically
sortUsers(allUsers)
```

### Union Types

```scala
type StringOrInt = String | Int

def format(value: StringOrInt): String = value match
  case s: String => s
  case n: Int    => n.toString
```

---

## Anti-Patterns

| Anti-Pattern | Better Alternative |
|---|---|
| `null` as return value | `Option[A]` |
| `throw` for business errors | `Either[Error, A]` |
| `var` for accumulation | `fold`, `scan`, or immutable builders |
| `Future` for everything | Cats Effect `IO` or ZIO for control |
| Java-style loops | `map`, `flatMap`, `foldLeft` |
| Nested `flatMap` (>2 levels) | For-comprehension |
| Blocking on compute pool | `IO.blocking` / `ZIO.blocking` |
