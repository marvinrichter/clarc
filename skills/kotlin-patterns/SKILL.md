---
name: kotlin-patterns
description: "Idiomatic Kotlin patterns: sealed classes, data classes, extension functions, coroutines, Flow, DSL builders, value classes, and functional idioms. Use when writing or reviewing Kotlin code."
---

# Kotlin Patterns Skill

## When to Activate

- Writing new Kotlin classes or functions
- Reviewing Kotlin code for idiomatic style
- Modeling domain objects in Kotlin
- Implementing async workflows with coroutines
- Building Kotlin DSLs or builder APIs
- Debugging coroutine or Flow issues

---

## Core Idioms

### val over var — always

```kotlin
// Avoid
var userId = ""
userId = input.id

// Prefer
val userId = input.id
```

### Null safety patterns

```kotlin
// Safe call + Elvis
val name = user?.profile?.displayName ?: "Anonymous"

// let for null-conditional blocks
user?.let { u ->
  analyticsService.track(u.id, "login")
  sessionManager.create(u)
}

// also for side effects (returns receiver)
val user = createUser(request).also {
  log.info("Created user: ${it.id}")
}

// run for scoped transformations
val summary = user.run {
  "${name} (${email})"
}
```

---

## Domain Modeling

### Sealed classes for exhaustive state

```kotlin
sealed class AuthResult {
  data class Success(val token: String, val user: User) : AuthResult()
  data class InvalidCredentials(val attemptsRemaining: Int) : AuthResult()
  data object AccountLocked : AuthResult()
  data class Error(val cause: Throwable) : AuthResult()
}

fun handleAuth(result: AuthResult) = when (result) {
  is AuthResult.Success -> redirect("/dashboard")
  is AuthResult.InvalidCredentials -> showRetryForm(result.attemptsRemaining)
  AuthResult.AccountLocked -> showLockedPage()
  is AuthResult.Error -> showError(result.cause)
  // Compiler guarantees exhaustiveness — no else needed
}
```

### Value classes for type-safe primitives

```kotlin
@JvmInline
value class UserId(val value: String) {
  init { require(value.isNotBlank()) { "UserId cannot be blank" } }
}

@JvmInline
value class Email(val value: String) {
  init { require(value.contains('@')) { "Invalid email: $value" } }
}

// Now these won't compile mixed up:
fun findUser(id: UserId): User?   // NOT String
fun sendEmail(to: Email): Unit    // NOT String
```

### Data classes as value objects

```kotlin
data class Money(val amount: BigDecimal, val currency: Currency) {
  operator fun plus(other: Money): Money {
    require(currency == other.currency) { "Currency mismatch" }
    return copy(amount = amount + other.amount)
  }

  companion object {
    fun of(amount: String, currency: String) =
      Money(BigDecimal(amount), Currency.getInstance(currency))
  }
}
```

---

## Coroutines

### Structured concurrency

```kotlin
// Parallel execution — both run concurrently, both must succeed
suspend fun loadDashboard(userId: UserId): Dashboard =
  coroutineScope {
    val user = async { userRepo.findById(userId) }
    val stats = async { statsRepo.getForUser(userId) }
    Dashboard(user.await()!!, stats.await())
  }

// Sequential with timeout
suspend fun fetchWithTimeout(): Data = withTimeout(5000) {
  apiClient.fetch()
}
```

### Flow for reactive data streams

```kotlin
// Producer
fun liveUpdates(id: String): Flow<Update> = flow {
  while (true) {
    emit(repo.getLatest(id))
    delay(5000)
  }
}.flowOn(Dispatchers.IO)

// Consumer with operators
viewModelScope.launch {
  liveUpdates(itemId)
    .filter { it.isRelevant }
    .map { it.toUiModel() }
    .catch { e -> _error.emit(e.message) }
    .collect { update -> _state.emit(update) }
}
```

### Dispatchers

```kotlin
// CPU-intensive work
withContext(Dispatchers.Default) { heavyComputation() }

// I/O (DB, network, file)
withContext(Dispatchers.IO) { database.query() }

// Main thread (UI)
withContext(Dispatchers.Main) { updateUi() }
```

---

## Extension Functions

```kotlin
// String utilities
fun String.toSlug(): String =
  lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')

fun String.truncate(maxLength: Int, suffix: String = "..."): String =
  if (length <= maxLength) this
  else take(maxLength - suffix.length) + suffix

// Collection utilities
fun <T> List<T>.second(): T = this[1]
fun <K, V> Map<K, V>.getOrThrow(key: K): V =
  get(key) ?: error("Key not found: $key")
```

---

## Kotlin DSL Builder Pattern

```kotlin
// The DSL
fun emailMessage(block: EmailBuilder.() -> Unit): EmailMessage =
  EmailBuilder().apply(block).build()

@EmailDsl
class EmailBuilder {
  var from: String = ""
  var to: MutableList<String> = mutableListOf()
  var subject: String = ""
  private var body: String = ""

  fun to(address: String) { to.add(address) }
  fun body(content: String) { body = content }

  internal fun build() = EmailMessage(from, to.toList(), subject, body)
}

@DslMarker
annotation class EmailDsl

// Usage
val message = emailMessage {
  from = "sender@example.com"
  to("recipient@example.com")
  subject = "Hello"
  body("Hi there!")
}
```

---

## Functional Patterns

```kotlin
// fold for aggregation
val total = orders.fold(Money.ZERO) { acc, order -> acc + order.total }

// partition
val (active, inactive) = users.partition { it.isActive }

// groupBy + mapValues
val byDepartment: Map<Department, List<Employee>> =
  employees.groupBy { it.department }

// flatMap for monad chaining
fun findUserOrders(userId: UserId): List<Order> =
  userRepo.findById(userId)
    ?.let { orderRepo.findByUser(it) }
    ?: emptyList()
```

---

## Checklist

- [ ] `val` used instead of `var` wherever possible
- [ ] No `!!` — null safety handled with `?.`, `?:`, `let`, `requireNotNull`
- [ ] Value classes for typed primitives (IDs, emails, amounts)
- [ ] Sealed classes for exhaustive state modeling
- [ ] Data classes for value objects (with `copy` for updates)
- [ ] Coroutines use `coroutineScope` for structured concurrency
- [ ] `CancellationException` not swallowed
- [ ] Extension functions in `<Type>Extensions.kt` files
- [ ] No raw String for SQL — parameterized queries only
