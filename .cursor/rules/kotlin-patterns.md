---
paths:
  - "**/*.kt"
  - "**/*.kts"
---

# Kotlin Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Kotlin specific content.

## Sealed Classes for Domain Modeling

Use sealed classes to model exhaustive states — the compiler enforces that all cases are handled:

```kotlin
sealed class Result<out T> {
  data class Success<T>(val value: T) : Result<T>()
  data class Failure(val error: DomainError) : Result<Nothing>()
}

fun handle(result: Result<User>) = when (result) {
  is Result.Success -> render(result.value)
  is Result.Failure -> showError(result.error)
  // No else needed — compiler ensures exhaustiveness
}
```

## Repository Pattern

```kotlin
interface UserRepository {
  suspend fun findById(id: UserId): User?
  suspend fun save(user: User): User
  suspend fun delete(id: UserId)
}

class PostgresUserRepository(private val db: Database) : UserRepository {
  override suspend fun findById(id: UserId): User? =
    db.query { /* ... */ }
}
```

## Companion Object as Factory

```kotlin
class Email private constructor(val value: String) {
  companion object {
    fun of(raw: String): Result<Email> =
      if (raw.contains('@')) Result.Success(Email(raw))
      else Result.Failure(ValidationError("Invalid email: $raw"))
  }
}
```

## Coroutines: Structured Concurrency

```kotlin
suspend fun processAll(items: List<Item>): List<Result> =
  coroutineScope {
    items.map { item ->
      async { processItem(item) }
    }.awaitAll()
  }
```

## Flow for Reactive Streams

```kotlin
fun userUpdates(id: UserId): Flow<User> = flow {
  while (true) {
    emit(repository.findById(id) ?: break)
    delay(1000)
  }
}

// Collect in a coroutine scope
viewModelScope.launch {
  userUpdates(userId)
    .catch { e -> handleError(e) }
    .collect { user -> updateUi(user) }
}
```

## Builder Pattern with DSL

```kotlin
data class HttpConfig(
  val baseUrl: String,
  val timeout: Duration,
  val retries: Int
)

fun httpConfig(block: HttpConfigBuilder.() -> Unit): HttpConfig =
  HttpConfigBuilder().apply(block).build()

class HttpConfigBuilder {
  var baseUrl: String = ""
  var timeout: Duration = Duration.ofSeconds(30)
  var retries: Int = 3
  fun build() = HttpConfig(baseUrl, timeout, retries)
}

// Usage:
val config = httpConfig {
  baseUrl = "https://api.example.com"
  timeout = Duration.ofSeconds(10)
}
```

## Inline Functions for Performance

Use `inline` + reified type parameters to avoid reflection:

```kotlin
inline fun <reified T> deserialize(json: String): T =
  objectMapper.readValue(json, T::class.java)

val user = deserialize<User>(jsonString)
```
