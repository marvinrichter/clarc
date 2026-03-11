---
name: android-patterns-advanced
description: Advanced Android/Jetpack Compose patterns — Compose performance optimization (@Stable/@Immutable, derivedStateOf, key in LazyColumn, lambda capture hoisting), Coroutines with injectable dispatchers, and reference rules/skills.
---

# Android Patterns — Advanced

This skill extends `android-patterns` with performance optimization and reference guide. Load `android-patterns` first.

## When to Activate

- Debugging unnecessary recomposition in Compose
- Optimizing LazyColumn with large data sets
- Implementing offline-first Repository with injectable dispatchers
- Auditing Compose code for lambda capture issues

---

## Kotlin Coroutines in Android

```kotlin
// Repository: bridge between data sources
class ProductRepositoryImpl @Inject constructor(
    private val api: ProductApi,
    private val dao: ProductDao,
    private val dispatchers: CoroutineDispatchers,
) : ProductRepository {

    override fun getProduct(id: String): Flow<Result<Product>> = flow {
        // Emit cached data first (offline-first)
        dao.getById(id)?.let { emit(Result.success(it.toDomain())) }

        // Fetch fresh data
        val result = runCatching { api.getProduct(id) }
        result.onSuccess { dto ->
            dao.upsert(dto.toEntity())
            emit(Result.success(dto.toDomain()))
        }.onFailure { error ->
            emit(Result.failure(error))
        }
    }.flowOn(dispatchers.io)
}

// Dispatcher injection (testable)
interface CoroutineDispatchers {
    val main: CoroutineDispatcher
    val io: CoroutineDispatcher
    val default: CoroutineDispatcher
}

class DefaultDispatchers @Inject constructor() : CoroutineDispatchers {
    override val main = Dispatchers.Main
    override val io = Dispatchers.IO
    override val default = Dispatchers.Default
}

// In tests: inject TestDispatchers
class TestDispatchers(testDispatcher: TestCoroutineDispatcher) : CoroutineDispatchers {
    override val main = testDispatcher
    override val io = testDispatcher
    override val default = testDispatcher
}
```

---

## Compose Performance

```kotlin
// 1. Use stable types to avoid unnecessary recomposition
@Stable // or @Immutable for deeply immutable types
data class ProductUiModel(
    val id: String,
    val name: String,
    val price: String, // formatted string, not Double
)

// 2. Keys in LazyColumn prevent unnecessary re-compositions on list changes
LazyColumn {
    items(products, key = { it.id }) { product ->
        ProductItem(product = product)
    }
}

// 3. derivedStateOf for expensive computed state
val isScrolledPastThreshold by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 5 }
}

// 4. Avoid unnecessary lambda captures — hoist callbacks
// WRONG: new lambda created on every recomposition
LazyColumn {
    items(products) { product ->
        ProductItem(
            product = product,
            onClick = { viewModel.onProductClick(product.id) }, // new lambda each time!
        )
    }
}

// CORRECT: stable reference
LazyColumn {
    items(products, key = { it.id }) { product ->
        ProductItem(
            product = product,
            onClick = viewModel::onProductClick, // stable method reference
        )
    }
}
```

---

## Reference Rules and Skills

- `rules/android/coding-style.md` — Compose file conventions, StateFlow, no Android imports in ViewModels
- `rules/android/testing.md` — Compose testTags, Turbine, Paparazzi
- `rules/android/patterns.md` — UDF, Repository Pattern, modularization thresholds
- Skill: `android-testing` — Compose UI testing, ViewModel testing, screenshot tests
- Skill: `kotlin-patterns` — Sealed classes, coroutines, Flow, extension functions
