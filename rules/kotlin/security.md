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

# Kotlin Security Guidelines

> This file extends [common/security.md](../common/security.md) with Kotlin specific content.

## SQL Injection Prevention

Never concatenate user input into SQL strings. Use parameterized queries:

```kotlin
// WRONG — SQL injection risk
db.execute("SELECT * FROM users WHERE name = '$name'")

// CORRECT — parameterized
db.execute("SELECT * FROM users WHERE name = ?", name)

// With Exposed ORM
Users.select { Users.name eq name }
```

## Secrets Management

Never hardcode secrets in source or companion objects:

```kotlin
// WRONG
companion object {
  const val API_KEY = "sk-abc123"
}

// CORRECT
val apiKey = System.getenv("API_KEY")
  ?: error("API_KEY environment variable is required")
```

## Input Validation

Validate at domain boundaries using value objects:

```kotlin
@JvmInline
value class Email(val value: String) {
  init {
    require(value.contains('@')) { "Invalid email: $value" }
    require(value.length <= 254) { "Email too long" }
  }
}
```

## Serialization Safety

When using `kotlinx.serialization`, mark sensitive fields with `@Transient`:

```kotlin
@Serializable
data class User(
  val id: String,
  val email: String,
  @Transient val passwordHash: String = ""
)
```

## Coroutine Cancellation Safety

Always handle `CancellationException` properly — never swallow it:

```kotlin
// WRONG — swallows cancellation
try {
  delay(1000)
} catch (e: Exception) {
  log.warn("Error: $e")  // silently eats CancellationException
}

// CORRECT
try {
  delay(1000)
} catch (e: CancellationException) {
  throw e  // re-throw cancellation
} catch (e: Exception) {
  log.warn("Error: $e")
}
```

## Dependency Scanning

Run dependency vulnerability scanning in CI:

```bash
./gradlew dependencyCheckAnalyze
```

Or use GitHub Dependabot for automatic security updates.
