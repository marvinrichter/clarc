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

## Anti-Patterns

### Using !! (Not-Null Assertion) Instead of Safe Null Handling

**Wrong:**
```kotlin
val name = user!!.profile!!.displayName!! // NullPointerException at runtime with no context
```

**Correct:**
```kotlin
val name = user?.profile?.displayName ?: "Anonymous"
// Or, when null is a programming error:
val name = requireNotNull(user?.profile?.displayName) { "displayName must not be null for registered users" }
```

**Why:** `!!` throws an opaque `NullPointerException`; safe calls with `?:` or `requireNotNull` provide explicit fallbacks and meaningful error messages.

### Using var and Mutable Data Classes Instead of copy()

**Wrong:**
```kotlin
data class Order(var status: OrderStatus, var total: Money)

fun confirm(order: Order): Order {
    order.status = OrderStatus.CONFIRMED // Mutates the original — hidden side effect
    return order
}
```

**Correct:**
```kotlin
data class Order(val status: OrderStatus, val total: Money)

fun confirm(order: Order): Order =
    order.copy(status = OrderStatus.CONFIRMED) // Returns a new instance
```

**Why:** Mutating data class fields in-place creates hidden side effects that are invisible at the call site; `copy()` makes state transitions explicit and safe to share.

### Using Sealed Class with else Branch in when

**Wrong:**
```kotlin
fun handleAuth(result: AuthResult) = when (result) {
    is AuthResult.Success -> redirect("/dashboard")
    else -> showError() // New subtypes silently fall through to this branch
}
```

**Correct:**
```kotlin
fun handleAuth(result: AuthResult) = when (result) {
    is AuthResult.Success -> redirect("/dashboard")
    is AuthResult.InvalidCredentials -> showRetryForm(result.attemptsRemaining)
    AuthResult.AccountLocked -> showLockedPage()
    is AuthResult.Error -> showError(result.cause)
    // No else — compiler enforces exhaustiveness
}
```

**Why:** An `else` branch defeats the exhaustiveness check that sealed classes provide; adding a new subtype compiles silently but takes the wrong code path at runtime.

### Launching Coroutines Without Structured Concurrency

**Wrong:**
```kotlin
fun loadDashboard(userId: UserId) {
    GlobalScope.launch { // Unstructured — leaks if caller is cancelled
        val user = userRepo.findById(userId)
        _state.value = UiState.Success(user)
    }
}
```

**Correct:**
```kotlin
fun loadDashboard(userId: UserId) {
    viewModelScope.launch { // Tied to ViewModel lifecycle — cancelled automatically
        val user = userRepo.findById(userId)
        _state.value = UiState.Success(user)
    }
}
```

**Why:** `GlobalScope` coroutines are not tied to any lifecycle and continue running even after the owning component is destroyed, causing memory leaks and stale state updates.

### Using Raw String Primitives for Domain Identifiers

**Wrong:**
```kotlin
fun findUser(id: String): User?      // id could be an email, a UUID, or anything else
fun sendWelcome(email: String): Unit // Nothing stops passing an id as the email
```

**Correct:**
```kotlin
@JvmInline value class UserId(val value: String)
@JvmInline value class Email(val value: String) {
    init { require(value.contains('@')) { "Invalid email: $value" } }
}

fun findUser(id: UserId): User?
fun sendWelcome(to: Email): Unit
```

**Why:** Raw `String` parameters allow callers to accidentally pass the wrong kind of string; value classes are erased at runtime (no boxing overhead) and make type errors compile-time failures.

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
