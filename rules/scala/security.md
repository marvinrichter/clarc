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

# Scala Security Guidelines

> This file extends [common/security.md](../common/security.md) with Scala specific content.

## SQL Injection Prevention

Always use parameterized queries. Never build SQL via string interpolation:

```scala
// WRONG — SQL injection risk
val query = s"SELECT * FROM users WHERE email = '$email'"
conn.createStatement().executeQuery(query)

// CORRECT — Doobie parameterized
sql"SELECT * FROM users WHERE email = $email".query[User].option

// CORRECT — Slick type-safe query
users.filter(_.email === email).result.headOption
```

## Secrets Management

Never hardcode secrets in source code or companion objects:

```scala
// WRONG
object Config:
  val apiKey = "sk-abc123"  // committed to git!

// CORRECT — load from environment
object Config:
  val apiKey: String = sys.env.getOrElse("API_KEY",
    throw new IllegalStateException("API_KEY env var required"))
```

Use `pureconfig` or `ciris` for typed configuration loading from environment.

## Blocking Calls in Async Context

Never block a thread pool thread without a dedicated blocking dispatcher:

```scala
// WRONG — blocks Cats Effect thread pool
IO(Thread.sleep(1000))
IO(Files.readAllBytes(path))  // blocking I/O on compute pool

// CORRECT — Cats Effect
IO.blocking(Files.readAllBytes(path))   // runs on blocking pool
IO.sleep(1.second)                       // non-blocking

// CORRECT — ZIO
ZIO.blocking(ZIO.attemptBlocking(Files.readAllBytes(path)))
```

## Serialization Safety

Use `circe` or `play-json` for JSON — avoid Java serialization:

```scala
// WRONG — Java serialization is dangerous
new ObjectInputStream(stream).readObject()

// CORRECT — circe with compile-time derived codecs
import io.circe.generic.auto.*
val result: Either[Error, User] = decode[User](jsonString)
```

## CancellationException Handling

In Cats Effect, `CancellationException` and `InterruptedException` must not be caught and swallowed:

```scala
// WRONG — swallows cancellation
IO(riskyCall()).handleError(_ => fallback)  // catches CancellationException!

// CORRECT — only handle non-fatal errors
IO(riskyCall()).handleErrorWith {
  case _: CancellationException => IO.canceled
  case err                      => IO.pure(fallback)
}
```

## Dependency Scanning

Run `sbt dependencyCheck` (OWASP plugin) in CI to detect known vulnerable dependencies.
