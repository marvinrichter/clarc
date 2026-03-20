---
paths:
  - "**/*.scala"
  - "**/*.sc"
  - "**/build.sbt"
  - "**/settings.sbt"
globs:
  - "**/*.{scala,sc}"
  - "**/build.sbt"
  - "**/settings.sbt"
alwaysApply: false
---

# Scala Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Scala specific content.

## Immutability (CRITICAL)

Prefer `val` over `var`. Use `var` only when mutation is unavoidable and document why:

```scala
// WRONG
var count = 0
count += 1

// CORRECT — functional transformation
val count = items.size
val updated = items.filter(_.active)
```

Use immutable collections by default:

```scala
// WRONG
val items = scala.collection.mutable.ListBuffer[String]()

// CORRECT
val items: List[String] = List("a", "b")
val updated = "c" :: items
```

## Null Safety

Never use `null` in Scala code — use `Option` instead:

```scala
// WRONG
def findUser(id: UserId): User = null  // crashes callers

// CORRECT
def findUser(id: UserId): Option[User] = users.get(id)
```

Pattern match on `Option` or use combinators:

```scala
findUser(id)
  .map(_.name)
  .getOrElse("Anonymous")
```

## ADTs with Sealed Traits

Model domain states as sealed hierarchies:

```scala
// Scala 2
sealed trait Result[+A]
case class Success[A](value: A) extends Result[A]
case class Failure(error: String) extends Result[Nothing]

// Scala 3 — preferred
enum Result[+A]:
  case Success(value: A)
  case Failure(error: String)
```

## For-Comprehensions over Nested flatMap

```scala
// WRONG — hard to read
fetchUser(id).flatMap(u => fetchOrders(u.id).flatMap(orders => Future(orders.total)))

// CORRECT
for
  user   <- fetchUser(id)
  orders <- fetchOrders(user.id)
yield orders.total
```

## Naming

- Classes/traits/objects: `PascalCase`
- Methods/values/variables: `camelCase`
- Constants and companion object members: `UpperCamelCase` for values, `UPPER_SNAKE_CASE` for true constants
- Type parameters: single uppercase letter or descriptive `PascalCase` (`F[_]`, `Codec`)

## File Organization

- One top-level type per file (match filename to type name)
- Related extension methods in `<Type>Extensions.scala` or companion object
- 200-400 lines typical; extract to new files above 800 lines
- Package objects deprecated in Scala 3 — use top-level definitions

## Formatting

- 2-space indentation (Scala 2 convention) or Scala 3 significant indentation
- Enforced by `scalafmt` — `.scalafmt.conf` in project root
- Maximum line length: 120 characters
