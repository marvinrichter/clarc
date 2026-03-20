---
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/build.gradle.kts"
  - "**/settings.gradle.kts"
globs:
  - "**/*.{kt,kts}"
  - "**/build.gradle.kts"
  - "**/settings.gradle.kts"
alwaysApply: false
---

# Kotlin Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Kotlin specific content.

## Immutability (CRITICAL)

Prefer `val` over `var`. Use `var` only when mutation is necessary and document why:

```kotlin
// WRONG
var count = 0
count++

// CORRECT — use immutable local val + functional transformation
val count = items.size
```

Use immutable collections by default:

```kotlin
// WRONG
val items = mutableListOf("a", "b")

// CORRECT — expose immutable type
val items: List<String> = listOf("a", "b")
```

## Null Safety

Never use `!!` (double-bang) unless you can prove null is impossible:

```kotlin
// WRONG
val name = user!!.name  // crashes on null

// CORRECT
val name = user?.name ?: "Unknown"
```

Prefer safe-call chains and `let` / `run` / `also` scope functions:

```kotlin
user?.let { u ->
  displayName(u.name)
  updateAvatar(u.avatarUrl)
}
```

## Data Classes

Use data classes for value objects — they provide `equals`, `hashCode`, `copy`, `toString`:

```kotlin
data class User(
  val id: UserId,
  val name: String,
  val email: Email
)
```

## Naming

- Classes/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (in companion objects) or top-level `val`
- Type aliases: `PascalCase`

```kotlin
companion object {
  const val MAX_RETRIES = 3
}
```

## Functions

Prefer expression bodies for single-expression functions:

```kotlin
// Verbose
fun double(n: Int): Int {
  return n * 2
}

// Idiomatic
fun double(n: Int) = n * 2
```

Use named arguments for functions with multiple parameters of the same type:

```kotlin
// Ambiguous
createUser("Alice", "alice@example.com", true)

// Clear
createUser(name = "Alice", email = "alice@example.com", isAdmin = true)
```

## Extension Functions

Use extension functions to add behavior without inheritance:

```kotlin
fun String.toSlug(): String =
  lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
```

## File Organization

- One top-level class per file (match filename to class name)
- Related extension functions in `<Type>Extensions.kt`
- 200-400 lines typical; extract to new files above 800 lines

## Formatting

- 4-space indentation
- Enforced by `ktfmt --kotlinlang-style` or `ktlint`
