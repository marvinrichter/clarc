---
paths:
  - "**/*.scala"
  - "**/*.sc"
  - "**/build.sbt"
globs:
  - "**/*.{scala,sc}"
  - "**/build.sbt"
  - "**/settings.sbt"
alwaysApply: false
---

# Scala Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Scala specific content.

## Typeclass Pattern

Define behavior separately from data:

```scala
// Define the typeclass
trait Encoder[A]:
  def encode(value: A): Json

// Companion object with instances
object Encoder:
  given Encoder[String] = value => Json.Str(value)
  given Encoder[Int]    = value => Json.Num(value)

  // Syntax extension
  extension [A: Encoder](value: A)
    def toJson: Json = summon[Encoder[A]].encode(value)

// Usage
"hello".toJson  // Json.Str("hello")
```

## Option / Either / Try for Error Handling

```scala
// Option — value may be absent
def findById(id: UserId): Option[User]

// Either — expected failure with typed error
def validateEmail(s: String): Either[ValidationError, Email]

// Try — wraps exceptions from legacy/Java code
def parseConfig(path: String): Try[Config] = Try(ConfigFactory.parseFile(File(path)))

// Chain safely
val result: Either[AppError, String] =
  for
    raw    <- Try(io.Source.fromFile(path).mkString).toEither.left.map(IOError(_))
    config <- parseConfig(raw)
    value  <- config.getString("key").toRight(MissingKey("key"))
  yield value
```

## Cats Effect — Resource Management

```scala
import cats.effect.{IO, Resource}

def dbPool(config: DbConfig): Resource[IO, HikariPool] =
  Resource.make(
    acquire = IO(HikariPool(config))
  )(
    release = pool => IO(pool.close())
  )

// Compose resources
val app: Resource[IO, Unit] =
  for
    pool <- dbPool(config)
    http <- httpServer(pool)
  yield ()
```

## ZIO Effect System

```scala
import zio.*

def findUser(id: UserId): ZIO[UserRepo, DatabaseError, Option[User]] =
  ZIO.serviceWithZIO[UserRepo](_.find(id))

// Provide layers
val program = findUser(id).provide(
  ZLayer.succeed(PostgresUserRepo(pool))
)
```

## Scala 3 Features

```scala
// Opaque types — zero-cost wrappers
opaque type UserId = String
object UserId:
  def apply(s: String): UserId = s
  extension (id: UserId) def value: String = id

// Extension methods
extension (s: String)
  def toSlug: String = s.toLowerCase.replaceAll("[^a-z0-9]+", "-").trim('-')

// Union types
type StringOrInt = String | Int
def process(value: StringOrInt): String = value match
  case s: String => s
  case n: Int    => n.toString
```

## Reference

For testing patterns see `skills/scala-testing`.
For Cats Effect and ZIO deep-dives see `skills/scala-patterns`.
